import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth";
import { requireSameOrigin } from "@/lib/api-auth";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);

  return NextResponse.json({ ok: true });
}
