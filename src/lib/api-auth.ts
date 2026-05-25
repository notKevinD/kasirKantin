import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionToken, sessionCookieName } from "@/lib/auth";

type ApiSession = {
  userId: string;
  username: string;
  role: string;
};

export async function getApiSession() {
  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(sessionCookieName)?.value);

  return session as ApiSession | null;
}

export async function requireApiUser(allowedRoles?: string[]) {
  const session = await getApiSession();

  if (!session) {
    return NextResponse.json(
      { message: "Silakan login terlebih dahulu." },
      { status: 401 },
    );
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.json(
      { message: "Akses tidak diizinkan." },
      { status: 403 },
    );
  }

  return null;
}

export function requireSameOrigin(request: Request) {
  const method = request.method.toUpperCase();

  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return NextResponse.json({ message: "Origin request tidak valid." }, { status: 403 });
  }

  try {
    const originHost = new URL(origin).host;

    if (originHost !== host) {
      return NextResponse.json(
        { message: "Request ditolak karena origin berbeda." },
        { status: 403 },
      );
    }
  } catch {
    return NextResponse.json({ message: "Origin request tidak valid." }, { status: 403 });
  }

  return null;
}
