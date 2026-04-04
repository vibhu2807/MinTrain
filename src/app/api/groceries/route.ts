import { NextResponse } from "next/server";

import { getHouseholdState, resolveDinnerSelection } from "@/lib/household-store";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (session == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const household = await getHouseholdState();
  const url = new URL(request.url);
  const recipeId = url.searchParams.get("recipeId");
  const groceries = recipeId
    ? resolveDinnerSelection(household.profiles, {
        selectedMealId: recipeId,
        groceries: [],
      }).groceries
    : resolveDinnerSelection(household.profiles, household.kitchen).groceries;

  return NextResponse.json({ ok: true, groceries });
}
