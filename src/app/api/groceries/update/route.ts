import { NextResponse } from "next/server";

import { saveGroceries } from "@/lib/household-store";
import { getSession } from "@/lib/session";
import { GroceryItem } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (session == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { groceries?: GroceryItem[] } | null;
  if (body?.groceries == null) {
    return NextResponse.json({ error: "Groceries payload is required." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, groceries: await saveGroceries(body.groceries) });
}
