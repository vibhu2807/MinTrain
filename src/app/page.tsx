import { redirect } from "next/navigation";

import { MintrainDashboard } from "@/components/mintrain-dashboard";
import { buildDashboardBundleFromHousehold } from "@/lib/engine";
import { ensureProfile, getAllProfiles, getKitchenState, getSavedPlan, getTracking, resolveDinnerSelection } from "@/lib/household-store";
import { getSession } from "@/lib/session";
import { DailyCoachSummary, DailyMealSlot, WorkoutPlan } from "@/lib/types";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await ensureProfile(session.memberId);
  if (!profile.onboardingComplete) redirect("/onboarding");

  const profiles = await getAllProfiles();
  const kitchen = await getKitchenState();
  const dinner = resolveDinnerSelection(profiles, kitchen);
  const tracking = await getTracking(session.memberId);

  // Build the base bundle (rule-based)
  const bundle = buildDashboardBundleFromHousehold(session.memberId, profiles, dinner, tracking);

  // Override with saved AI plan if available for today
  const savedPlan = await getSavedPlan(session.memberId);
  if (savedPlan) {
    if (savedPlan.workoutPlan) bundle.workoutPlan = savedPlan.workoutPlan as WorkoutPlan;
    if (savedPlan.mealSlots) bundle.nutrition.mealSlots = savedPlan.mealSlots as DailyMealSlot[];
    if (savedPlan.summary) bundle.summary = savedPlan.summary as DailyCoachSummary;
  }

  return (
    <div className="phone-frame">
      <MintrainDashboard initialData={bundle} />
    </div>
  );
}
