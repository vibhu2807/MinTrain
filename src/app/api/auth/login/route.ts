import { NextResponse } from "next/server";

import { attachSession, verifyCredentials } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  if (!body?.username || !body.password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const member = verifyCredentials(body.username, body.password);
  if (!member) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, memberId: member.id });
  attachSession(response, member.id);
  return response;
}
