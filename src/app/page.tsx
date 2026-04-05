import { redirect } from "next/navigation";

import { MintrainDashboard } from "@/components/mintrain-dashboard";
import { buildDashboardBundleFromHousehold } from "@/lib/engine";
import { ensureProfile, getAllProfiles, getKitchenState, getSavedPlan, getTracking, resolveDinnerSelection } from "@/lib/household-store";
import { getSession } from "@/lib/session";
import { DailyCoachSummary, DailyMealSlot, MealCandidate, WorkoutPlan } from "@/lib/types";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await ensureProfile(session.memberId);
  if (!profile.onboardingComplete) redirect("/onboarding");

  const profiles = await getAllProfiles();
  const kitchen = await getKitchenState();
  const dinner = resolveDinnerSelection(profiles, kitchen);
  const tracking = await getTracking(session.memberId);

  const bundle = buildDashboardBundleFromHousehold(session.memberId, profiles, dinner, tracking);

  // Override with saved AI plan if available
  const savedPlan = await getSavedPlan(session.memberId);
  if (savedPlan) {
    if (savedPlan.workoutPlan) bundle.workoutPlan = savedPlan.workoutPlan as WorkoutPlan;
    if (savedPlan.mealSlots) bundle.nutrition.mealSlots = savedPlan.mealSlots as DailyMealSlot[];
    if (savedPlan.summary) {
      const s = savedPlan.summary as DailyCoachSummary & { dinnerCandidates?: MealCandidate[] };
      bundle.summary = { greeting: s.greeting, headline: s.headline, nextBestAction: s.nextBestAction, beginnerReminder: s.beginnerReminder };
    }
    if (savedPlan.dinnerCandidates && Array.isArray(savedPlan.dinnerCandidates) && (savedPlan.dinnerCandidates as unknown[]).length > 0) {
      bundle.kitchenCandidates = savedPlan.dinnerCandidates as MealCandidate[];
    }
  }

  return (
    <div className="phone-frame">
      <MintrainDashboard initialData={bundle} />
    </div>
  );
}
