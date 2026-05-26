import { NextResponse } from "next/server";
import { getApiSession, requireApiUser, requireSameOrigin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type OrderItemInput = {
  productId?: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  note?: string;
};

function normalizeItems(items: OrderItemInput[]) {
  return items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    return {
      productId: item.productId || null,
      productName: String(item.productName),
      unitPrice,
      quantity,
      note: item.note ? String(item.note) : null,
      subtotal: unitPrice * quantity,
    };
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireApiUser();
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const session = await getApiSession();

  const { id } = await context.params;
  const body = await request.json();
  const items = Array.isArray(body.items) ? (body.items as OrderItemInput[]) : [];

  if (items.length === 0) {
    return NextResponse.json(
      { message: "Keranjang masih kosong." },
      { status: 400 },
    );
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const before = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!before) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (
        before.status !== "in_progress" &&
        session?.role !== "owner" &&
        session?.role !== "admin"
      ) {
        throw new Error("ORDER_FORBIDDEN");
      }

      const normalizedItems = normalizeItems(items);
      const total = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const nextStatus = body.status === "in_progress" ? "in_progress" : "paid";
      const cashReceived =
        nextStatus === "in_progress" ||
        body.cashReceived === null ||
        body.cashReceived === undefined
          ? null
          : Number(body.cashReceived);

      await tx.orderItem.deleteMany({ where: { orderId: id } });

      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          orderType: String(body.orderType || "Dine in"),
          status: nextStatus,
          paymentMethod:
            nextStatus === "in_progress"
              ? "Belum bayar"
              : String(body.paymentMethod || "Tunai"),
          total,
          cashReceived,
          changeAmount:
            cashReceived === null ? null : Math.max(cashReceived - total, 0),
          note: body.note ? String(body.note) : null,
          items: {
            create: normalizedItems,
          },
        },
        include: { items: true },
      });

      await tx.auditLog.create({
        data: {
          userId: session?.userId,
          username: session?.username,
          action: "order.update",
          entityType: "Order",
          entityId: id,
          metadata: {
            beforeTotal: before?.total,
            afterTotal: updatedOrder.total,
            orderNumber: updatedOrder.orderNumber,
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

    if (error instanceof Error && error.message === "ORDER_FORBIDDEN") {
      return NextResponse.json(
        { message: "Hanya admin/owner yang bisa mengubah transaksi selesai." },
        { status: 403 },
      );
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireApiUser(["owner", "admin"]);
  if (authError) return authError;
  const originError = requireSameOrigin(_request);
  if (originError) return originError;
  const session = await getApiSession();

  const { id } = await context.params;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id },
      data: { status: "cancelled" },
    });

    await tx.auditLog.create({
      data: {
        userId: session?.userId,
        username: session?.username,
        action: "order.cancel",
        entityType: "Order",
        entityId: id,
        metadata: {
          orderNumber: order.orderNumber,
          total: order.total,
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
