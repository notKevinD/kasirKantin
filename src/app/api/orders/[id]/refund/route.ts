import { NextResponse } from "next/server";
import { getApiSession, requireApiUser, requireSameOrigin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireApiUser(["owner", "admin"]);
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const session = await getApiSession();
  const { id } = await context.params;
  const body = await request.json();
  const amount = Math.max(Number(body.amount || 0), 0);
  const reason = String(body.reason || "").trim();

  if (!reason) {
    return NextResponse.json(
      { message: "Alasan refund wajib diisi." },
      { status: 400 },
    );
  }

  if (amount <= 0) {
    return NextResponse.json(
      { message: "Nominal refund harus lebih dari 0." },
      { status: 400 },
    );
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const before = await tx.order.findUnique({
        where: { id },
        include: { items: true, refunds: true },
      });

      if (!before) throw new Error("ORDER_NOT_FOUND");
      if (before.status !== "paid") throw new Error("ORDER_NOT_PAID");

      const nextRefundAmount = before.refundAmount + amount;
      if (nextRefundAmount > before.total) throw new Error("REFUND_TOO_HIGH");

      await tx.refund.create({
        data: {
          orderId: id,
          amount,
          reason,
          userId: session?.userId,
          username: session?.username,
        },
      });

      const status =
        nextRefundAmount >= before.total ? "refunded" : "partially_refunded";

      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status,
          refundAmount: nextRefundAmount,
          refundReason: reason,
        },
        include: { items: true, refunds: true },
      });

      await tx.auditLog.create({
        data: {
          userId: session?.userId,
          username: session?.username,
          action: "order.refund",
          entityType: "Order",
          entityId: id,
          metadata: {
            beforeStatus: before.status,
            afterStatus: updatedOrder.status,
            orderNumber: updatedOrder.orderNumber,
            amount,
            reason,
            totalRefund: updatedOrder.refundAmount,
          },
        },
      });

      return updatedOrder;
    });

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      return NextResponse.json(
        { message: "Transaksi tidak ditemukan." },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "ORDER_NOT_PAID") {
      return NextResponse.json(
        { message: "Refund hanya untuk transaksi yang sudah lunas." },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "REFUND_TOO_HIGH") {
      return NextResponse.json(
        { message: "Nominal refund melebihi total transaksi." },
        { status: 400 },
      );
    }

    throw error;
  }
}
