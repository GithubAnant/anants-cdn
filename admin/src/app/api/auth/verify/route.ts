import { NextResponse } from "next/server";
import { createSession, getSessionCookieOptions, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  if (!body.password || !verifyPassword(body.password)) {
    return NextResponse.json({ error: "Wrong password. Try again." }, { status: 401 });
  }
  const token = createSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieOptions(token));
  return response;
}
