import { NextResponse } from "next/server";

import { regenerateWithAI } from "@/lib/engine";
import { getHouseholdState, resolveDinnerSelection } from "@/lib/household-store";
import { mergeProfilePatch, type UserProfileInput } from "@/lib/profile-normalizer";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (session == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const household = await getHouseholdState();
  const baseProfile = household.profiles[session.memberId];
  const body = (await request.json().catch(() => null)) as UserProfileInput | null;
  const profile = mergeProfilePatch(baseProfile, body);
  const nextHousehold = {
    ...household.profiles,
    [session.memberId]: profile,
  };

  const regenerated = await regenerateWithAI(
    profile,
    nextHousehold,
    resolveDinnerSelection(nextHousehold, household.kitchen),
  );

  return NextResponse.json({ ok: true, ...regenerated });
}
