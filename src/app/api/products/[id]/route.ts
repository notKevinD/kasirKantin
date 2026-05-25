import { unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

async function deleteUploadFile(imageUrl: string | null) {
  if (!imageUrl?.startsWith("/uploads/") && !imageUrl?.startsWith("/api/uploads/")) {
    return;
  }

  const fileName = path.basename(imageUrl);
  const filePath = path.join(process.cwd(), "public", "uploads", fileName);

  try {
    await unlink(filePath);
  } catch {
    // File may already be missing; the database delete should still succeed.
  }
}

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
      categoryId:
        body.categoryId === undefined ? undefined : String(body.categoryId),
      price: body.price === undefined ? undefined : Number(body.price),
      imageUrl: body.imageUrl === undefined ? undefined : body.imageUrl || null,
      description:
        body.description === undefined ? undefined : body.description || null,
      isAvailable:
        body.isAvailable === undefined ? undefined : Boolean(body.isAvailable),
      sortOrder:
        body.sortOrder === undefined ? undefined : Number(body.sortOrder),
    },
    include: { category: true },
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
  const product = await prisma.product.findUnique({ where: { id } });

  await prisma.orderItem.updateMany({
    where: { productId: id },
    data: { productId: null },
  });

  await prisma.product.delete({
    where: { id },
  });

  await deleteUploadFile(product?.imageUrl ?? null);

  return NextResponse.json({ ok: true });
}
