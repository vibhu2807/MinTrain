import { NextResponse } from "next/server";

import { buildSchedulerPayload } from "@/lib/engine";
import { getResolvedHouseholdProfiles, getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  if (session == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const household = await getResolvedHouseholdProfiles();
  return NextResponse.json({ ok: true, payload: buildSchedulerPayload(household) });
}
