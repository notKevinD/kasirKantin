import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireApiUser();
  if (authError) return authError;

  const { id } = await context.params;
  const body = await request.json();

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: body.name === undefined ? undefined : String(body.name),
      category: body.category === undefined ? undefined : String(body.category),
      price: body.price === undefined ? undefined : Number(body.price),
      imageUrl: body.imageUrl === undefined ? undefined : body.imageUrl || null,
      description:
        body.description === undefined ? undefined : body.description || null,
      isAvailable:
        body.isAvailable === undefined ? undefined : Boolean(body.isAvailable),
      sortOrder:
        body.sortOrder === undefined ? undefined : Number(body.sortOrder),
    },
  });

  return NextResponse.json(product);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireApiUser();
  if (authError) return authError;

  const { id } = await context.params;

  await prisma.orderItem.updateMany({
    where: { productId: id },
    data: { productId: null },
  });

  await prisma.product.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
