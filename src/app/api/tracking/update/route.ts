import { NextResponse } from "next/server";

import { saveFoodTracking } from "@/lib/household-store";
import { getSession } from "@/lib/session";
import { MealChoiceKey } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (session == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    mealSelections?: Record<string, MealChoiceKey | null>;
    proteinAdds?: Record<string, number>;
    hydrationAdds?: Record<string, number>;
  } | null;

  if (body == null) {
    return NextResponse.json({ error: "Tracking payload is required." }, { status: 400 });
  }

  const tracking = await saveFoodTracking(session.memberId, {
    mealSelections: body.mealSelections,
    proteinAdds: body.proteinAdds,
    hydrationAdds: body.hydrationAdds,
  });

  return NextResponse.json({ ok: true, tracking });
}
