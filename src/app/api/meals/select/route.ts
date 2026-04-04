import { NextResponse } from "next/server";

import { getAllProfiles, saveDinnerSelection } from "@/lib/household-store";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { recipeId?: string } | null;
  if (!body?.recipeId) return NextResponse.json({ error: "Recipe id is required." }, { status: 400 });

  const profiles = await getAllProfiles();
  const selection = await saveDinnerSelection(body.recipeId, profiles);
  return NextResponse.json({ ok: true, selection });
}
