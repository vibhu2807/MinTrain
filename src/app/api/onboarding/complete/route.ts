import { NextResponse } from "next/server";

import { regenerateWithAI } from "@/lib/engine";
import { getHouseholdState, resolveDinnerSelection, saveProfile } from "@/lib/household-store";
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
  const profile = mergeProfilePatch(baseProfile, body, { markOnboardingComplete: true });
  const nextHousehold = await saveProfile(profile);

  const regenerated = await regenerateWithAI(
    profile,
    nextHousehold.profiles,
    resolveDinnerSelection(nextHousehold.profiles, nextHousehold.kitchen),
  );

  return NextResponse.json({ ok: true, ...regenerated });
}
