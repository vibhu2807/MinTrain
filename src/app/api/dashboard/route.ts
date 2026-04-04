import { NextResponse } from "next/server";

import { buildDashboardBundleFromHousehold } from "@/lib/engine";
import { getHouseholdState, resolveDinnerSelection } from "@/lib/household-store";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (session == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const household = await getHouseholdState();
  return NextResponse.json(
    buildDashboardBundleFromHousehold(
      session.memberId,
      household.profiles,
      resolveDinnerSelection(household.profiles, household.kitchen),
      household.tracking[session.memberId],
    ),
  );
}
