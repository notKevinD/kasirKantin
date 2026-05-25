import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getApiSession, requireApiUser, requireSameOrigin } from "@/lib/api-auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["owner", "admin", "cashier"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authError = await requireApiUser(["owner", "admin"]);
  if (authError) return authError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const session = await getApiSession();
  const { id } = await context.params;
  const body = await request.json();

  const target = await prisma.user.findUnique({ where: { id } });

  if (!target) {
    return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
  }

  if (target.role === "owner" && session?.role !== "owner") {
    return NextResponse.json(
      { message: "Hanya owner yang bisa mengubah user owner." },
      { status: 403 },
    );
  }

  const nextRole = body.role === undefined ? undefined : String(body.role);

  if (nextRole && !allowedRoles.includes(nextRole)) {
    return NextResponse.json({ message: "Role tidak valid." }, { status: 400 });
  }

  const ownerCount =
    nextRole === "owner" ? await prisma.user.count({ where: { role: "owner" } }) : 0;

  if (nextRole === "owner" && session?.role !== "owner" && ownerCount > 0) {
    return NextResponse.json(
      { message: "Hanya owner yang bisa memberi role owner." },
      { status: 403 },
    );
  }

  const password = body.password === undefined ? undefined : String(body.password);

  if (password !== undefined && password.length < 8) {
    return NextResponse.json(
      { message: "Password minimal 8 karakter." },
      { status: 400 },
    );
  }

  if (target.id === session?.userId && body.isActive === false) {
    return NextResponse.json(
      { message: "User yang sedang login tidak bisa menonaktifkan akunnya sendiri." },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: body.name === undefined ? undefined : String(body.name).trim(),
        username:
          body.username === undefined ? undefined : String(body.username).trim(),
        role: nextRole,
        isActive:
          body.isActive === undefined ? undefined : Boolean(body.isActive),
        passwordHash: password === undefined ? undefined : hashPassword(password),
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
        action: "user.update",
        entityType: "User",
        entityId: user.id,
        metadata: { username: user.username, role: user.role, isActive: user.isActive },
      },
    });

    return NextResponse.json(user);
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
