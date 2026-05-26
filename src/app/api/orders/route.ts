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
  const discount = Math.max(Number(body.discount || 0), 0);
  const total = Math.max(subtotal - discount, 0);
  const status = body.status === "in_progress" ? "in_progress" : "paid";
  const cashReceived =
    status === "in_progress" ||
    body.cashReceived === null ||
    body.cashReceived === undefined
      ? null
      : Number(body.cashReceived);

  const order = await prisma.order.create({
    data: {
      orderNumber: makeOrderNumber(),
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
      discount,
      cashReceived,
      changeAmount: cashReceived === null ? null : Math.max(cashReceived - total, 0),
      note: body.note ? String(body.note) : null,
      items: {
        create: normalizedItems,
      },
    },
    include: { items: true },
  });

  return NextResponse.json(order, { status: 201 });
}
