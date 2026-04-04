import { redirect } from "next/navigation";

import { MintrainDashboard } from "@/components/mintrain-dashboard";
import { buildDashboardBundleFromHousehold } from "@/lib/engine";
import { ensureProfile, getAllProfiles, getKitchenState, getTracking, resolveDinnerSelection } from "@/lib/household-store";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await ensureProfile(session.memberId);
  if (!profile.onboardingComplete) redirect("/onboarding");

  const profiles = await getAllProfiles();
  const kitchen = await getKitchenState();
  const dinner = resolveDinnerSelection(profiles, kitchen);
  const tracking = await getTracking(session.memberId);

  return (
    <div className="phone-frame">
      <MintrainDashboard
        initialData={buildDashboardBundleFromHousehold(session.memberId, profiles, dinner, tracking)}
      />
    </div>
  );
}
