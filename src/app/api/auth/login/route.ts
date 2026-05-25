import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieName } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/api-auth";
import {
  clearFailedLogin,
  getLoginRateLimitKey,
  isLoginRateLimited,
  recordFailedLogin,
} from "@/lib/login-rate-limit";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await request.json();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    return NextResponse.json(
      { message: "Username dan password wajib diisi." },
      { status: 400 },
    );
  }

  const rateLimitKey = getLoginRateLimitKey(request, username);

  if (isLoginRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { message: "Terlalu banyak percobaan login. Coba lagi beberapa menit." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    recordFailedLogin(rateLimitKey);
    return NextResponse.json(
      { message: "Username atau password salah." },
      { status: 401 },
    );
  }

  clearFailedLogin(rateLimitKey);

  const token = createSessionToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true });
}
