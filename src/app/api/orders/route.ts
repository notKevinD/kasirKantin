import { NextResponse } from "next/server";
import { getApiSession, requireApiUser, requireSameOrigin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type OrderItemInput = {
  productId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  note?: string;
};

function makeOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = String(now.getTime()).slice(-5);
  return `TRX-${date}-${time}`;
}

function getOrderDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function calculateDiscount(subtotal: number, body: Record<string, unknown>) {
  const discountType = body.discountType === "percent" ? "percent" : "amount";
  const discountValue = Math.max(Number(body.discountValue ?? body.discount ?? 0), 0);
  const rawDiscount =
    discountType === "percent"
      ? Math.round((subtotal * Math.min(discountValue, 100)) / 100)
      : discountValue;

  return {
    discountType,
    discountValue,
    discount: Math.min(rawDiscount, subtotal),
    discountReason: body.discountReason
      ? String(body.discountReason).trim()
      : null,
  };
}

export async function GET() {
  const authError = await requireApiUser();
  if (authError) return authError;

  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const authError = await requireApiUser();
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const session = await getApiSession();

  const body = await request.json();
  const items = Array.isArray(body.items) ? (body.items as OrderItemInput[]) : [];
  const cashier = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true },
      })
    : null;

  if (items.length === 0) {
    return NextResponse.json(
      { message: "Keranjang masih kosong." },
      { status: 400 },
    );
  }

  const normalizedItems = items.map((item) => {
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

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const {
    discountType,
    discountValue,
    discount,
    discountReason,
  } = calculateDiscount(subtotal, body);
  const total = Math.max(subtotal - discount, 0);
  const status = body.status === "in_progress" ? "in_progress" : "paid";
  const cashReceived =
    status === "in_progress" ||
    body.cashReceived === null ||
    body.cashReceived === undefined
      ? null
      : Number(body.cashReceived);

  if (discount > 0 && !discountReason) {
    return NextResponse.json(
      { message: "Alasan diskon wajib diisi." },
      { status: 400 },
    );
  }

  const order = await prisma.$transaction(async (tx) => {
    const shift = await tx.cashierShift.findFirst({
      where: { status: "open" },
      orderBy: { openedAt: "desc" },
    });

    if (!shift) {
      throw new Error("SHIFT_REQUIRED");
    }

    const orderDate = getOrderDateKey();
    const lastOrder = await tx.order.findFirst({
      where: { orderDate },
      orderBy: { queueNumber: "desc" },
      select: { queueNumber: true },
    });
    const queueNumber = (lastOrder?.queueNumber ?? 0) + 1;

    const createdOrder = await tx.order.create({
      data: {
        orderNumber: makeOrderNumber(),
        queueNumber,
        orderDate,
        orderType: String(body.orderType || "Dine in"),
        status,
        paymentMethod:
          status === "in_progress"
            ? "Belum bayar"
            : String(body.paymentMethod || "Tunai"),
        total,
        customerName: body.customerName ? String(body.customerName).trim() : null,
        tableNumber: body.tableNumber ? String(body.tableNumber).trim() : null,
        cashierId: session?.userId,
        cashierName: cashier?.name ?? session?.username,
        shiftId: shift.id,
        discount,
        discountType,
        discountValue,
        discountReason,
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
        action: "order.create",
        entityType: "Order",
        entityId: createdOrder.id,
        metadata: {
          orderNumber: createdOrder.orderNumber,
          queueNumber,
          status,
          paymentMethod: createdOrder.paymentMethod,
          total,
          discount,
          discountReason,
        },
      },
    });

    return createdOrder;
  }).catch((error) => {
    if (error instanceof Error && error.message === "SHIFT_REQUIRED") {
      return null;
    }

    throw error;
  });

  if (!order) {
    return NextResponse.json(
      { message: "Buka shift kasir dulu sebelum mencatat transaksi." },
      { status: 400 },
    );
  }

  return NextResponse.json(order, { status: 201 });
}
