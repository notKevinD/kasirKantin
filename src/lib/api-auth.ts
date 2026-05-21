import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionToken, sessionCookieName } from "@/lib/auth";

export async function requireApiUser() {
  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(sessionCookieName)?.value);

  if (!session) {
    return NextResponse.json(
      { message: "Silakan login terlebih dahulu." },
      { status: 401 },
    );
  }

  return null;
}
