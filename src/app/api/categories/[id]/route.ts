import { NextResponse } from "next/server";
import { getApiSession, requireApiUser, requireSameOrigin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireApiUser(["owner", "admin"]);
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const session = await getApiSession();
  const { id } = await context.params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    return NextResponse.json(
      { message: "Kategori tidak ditemukan." },
      { status: 404 },
    );
  }

  if (category._count.products > 0) {
    return NextResponse.json(
      {
        message:
          "Kategori masih dipakai menu. Pindahkan atau hapus menunya dulu.",
      },
      { status: 409 },
    );
  }

  await prisma.category.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session?.userId,
      username: session?.username,
      action: "category.delete",
      entityType: "Category",
      entityId: category.id,
      metadata: { name: category.name },
    },
  });

  return NextResponse.json({ ok: true });
}
