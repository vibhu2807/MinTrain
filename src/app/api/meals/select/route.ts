import { NextResponse } from "next/server";

import { saveDinnerSelection } from "@/lib/household-store";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (session == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { recipeId?: string } | null;
  if (body?.recipeId == null) {
    return NextResponse.json({ error: "Recipe id is required." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, selection: await saveDinnerSelection(body.recipeId) });
}
