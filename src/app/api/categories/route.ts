import { NextResponse } from "next/server";
import { requireApiUser, requireSameOrigin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authError = await requireApiUser();
  if (authError) return authError;

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const authError = await requireApiUser(["admin"]);
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await request.json();
  const name = String(body.name || "").trim();

  if (!name) {
    return NextResponse.json(
      { message: "Nama kategori wajib diisi." },
      { status: 400 },
    );
  }

  const existingCategory = await prisma.category.findUnique({
    where: { name },
  });

  if (existingCategory) {
    return NextResponse.json(
      { message: "Kategori sudah ada." },
      { status: 409 },
    );
  }

  const category = await prisma.category.create({
    data: {
      name,
      sortOrder: Number(body.sortOrder ?? 99),
    },
  });

  return NextResponse.json(category, { status: 201 });
}
