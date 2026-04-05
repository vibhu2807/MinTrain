import "server-only";

import { supabase } from "@/lib/supabase";
import { buildDinnerCandidates, mealSelectionFromId } from "@/lib/engine";
import {
  DailyTrackingState,
  DifficultySignal,
  GroceryItem,
  HouseholdMemberId,
  MealSelection,
  UserProfile,
} from "@/lib/types";

export type HouseholdProfileMap = Record<HouseholdMemberId, UserProfile>;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function emptyTrackingState(): DailyTrackingState {
  return {
    dateKey: todayKey(),
    updatedAt: new Date().toISOString(),
    mealSelections: {},
    proteinAdds: {},
    hydrationAdds: {},
    exerciseFeedback: {},
    loadHints: {},
  };
}

// ── Profiles ──

export function createBlankProfile(memberId: string): UserProfile {
  return {
    id: memberId,
    displayName: "",
    shortLabel: "",
    email: "",
    age: 25,
    sex: "male",
    heightCm: 170,
    weightKg: 70,
    goal: "build_muscle",
    targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    timelinePace: "steady",
    activityLevel: "moderate",
    experience: "new",
    confidenceLevel: 2,
    equipmentAccess: "gym",
    trainingDaysPerWeek: 4,
    preferredWorkoutTime: "18:00",
    wakeTime: "07:00",
    breakfastTime: "08:00",
    lunchTime: "13:00",
    snackTime: "17:00",
    dinnerTime: "21:00",
    sleepTime: "23:00",
    dietStyle: "vegetarian_dairy",
    limitations: [],
    likes: [],
    avoids: [],
    spiceComfort: "balanced",
    notes: "",
    onboardingComplete: false,
  };
}

export async function ensureProfile(memberId: string): Promise<UserProfile> {
  const { data } = await supabase
    .from("profiles")
    .select("data")
    .eq("member_id", memberId)
    .single();

  if (data?.data) return data.data as UserProfile;

  const blank = createBlankProfile(memberId);
  await supabase.from("profiles").upsert({ member_id: memberId, data: blank });
  return blank;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await supabase.from("profiles").upsert({
    member_id: profile.id,
    data: profile,
    updated_at: new Date().toISOString(),
  });
}

export async function getAllProfiles(): Promise<HouseholdProfileMap> {
  const { data } = await supabase.from("profiles").select("member_id, data");
  const map: HouseholdProfileMap = {};
  if (data) {
    for (const row of data) {
      map[row.member_id] = row.data as UserProfile;
    }
  }
  return map;
}

// ── Tracking ──

export async function getTracking(memberId: string): Promise<DailyTrackingState> {
  const key = todayKey();
  const { data } = await supabase
    .from("tracking")
    .select("data")
    .eq("member_id", memberId)
    .eq("date_key", key)
    .single();

  if (data?.data) return data.data as DailyTrackingState;
  return emptyTrackingState();
}

async function saveTracking(memberId: string, tracking: DailyTrackingState): Promise<void> {
  await supabase.from("tracking").upsert({
    member_id: memberId,
    date_key: todayKey(),
    data: { ...tracking, updatedAt: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  });
}

export async function saveWorkoutFeedback(
  memberId: string,
  exerciseId: string,
  signal: DifficultySignal,
  loadHint: string,
): Promise<DailyTrackingState> {
  const current = await getTracking(memberId);
  const next: DailyTrackingState = {
    ...current,
    exerciseFeedback: { ...current.exerciseFeedback, [exerciseId]: signal },
    loadHints: { ...current.loadHints, [exerciseId]: loadHint },
    updatedAt: new Date().toISOString(),
  };
  await saveTracking(memberId, next);
  return next;
}

// ── Kitchen (shared dinner) ──

export async function getKitchenState(): Promise<{ selectedMealId: string; selectedMealName: string; groceries: GroceryItem[] }> {
  const { data } = await supabase.from("kitchen").select("*").eq("id", 1).single();
  if (data) {
    return {
      selectedMealId: data.selected_meal_id ?? "",
      selectedMealName: data.selected_meal_name ?? "",
      groceries: (data.groceries as GroceryItem[]) ?? [],
    };
  }
  return { selectedMealId: "", selectedMealName: "", groceries: [] };
}

export async function saveDinnerSelection(recipeId: string, profiles: HouseholdProfileMap): Promise<MealSelection> {
  const candidates = buildDinnerCandidates(profiles);
  const selection = mealSelectionFromId(recipeId, candidates);

  await supabase.from("kitchen").upsert({
    id: 1,
    selected_meal_id: selection.selectedMealId,
    selected_meal_name: selection.selectedMealName,
    groceries: selection.groceries,
    updated_at: new Date().toISOString(),
  });

  return selection;
}

// ── Daily Plans (AI-generated, cached per day) ──

export async function getSavedPlan(memberId: string): Promise<{ workoutPlan: unknown; mealSlots: unknown; summary: unknown } | null> {
  const key = todayKey();
  const { data } = await supabase
    .from("daily_plans")
    .select("*")
    .eq("member_id", memberId)
    .eq("date_key", key)
    .single();

  if (!data?.workout_plan || !data?.meal_slots) return null;
  return { workoutPlan: data.workout_plan, mealSlots: data.meal_slots, summary: data.summary };
}

export async function saveDailyPlan(memberId: string, plan: { workoutPlan: unknown; mealSlots: unknown; summary: unknown }): Promise<void> {
  await supabase.from("daily_plans").upsert({
    member_id: memberId,
    date_key: todayKey(),
    workout_plan: plan.workoutPlan,
    meal_slots: plan.mealSlots,
    summary: plan.summary,
    updated_at: new Date().toISOString(),
  });
}

// ── Compatibility with existing code ──

export function resolveDinnerSelection(
  profiles: HouseholdProfileMap,
  kitchen: { selectedMealId: string; groceries: GroceryItem[] } | null,
): MealSelection {
  const candidates = buildDinnerCandidates(profiles);
  const fallbackId = candidates[0]?.recipe.id ?? "";
  const recipeId = kitchen?.selectedMealId || fallbackId;
  return mealSelectionFromId(recipeId, candidates);
}

export async function getHouseholdState() {
  const profiles = await getAllProfiles();
  const kitchen = await getKitchenState();
  const tracking: Record<string, DailyTrackingState> = {};

  for (const memberId of Object.keys(profiles)) {
    tracking[memberId] = await getTracking(memberId);
  }

  return { profiles, kitchen, tracking };
}
