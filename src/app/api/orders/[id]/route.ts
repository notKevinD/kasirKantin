import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
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

  const { id } = await context.params;
  const body = await request.json();
  const items = Array.isArray(body.items) ? (body.items as OrderItemInput[]) : [];

  if (items.length === 0) {
    return NextResponse.json(
      { message: "Keranjang masih kosong." },
      { status: 400 },
    );
  }

  const normalizedItems = normalizeItems(items);
  const total = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const cashReceived =
    body.cashReceived === null || body.cashReceived === undefined
      ? null
      : Number(body.cashReceived);

  await prisma.orderItem.deleteMany({ where: { orderId: id } });

  const order = await prisma.order.update({
    where: { id },
    data: {
      orderType: String(body.orderType || "Dine in"),
      paymentMethod: String(body.paymentMethod || "Tunai"),
      total,
      cashReceived,
      changeAmount: cashReceived === null ? null : Math.max(cashReceived - total, 0),
      note: body.note ? String(body.note) : null,
      items: {
        create: normalizedItems,
      },
    },
    include: { items: true },
  });

  return NextResponse.json(order);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireApiUser();
  if (authError) return authError;

  const { id } = await context.params;

  await prisma.order.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
