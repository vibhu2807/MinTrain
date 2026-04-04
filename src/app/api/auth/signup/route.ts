import { NextResponse } from "next/server";

import { attachSession } from "@/lib/session";
import { signup } from "@/lib/user-store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  if (!body?.username || !body.password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const result = await signup(body.username, body.password);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, memberId: result.memberId });
  attachSession(response, result.memberId);
  return response;
}
