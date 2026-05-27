import { NextResponse } from "next/server";
import { getApiSession, requireApiUser, requireSameOrigin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authError = await requireApiUser();
  if (authError) return authError;

  const currentShift = await prisma.cashierShift.findFirst({
    where: { status: "open" },
    orderBy: { openedAt: "desc" },
    include: { orders: { include: { items: true, refunds: true } } },
  });

  return NextResponse.json({
    currentShift,
    summary: currentShift ? summarizeShift(currentShift) : null,
  });
}

export async function POST(request: Request) {
  const authError = await requireApiUser();
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const session = await getApiSession();
  const body = await request.json();
  const openingCash = Math.max(Number(body.openingCash || 0), 0);
  const note = body.note ? String(body.note).trim() : null;

  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true },
      })
    : null;

  const existingShift = await prisma.cashierShift.findFirst({
    where: { status: "open" },
  });

  if (existingShift) {
    return NextResponse.json(
      { message: "Masih ada shift yang sedang berjalan." },
      { status: 400 },
    );
  }

  const shift = await prisma.$transaction(async (tx) => {
    const createdShift = await tx.cashierShift.create({
      data: {
        openedById: session?.userId,
        openedByName: user?.name ?? session?.username ?? "Kasir",
        openingCash,
        note,
      },
      include: { orders: { include: { items: true, refunds: true } } },
    });

    await tx.auditLog.create({
      data: {
        userId: session?.userId,
        username: session?.username,
        action: "shift.open",
        entityType: "CashierShift",
        entityId: createdShift.id,
        metadata: { openingCash, note },
      },
    });

    return createdShift;
  });

  return NextResponse.json({ currentShift: shift, summary: summarizeShift(shift) });
}

export async function PATCH(request: Request) {
  const authError = await requireApiUser();
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const session = await getApiSession();
  const body = await request.json();
  const shiftId = String(body.shiftId || "");
  const closingCash = Math.max(Number(body.closingCash || 0), 0);
  const note = body.note ? String(body.note).trim() : null;

  const shift = await prisma.cashierShift.findUnique({
    where: { id: shiftId },
    include: { orders: { include: { items: true, refunds: true } } },
  });

  if (!shift || shift.status !== "open") {
    return NextResponse.json(
      { message: "Shift aktif tidak ditemukan." },
      { status: 404 },
    );
  }

  const summary = summarizeShift(shift);
  const expectedCash = shift.openingCash + summary.cashSales - summary.cashRefund;
  const cashDifference = closingCash - expectedCash;

  const closedShift = await prisma.$transaction(async (tx) => {
    const updatedShift = await tx.cashierShift.update({
      where: { id: shiftId },
      data: {
        status: "closed",
        closingCash,
        expectedCash,
        cashDifference,
        note,
        closedAt: new Date(),
      },
      include: { orders: { include: { items: true, refunds: true } } },
    });

    await tx.auditLog.create({
      data: {
        userId: session?.userId,
        username: session?.username,
        action: "shift.close",
        entityType: "CashierShift",
        entityId: shiftId,
        metadata: { closingCash, expectedCash, cashDifference, summary, note },
      },
    });

    return updatedShift;
  });

  return NextResponse.json({
    currentShift: null,
    closedShift,
    summary: summarizeShift(closedShift),
  });
}

type ShiftWithOrders = NonNullable<
  Awaited<ReturnType<typeof prisma.cashierShift.findFirst>>
> & {
  orders: {
    status: string;
    paymentMethod: string;
    total: number;
    discount: number;
    refundAmount: number;
  }[];
};

function summarizeShift(shift: ShiftWithOrders) {
  const paidOrders = shift.orders.filter((order) => order.status === "paid");
  const voidOrders = shift.orders.filter((order) => order.status === "cancelled");
  const refundedOrders = shift.orders.filter((order) => order.refundAmount > 0);
  const sumPayment = (method: string) =>
    paidOrders
      .filter((order) => order.paymentMethod === method)
      .reduce((sum, order) => sum + order.total, 0);

  return {
    orderCount: paidOrders.length,
    voidCount: voidOrders.length,
    refundCount: refundedOrders.length,
    sales: paidOrders.reduce((sum, order) => sum + order.total, 0),
    cashSales: sumPayment("Tunai"),
    qrisSales: sumPayment("QRIS manual"),
    transferSales: sumPayment("Transfer"),
    discountTotal: paidOrders.reduce((sum, order) => sum + order.discount, 0),
    cashRefund: refundedOrders
      .filter((order) => order.paymentMethod === "Tunai")
      .reduce((sum, order) => sum + order.refundAmount, 0),
    refundTotal: refundedOrders.reduce((sum, order) => sum + order.refundAmount, 0),
  };
}
