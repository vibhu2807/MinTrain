import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// No hardcoded profiles — users sign up dynamically
import { buildDinnerCandidates, mealSelectionFromId } from "@/lib/engine";
import {
  DailyTrackingState,
  DifficultySignal,
  GroceryItem,
  HouseholdMemberId,
  MealChoiceKey,
  MealSelection,
  UserProfile,
} from "@/lib/types";

export type HouseholdProfileMap = Record<HouseholdMemberId, UserProfile>;

type StoredKitchenState = {
  selectedMealId: string;
  groceries: GroceryItem[];
  updatedAt: string;
};

type TrackingMap = Record<HouseholdMemberId, DailyTrackingState>;

export interface HouseholdState {
  version: 1;
  profiles: HouseholdProfileMap;
  kitchen: StoredKitchenState;
  trackingDate: string;
  tracking: TrackingMap;
}

export interface FoodTrackingInput {
  mealSelections?: Record<string, MealChoiceKey | null | undefined>;
  proteinAdds?: Record<string, number>;
  hydrationAdds?: Record<string, number>;
}

const runtimeDirectory = path.join(process.cwd(), "runtime");
const householdStorePath = path.join(runtimeDirectory, "household-store.json");
const appTimeZone = process.env.MINTRAIN_TIMEZONE ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

let mutationQueue: Promise<void> = Promise.resolve();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGroceryItem(value: unknown): value is GroceryItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.quantity === "string" &&
    typeof value.aisle === "string" &&
    typeof value.checked === "boolean"
  );
}

function getCurrentTrackingDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function emptyTrackingState(dateKey: string): DailyTrackingState {
  return {
    dateKey,
    updatedAt: new Date().toISOString(),
    mealSelections: {},
    proteinAdds: {},
    hydrationAdds: {},
    exerciseFeedback: {},
    loadHints: {},
  };
}

function emptyTrackingMap(dateKey: string, memberIds: string[] = []): TrackingMap {
  const map: TrackingMap = {};
  for (const id of memberIds) {
    map[id] = emptyTrackingState(dateKey);
  }
  return map;
}

function normalizeMealSelections(rawSelections: unknown) {
  if (!isRecord(rawSelections)) {
    return {};
  }

  const result: Record<string, MealChoiceKey> = {};
  for (const [key, value] of Object.entries(rawSelections)) {
    if (value === "primary" || value === "backup") {
      result[key] = value;
    }
  }

  return result;
}

function normalizeCountMap(rawMap: unknown) {
  if (!isRecord(rawMap)) {
    return {};
  }

  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(rawMap)) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      continue;
    }

    const normalized = Math.max(0, Math.floor(value));
    if (normalized > 0) {
      result[key] = normalized;
    }
  }

  return result;
}

function normalizeFeedbackMap(rawMap: unknown) {
  if (!isRecord(rawMap)) {
    return {};
  }

  const result: Record<string, DifficultySignal> = {};
  for (const [key, value] of Object.entries(rawMap)) {
    if (value === "too_easy" || value === "good_challenge" || value === "too_heavy") {
      result[key] = value;
    }
  }

  return result;
}

function normalizeStringMap(rawMap: unknown) {
  if (!isRecord(rawMap)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawMap)) {
    if (typeof value === "string" && value.trim().length > 0) {
      result[key] = value;
    }
  }

  return result;
}

function normalizeTrackingState(rawTracking: unknown, dateKey: string): DailyTrackingState {
  const source = isRecord(rawTracking) ? rawTracking : {};

  return {
    dateKey,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString(),
    mealSelections: normalizeMealSelections(source.mealSelections),
    proteinAdds: normalizeCountMap(source.proteinAdds),
    hydrationAdds: normalizeCountMap(source.hydrationAdds),
    exerciseFeedback: normalizeFeedbackMap(source.exerciseFeedback),
    loadHints: normalizeStringMap(source.loadHints),
  };
}

function normalizeTrackingMap(rawTracking: unknown, dateKey: string): TrackingMap {
  const source = isRecord(rawTracking) ? rawTracking : {};
  return {
    member_you: normalizeTrackingState(source.member_you, dateKey),
    member_brother: normalizeTrackingState(source.member_brother, dateKey),
    member_sister_in_law: normalizeTrackingState(source.member_sister_in_law, dateKey),
  };
}

function overlayCheckedGroceries(baseGroceries: GroceryItem[], savedGroceries: GroceryItem[]) {
  const checkedIds = new Set(savedGroceries.filter((item) => item.checked).map((item) => item.id));
  return baseGroceries.map((item) => ({
    ...item,
    checked: checkedIds.has(item.id),
  }));
}

export function resolveDinnerSelection(
  profiles: HouseholdProfileMap,
  kitchen: Pick<StoredKitchenState, "selectedMealId" | "groceries"> | null | undefined,
): MealSelection {
  const candidates = buildDinnerCandidates(profiles);
  const fallbackRecipeId = candidates[0]?.recipe.id ?? "masala-paneer-bowls";
  const recipeId = kitchen?.selectedMealId ?? fallbackRecipeId;
  const selection = mealSelectionFromId(recipeId, candidates);

  return {
    ...selection,
    groceries: overlayCheckedGroceries(selection.groceries, kitchen?.groceries ?? []),
  };
}

function normalizeProfiles(rawProfiles: unknown): HouseholdProfileMap {
  const source = isRecord(rawProfiles) ? rawProfiles : {};
  const result: HouseholdProfileMap = {};

  for (const [id, rawProfile] of Object.entries(source)) {
    if (isRecord(rawProfile) && typeof (rawProfile as Record<string, unknown>).id === "string") {
      result[id] = rawProfile as unknown as UserProfile;
    }
  }

  return result;
}

function normalizeKitchen(rawKitchen: unknown, profiles: HouseholdProfileMap): StoredKitchenState {
  const source = isRecord(rawKitchen) ? rawKitchen : {};
  const savedGroceries = Array.isArray(source.groceries) ? source.groceries.filter(isGroceryItem) : [];
  const selection = resolveDinnerSelection(profiles, {
    selectedMealId: typeof source.selectedMealId === "string" ? source.selectedMealId : "",
    groceries: savedGroceries,
  });

  return {
    selectedMealId: selection.selectedMealId,
    groceries: selection.groceries,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString(),
  };
}

function createDefaultState(): HouseholdState {
  const profiles: HouseholdProfileMap = {};
  const trackingDate = getCurrentTrackingDateKey();

  return {
    version: 1,
    profiles,
    kitchen: {
      selectedMealId: "",
      groceries: [],
      updatedAt: new Date().toISOString(),
    },
    trackingDate,
    tracking: emptyTrackingMap(trackingDate),
  };
}

function normalizeState(rawState: unknown): HouseholdState {
  const source = isRecord(rawState) ? rawState : {};
  const profiles = normalizeProfiles(source.profiles);
  const kitchen = normalizeKitchen(source.kitchen, profiles);
  const trackingDate = getCurrentTrackingDateKey();
  const shouldReuseTracking = source.trackingDate === trackingDate;

  return {
    version: 1,
    profiles,
    kitchen,
    trackingDate,
    tracking: shouldReuseTracking ? normalizeTrackingMap(source.tracking, trackingDate) : emptyTrackingMap(trackingDate, Object.keys(profiles)),
  };
}

async function writeState(state: HouseholdState) {
  await mkdir(runtimeDirectory, { recursive: true });
  const tempPath = `${householdStorePath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(tempPath, householdStorePath);
}

async function readState(): Promise<HouseholdState> {
  try {
    const raw = await readFile(householdStorePath, "utf8");
    return normalizeState(JSON.parse(raw) as unknown);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      const fallbackState = createDefaultState();
      await writeState(fallbackState);
      return fallbackState;
    }

    const initialState = createDefaultState();
    await writeState(initialState);
    return initialState;
  }
}

async function persistState(update: (current: HouseholdState) => HouseholdState | Promise<HouseholdState>) {
  const nextStatePromise = mutationQueue.then(async () => {
    const current = await readState();
    const next = normalizeState(await update(current));
    await writeState(next);
    return next;
  });

  mutationQueue = nextStatePromise.then(
    () => undefined,
    () => undefined,
  );

  return nextStatePromise;
}

export async function getHouseholdState() {
  return readState();
}

export async function getTrackingForMember(memberId: HouseholdMemberId) {
  const household = await getHouseholdState();
  return household.tracking[memberId];
}

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

export async function ensureProfile(memberId: string) {
  const state = await getHouseholdState();
  if (state.profiles[memberId]) return state.profiles[memberId];

  const blank = createBlankProfile(memberId);
  await saveProfile(blank);
  return blank;
}

export async function saveProfile(profile: UserProfile) {
  return persistState((current) => ({
    ...current,
    profiles: {
      ...current.profiles,
      [profile.id]: profile,
    },
  }));
}

export async function saveDinnerSelection(recipeId: string) {
  const nextState = await persistState((current) => {
    const selection = resolveDinnerSelection(current.profiles, {
      selectedMealId: recipeId,
      groceries: [],
    });

    return {
      ...current,
      kitchen: {
        selectedMealId: selection.selectedMealId,
        groceries: selection.groceries,
        updatedAt: new Date().toISOString(),
      },
    };
  });

  return resolveDinnerSelection(nextState.profiles, nextState.kitchen);
}

export async function saveGroceries(groceries: GroceryItem[]) {
  const nextState = await persistState((current) => {
    const selection = resolveDinnerSelection(current.profiles, {
      selectedMealId: current.kitchen.selectedMealId,
      groceries,
    });

    return {
      ...current,
      kitchen: {
        selectedMealId: selection.selectedMealId,
        groceries: selection.groceries,
        updatedAt: new Date().toISOString(),
      },
    };
  });

  return resolveDinnerSelection(nextState.profiles, nextState.kitchen).groceries;
}

export async function saveFoodTracking(memberId: HouseholdMemberId, input: FoodTrackingInput) {
  const nextState = await persistState((current) => {
    const currentTracking = current.tracking[memberId];
    const nextTracking = normalizeTrackingState(
      {
        ...currentTracking,
        mealSelections: input.mealSelections ?? currentTracking.mealSelections,
        proteinAdds: input.proteinAdds ?? currentTracking.proteinAdds,
        hydrationAdds: input.hydrationAdds ?? currentTracking.hydrationAdds,
        exerciseFeedback: currentTracking.exerciseFeedback,
        loadHints: currentTracking.loadHints,
        updatedAt: new Date().toISOString(),
      },
      current.trackingDate,
    );

    return {
      ...current,
      tracking: {
        ...current.tracking,
        [memberId]: nextTracking,
      },
    };
  });

  return nextState.tracking[memberId];
}

export async function saveWorkoutFeedback(
  memberId: HouseholdMemberId,
  exerciseId: string,
  signal: DifficultySignal,
  loadHint: string,
) {
  const nextState = await persistState((current) => {
    const currentTracking = current.tracking[memberId];
    const nextTracking = normalizeTrackingState(
      {
        ...currentTracking,
        exerciseFeedback: {
          ...currentTracking.exerciseFeedback,
          [exerciseId]: signal,
        },
        loadHints: {
          ...currentTracking.loadHints,
          [exerciseId]: loadHint,
        },
        updatedAt: new Date().toISOString(),
      },
      current.trackingDate,
    );

    return {
      ...current,
      tracking: {
        ...current.tracking,
        [memberId]: nextTracking,
      },
    };
  });

  return nextState.tracking[memberId];
}
