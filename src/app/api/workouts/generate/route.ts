import { NextResponse } from "next/server";

import { regenerateWithAI } from "@/lib/engine";
import { ensureProfile, getAllProfiles, getKitchenState, resolveDinnerSelection } from "@/lib/household-store";
import { mergeProfilePatch, type UserProfileInput } from "@/lib/profile-normalizer";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const baseProfile = await ensureProfile(session.memberId);
  const body = (await request.json().catch(() => null)) as UserProfileInput | null;
  const profile = mergeProfilePatch(baseProfile, body);

  const profiles = await getAllProfiles();
  profiles[session.memberId] = profile;
  const kitchen = await getKitchenState();
  const dinner = resolveDinnerSelection(profiles, kitchen);

  const regenerated = await regenerateWithAI(profile, profiles, dinner);
  return NextResponse.json({ ok: true, ...regenerated });
}
