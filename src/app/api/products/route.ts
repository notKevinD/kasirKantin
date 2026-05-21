import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authError = await requireApiUser();
  if (authError) return authError;

  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const authError = await requireApiUser();
  if (authError) return authError;

  const body = await request.json();

  if (!body.name || !body.categoryId || Number(body.price) <= 0) {
    return NextResponse.json(
      { message: "Nama, kategori, dan harga wajib diisi." },
      { status: 400 },
    );
  }

  const product = await prisma.product.create({
    data: {
      name: String(body.name),
      categoryId: String(body.categoryId),
      price: Number(body.price),
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      description: body.description ? String(body.description) : null,
      isAvailable: Boolean(body.isAvailable ?? true),
      sortOrder: Number(body.sortOrder ?? 99),
    },
    include: { category: true },
  });

  return NextResponse.json(product, { status: 201 });
}
