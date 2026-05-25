import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getApiSession, requireApiUser, requireSameOrigin } from "@/lib/api-auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["owner", "admin", "cashier"];

export async function GET() {
  const authError = await requireApiUser(["owner", "admin"]);
  if (authError) return authError;

  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const authError = await requireApiUser(["owner", "admin"]);
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const session = await getApiSession();
  const body = await request.json();
  const name = String(body.name || "").trim();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const role = String(body.role || "cashier");

  if (!name || !username || password.length < 8 || !allowedRoles.includes(role)) {
    return NextResponse.json(
      { message: "Nama, username, role, dan password minimal 8 karakter wajib valid." },
      { status: 400 },
    );
  }

  const ownerCount =
    role === "owner" ? await prisma.user.count({ where: { role: "owner" } }) : 0;

  if (role === "owner" && session?.role !== "owner" && ownerCount > 0) {
    return NextResponse.json(
      { message: "Hanya owner yang bisa membuat user owner." },
      { status: 403 },
    );
  }

  try {
    const user = await prisma.user.create({
      data: {
        name,
        username,
        role,
        passwordHash: hashPassword(password),
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session?.userId,
        username: session?.username,
        action: "user.create",
        entityType: "User",
        entityId: user.id,
        metadata: { username: user.username, role: user.role },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Username sudah dipakai." },
        { status: 409 },
      );
    }

    throw error;
  }
}
