import { redirect } from "next/navigation";

import { MintrainDashboard } from "@/components/mintrain-dashboard";
import { buildDashboardBundleFromHousehold } from "@/lib/engine";
import { getHouseholdState, resolveDinnerSelection } from "@/lib/household-store";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (session == null) {
    redirect("/login");
  }

  const household = await getHouseholdState();
  const profile = household.profiles[session.memberId];
  if (!profile.onboardingComplete) {
    redirect("/onboarding");
  }

  return (
    <div className="phone-frame">
      <MintrainDashboard
        initialData={buildDashboardBundleFromHousehold(
          session.memberId,
          household.profiles,
          resolveDinnerSelection(household.profiles, household.kitchen),
          household.tracking[session.memberId],
        )}
      />
    </div>
  );
}
