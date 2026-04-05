import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { recipeId?: string; recipeName?: string } | null;
  if (!body?.recipeId) return NextResponse.json({ error: "Recipe id is required." }, { status: 400 });

  // Save the selection directly — don't look up in hardcoded library
  const selection = {
    selectedMealId: body.recipeId,
    selectedMealName: body.recipeName ?? body.recipeId,
    serves: 3,
    groceries: [],
  };

  await supabase.from("kitchen").upsert({
    id: 1,
    selected_meal_id: selection.selectedMealId,
    selected_meal_name: selection.selectedMealName,
    groceries: [],
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, selection });
}
