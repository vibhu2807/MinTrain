import {
  aiGenerateCoachSummary,
  aiGenerateHouseholdInsights,
  aiGenerateLoadHint,
  aiGenerateMealSlots,
  aiGenerateTrackingNotes,
  aiGenerateWorkoutPlan,
} from "@/lib/ai";
import { baseGroceries, householdProfiles, recentDinnerHistory, recipeLibrary } from "@/lib/data";
import {
  DailyTrackingState,
  DashboardBundle,
  DailyCoachSummary,
  DailyMealSlot,
  DailyNutritionTarget,
  DifficultySignal,
  GoalType,
  GroceryItem,
  HouseholdInsight,
  HouseholdMemberId,
  MealCandidate,
  MealSelection,
  QuickTrackOption,
  RecipeCard,
  SchedulerPayload,
  StartingLoadRecommendation,
  TrackingNote,
  UserProfile,
  WorkoutExercise,
  WorkoutPlan,
} from "@/lib/types";

const aiEnabled = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-paste-your-openai-api-key-here");

type HouseholdProfileMap = Record<HouseholdMemberId, UserProfile>;

const goalLabels: Record<GoalType, string> = {
  build_muscle: "Build lean muscle",
  fat_loss: "Lose body fat gradually",
  recomp: "Recomp and regain consistency",
  strength_confidence: "Build strength and confidence",
};

const paceLabels = {
  gentle: "Gentle runway",
  steady: "Steady runway",
  focused: "Focused runway",
} as const;

function round(value: number) {
  return Math.round(value);
}

function parseTimeValue(value: string) {
  const trimmed = value.trim();
  const twentyFourHour = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHour) {
    return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
  }

  const meridiem = trimmed.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (meridiem == null) {
    return 8 * 60;
  }

  const hoursRaw = Number(meridiem[1]);
  const minutes = Number(meridiem[2]);
  const period = meridiem[3].toUpperCase();
  const hours24 = period === "PM" ? (hoursRaw % 12) + 12 : hoursRaw % 12;
  return hours24 * 60 + minutes;
}

function formatTimeLabel(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

function displayTime(value: string) {
  return formatTimeLabel(parseTimeValue(value));
}

function formatTargetDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "your target window";
  }

  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(parsed);
}





export function proteinTargetFor(profile: UserProfile, workoutIntensity: "rest" | "light" | "moderate" | "heavy" = "moderate") {
  const baseMultiplier = {
    build_muscle: 1.8,
    fat_loss: 1.7,
    recomp: 1.65,
    strength_confidence: 1.5,
  }[profile.goal];

  const activityBonus = {
    light: 0,
    moderate: 0.05,
    active: 0.1,
  }[profile.activityLevel];

  const paceBonus = {
    gentle: 0,
    steady: 0.05,
    focused: 0.1,
  }[profile.timelinePace];

  const intensityBonus = {
    rest: -0.1,
    light: 0,
    moderate: 0.05,
    heavy: 0.15,
  }[workoutIntensity];

  return round(profile.weightKg * (baseMultiplier + activityBonus + paceBonus + intensityBonus));
}

export function todaysIntensity(exercises: { sets: string; reps: string }[]): "rest" | "light" | "moderate" | "heavy" {
  if (exercises.length === 0) return "rest";
  if (exercises.length <= 3) return "light";
  if (exercises.length <= 5) return "moderate";
  return "heavy";
}

export function hydrationTargetLitres(profile: UserProfile) {
  const base = profile.weightKg * 35;
  const activityBonus = { light: 250, moderate: 400, active: 550 }[profile.activityLevel];
  const trainingBonus = profile.trainingDaysPerWeek >= 5 ? 350 : 200;
  return (round(base + activityBonus + trainingBonus) / 1000).toFixed(1);
}

export function hydrationTargetMlFor(profile: UserProfile) {
  const base = profile.weightKg * 35;
  const activityBonus = {
    light: 250,
    moderate: 400,
    active: 550,
  }[profile.activityLevel];

  const trainingBonus = profile.trainingDaysPerWeek >= 5 ? 350 : 200;
  return round(base + activityBonus + trainingBonus);
}

function meal(title: string, details: string, proteinGrams: number) {
  return { title, subtitle: details, proteinGrams };
}

function likesPaneer(profile: UserProfile) {
  return profile.likes.some((item) => item.toLowerCase().includes("paneer"));
}

function buildMealSlots(
  profile: UserProfile,
  selectedDinner: MealSelection,
  kitchenCandidates: MealCandidate[],
): DailyMealSlot[] {
  const selected = kitchenCandidates.find((c) => c.recipe.id === selectedDinner.selectedMealId) ?? kitchenCandidates[0];

  return [
    {
      id: "breakfast",
      label: "Breakfast",
      time: displayTime(profile.breakfastTime),
      note: "Start your day with protein so you don't need to catch up later.",
      primary: likesPaneer(profile)
        ? meal("Paneer toast plate", "2 slices toast + 100g paneer bhurji + 1 fruit. Takes 10 min.", 27)
        : meal("Curd fruit bowl", "200g hung curd + banana + seeds + handful roasted chana. No cooking.", 23),
      backup: meal("Moong chilla + curd", "2 chillas + 100g curd on the side. Quick and filling.", 22),
    },
    {
      id: "lunch",
      label: "Lunch",
      time: displayTime(profile.lunchTime),
      note: "Proper meal to keep energy up through work and gym.",
      primary: profile.goal === "build_muscle"
        ? meal("Protein thali", "1 bowl dal + 2 roti + sabzi + 100g curd + 80g paneer side. Normal home food.", 33)
        : meal("Balanced thali", "1 bowl dal + 2 roti + sabzi + 100g curd + salad. Normal home food.", 25),
      backup: meal("Wrap box", "Paneer or chana wrap + curd or chaas. Good for office.", 24),
    },
    {
      id: "pre_workout",
      label: "Pre-workout",
      time: displayTime(profile.snackTime),
      note: "Eat this 45-60 min before gym. Light but enough energy.",
      primary: meal("Banana + curd + chana", "1 banana + 100g curd + small handful roasted chana.", 12),
      backup: meal("Dates + milk", "3-4 dates + 1 glass milk. Quick energy.", 8),
    },
    {
      id: "post_workout",
      label: "Post-workout",
      time: displayTime(profile.preferredWorkoutTime),
      note: "Eat within 30 min after gym. Protein matters most here.",
      primary: profile.goal === "build_muscle"
        ? meal("Paneer shake + chana", "200ml milk + 50g paneer blend + roasted chana. Fast protein.", 25)
        : meal("Curd + fruit + seeds", "200g curd + fruit + 1 spoon seeds. Light and enough.", 18),
      backup: meal("Milk + banana", "1 glass milk + 1 banana. Simple and quick.", 12),
    },
    {
      id: "evening_snack",
      label: "Evening snack",
      time: "6:30 PM",
      note: "Small top-up if you're hungry between workout and dinner.",
      primary: meal("Roasted chana + chaas", "1 cup roasted chana + 1 glass chaas.", 14),
      backup: meal("Peanut butter toast", "1 toast + 1 tbsp peanut butter.", 8),
    },
    {
      id: "dinner",
      label: "Dinner",
      time: displayTime(profile.dinnerTime),
      note: "Shared dinner for the whole house.",
      primary: meal(selectedDinner.selectedMealName, selected?.recipe.whyItWorks ?? "Tonight's pick.", selected?.recipe.proteinGrams ?? 24),
      backup: meal("Dal rice + curd", "1 bowl dal + rice + 100g curd + salad. Always works.", 20),
    },
  ];
}

function buildQuickProteinOptions(): QuickTrackOption[] {
  return [
    { id: "paneer", label: "Paneer", amountLabel: "100 g", value: 18, unit: "g" },
    { id: "curd", label: "Greek curd", amountLabel: "200 g", value: 18, unit: "g" },
    { id: "dal", label: "Dal bowl", amountLabel: "1 bowl", value: 12, unit: "g" },
    { id: "milk", label: "Milk", amountLabel: "1 glass", value: 8, unit: "g" },
    { id: "chana", label: "Roasted chana", amountLabel: "1 serving", value: 10, unit: "g" },
  ];
}

function buildHydrationOptions(): QuickTrackOption[] {
  return [
    { id: "glass", label: "Glass", amountLabel: "250 ml", value: 250, unit: "ml" },
    { id: "bottle-half", label: "Half bottle", amountLabel: "500 ml", value: 500, unit: "ml" },
    { id: "bottle", label: "Bottle", amountLabel: "750 ml", value: 750, unit: "ml" },
  ];
}

function buildTrackingNotes(profile: UserProfile): TrackingNote[] {
  return [
    {
      title: "Protein target is structured",
      body: `MinTrain is aiming at ${proteinTargetFor(profile)} g of protein for this profile and timeline, using saved food values instead of loose guessing.`,
    },
    {
      title: "Hydration stays simple",
      body: `Water is tracked with tap buttons against a daily target of ${hydrationTargetMlFor(profile)} ml.`,
    },
    {
      title: "Planning is timeline-aware",
      body: `Current plan is paced toward ${formatTargetDate(profile.targetDate)} with a ${paceLabels[profile.timelinePace].toLowerCase()} rhythm.`,
    },
  ];
}

function beginnerSummary(profile: UserProfile): DailyCoachSummary {
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  return {
    greeting: `Hi, ${profile.displayName}`,
    headline: `${dayName} — ${profile.goal === "build_muscle" ? "muscle day" : profile.goal === "fat_loss" ? "fat loss day" : profile.goal === "strength_confidence" ? "strength day" : "training day"}`,
    nextBestAction: `Eat your pre-workout meal, then start workout around ${displayTime(profile.preferredWorkoutTime)}.`,
    beginnerReminder: "Stay consistent. Good food + good reps = results.",
  };
}

function loadRange(mode: StartingLoadRecommendation["mode"], label: string, note: string): StartingLoadRecommendation {
  return { mode, rangeLabel: label, note };
}

function suggestStartingLoad(profile: UserProfile, movement: string): StartingLoadRecommendation {
  const lightBias = profile.confidenceLevel <= 2 || profile.experience === "new";

  const movementMap: Record<string, StartingLoadRecommendation> = {
    squat: loadRange(
      "dumbbell",
      lightBias ? "4-6 kg goblet hold" : "6-10 kg goblet hold",
      "Stay upright, pause at the bottom, and only climb if every rep stays controlled.",
    ),
    press: loadRange(
      "machine",
      lightBias ? "5-10 kg per side" : "10-15 kg per side",
      "You should finish with 2-3 clean reps still in reserve.",
    ),
    pull: loadRange(
      "cable",
      lightBias ? "10-15 kg" : "15-22 kg",
      "Keep chest tall and stop any swinging before it starts.",
    ),
    hinge: loadRange(
      "dumbbell",
      lightBias ? "6-8 kg each hand" : "8-12 kg each hand",
      "Feel hamstrings and glutes first. Lower back should stay quiet.",
    ),
    split_squat: loadRange(
      "bodyweight",
      "Bodyweight or 2-4 kg each hand",
      "Own the balance first, then add load only when knees feel steady.",
    ),
    core: loadRange("bodyweight", "Bodyweight", "Breathing and control matter more than speed here."),
  };

  return movementMap[movement] ?? loadRange("bodyweight", "Bodyweight to very light load", "Use the first session to calibrate effort.");
}

function exercise(
  id: string,
  mediaId: WorkoutExercise["mediaId"],
  name: string,
  target: string,
  why: string,
  sets: string,
  reps: string,
  restSeconds: number,
  tempo: string,
  movement: string,
  homeSubstitute: string,
  substituteReason: string,
  setup: string,
  cues: string[],
  mistakes: string[],
  painResponse: string,
  profile: UserProfile,
): WorkoutExercise {
  return {
    id,
    mediaId,
    name,
    target,
    why,
    sets,
    reps,
    restSeconds,
    tempo,
    startingLoad: suggestStartingLoad(profile, movement),
    confidencePrompt: "How did the final clean set feel?",
    instruction: {
      setup,
      cues,
      mistakes,
      painResponse,
    },
    homeSubstitute: {
      label: homeSubstitute,
      reason: substituteReason,
    },
  };
}

export function buildWorkoutPlan(profile: UserProfile): WorkoutPlan {
  const focus =
    profile.goal === "build_muscle"
      ? ["repeatable strength", "machine confidence", "protein-backed growth"]
      : profile.goal === "strength_confidence"
        ? ["safe technique", "joint-friendly strength", "small wins"]
        : profile.goal === "fat_loss"
          ? ["repeatable effort", "full-body work", "sustainable pace"]
          : ["return to consistency", "full-body strength", "clean progression"];

  return {
    title: `${goalLabels[profile.goal]} runner`,
    split: profile.trainingDaysPerWeek >= 4 ? "3 anchor sessions + 1 optional lighter day" : "3 anchor sessions",
    estimatedMinutes: profile.confidenceLevel <= 2 ? 42 : 48,
    recoveryNote: `Sleep around ${displayTime(profile.sleepTime)} and keep the routine steady instead of chasing soreness.`,
    focus,
    exercises: [
      exercise(
        "leg-press",
        "leg_press",
        profile.equipmentAccess === "home" ? "Goblet Squat to Box" : "Leg Press or Goblet Squat",
        "Quads and glutes",
        "Build lower-body confidence with a stable pattern before moving toward anything technical.",
        "3 sets",
        "8-10 reps",
        90,
        "3-1-1",
        "squat",
        "Goblet squat to a chair",
        "Same pattern at home, with a safer depth target.",
        "Feet shoulder width, ribs stacked, and lower with control.",
        ["Drive through mid-foot", "Keep knees tracking with toes", "Pause for one beat at the bottom"],
        ["Dropping too fast", "Heels lifting", "Knees falling inward"],
        "Reduce range, use a box target, or switch to supported split squats if knees complain.",
        profile,
      ),
      exercise(
        "chest-press",
        "chest_press",
        profile.equipmentAccess === "home" ? "Incline Push-up" : "Machine Chest Press",
        "Chest, shoulders, triceps",
        "This gives pressing confidence without needing a spotter or complicated setup.",
        "3 sets",
        "8-10 reps",
        90,
        "2-1-1",
        "press",
        "Incline push-up on bench or counter",
        "Same push pattern with easier control on home days.",
        "Set handles at mid-chest and keep shoulder blades gently tucked back.",
        ["Wrists stacked over forearms", "Smooth press out", "Stop before shoulders roll forward"],
        ["Bouncing the weight", "Elbows flaring too wide", "Shrugging into the neck"],
        "Switch to incline push-ups or floor press if the front shoulder feels sharp.",
        profile,
      ),
      exercise(
        "lat-pulldown",
        "lat_pulldown",
        profile.equipmentAccess === "home" ? "Band Pulldown or Door Row" : "Lat Pulldown",
        "Upper back and biceps",
        "Balances the pressing work and teaches the back to stay active and stable.",
        "3 sets",
        "10-12 reps",
        75,
        "2-1-2",
        "pull",
        "Resistance band pulldown or door row",
        "Keeps the pull pattern alive even without machines.",
        "Grip just outside shoulder width, chest proud, and pull elbows toward ribs.",
        ["Lead with elbows", "Pause near collarbone", "Control the return"],
        ["Leaning too far back", "Pulling with wrists", "Shoulders creeping up"],
        "Use a seated row or lighter band if overhead pulling feels awkward today.",
        profile,
      ),
      exercise(
        "romanian-deadlift",
        "romanian_deadlift",
        "Dumbbell Romanian Deadlift",
        "Hamstrings and glutes",
        "Good hinge practice keeps posture strong and makes lower-body work feel safer.",
        "3 sets",
        "8 reps",
        90,
        "3-1-1",
        "hinge",
        "Backpack hinge or wall tap hinge",
        "Teaches the same hip pattern with minimal setup.",
        "Keep the dumbbells close, soften the knees, and send hips back.",
        ["Spine stays long", "Stop when hamstrings stretch", "Keep dumbbells close to legs"],
        ["Turning it into a squat", "Rounding low back", "Weights drifting forward"],
        "Switch to glute bridges if you feel more lower back than hamstrings.",
        profile,
      ),
      exercise(
        "split-squat",
        "split_squat",
        "Supported Split Squat",
        "Glutes, quads, balance",
        "Single-leg control builds confidence and exposes balance before load gets heavy.",
        "2-3 sets",
        "8 each side",
        60,
        "2-1-2",
        "split_squat",
        "Chair-assisted split squat",
        "Keeps balance support close on home days.",
        "Hold a support lightly and keep torso tall.",
        ["Short range is fine", "Front foot stays planted", "Push through full foot"],
        ["Wobbling into front knee", "Rushing the reps", "Leaning too far forward"],
        "Use sit-to-stand instead if knees dislike the split stance.",
        profile,
      ),
      exercise(
        "dead-bug",
        "dead_bug",
        "Dead Bug",
        "Core and bracing",
        "This teaches trunk control so the rest of the session feels more stable.",
        "2 sets",
        "8 slow reps per side",
        45,
        "slow and smooth",
        "core",
        "Dead bug on the floor",
        "No equipment needed and very beginner-friendly.",
        "Keep lower back softly pressed down and exhale as the arm and leg reach away.",
        ["Move slowly", "Keep ribs down", "Reset whenever control slips"],
        ["Arching low back", "Holding your breath", "Rushing the reach"],
        "Shorten the reach or switch to bent-knee marching if pressure control fades.",
        profile,
      ),
    ],
  };
}

export function buildDinnerCandidates(household: HouseholdProfileMap = householdProfiles): MealCandidate[] {
  const members = Object.values(household);
  const averageTarget = members.reduce((sum, member) => sum + proteinTargetFor(member), 0) / members.length;
  const boldPreferenceCount = members.filter((member) => member.spiceComfort === "bold").length;

  function scoreRecipe(recipe: RecipeCard) {
    const recentPenalty = recentDinnerHistory.includes(recipe.name) ? 8 : 0;
    const proteinBonus = Math.min(25, Math.round((recipe.proteinGrams / Math.max(averageTarget / 4, 1)) * 10));
    const easeBonus = recipe.prepMinutes <= 30 ? 10 : 4;
    const varietyBonus = recipe.tags.includes("world food") ? 6 : 4;
    const spiceBonus = boldPreferenceCount >= 1 && recipe.spiceProfile.toLowerCase().includes("warm") ? 4 : 2;
    return proteinBonus + easeBonus + varietyBonus + spiceBonus - recentPenalty;
  }

  return [...recipeLibrary]
    .sort((left, right) => scoreRecipe(right) - scoreRecipe(left))
    .slice(0, 3)
    .map((recipe, index) => ({
      rank: index + 1,
      reason:
        index === 0
          ? "Best fit tonight: strongest protein lane, easy prep, and familiar enough for a shared house dinner."
          : index === 1
            ? "Backup choice when you want variety without leaving your usual spice comfort zone."
            : "More playful option for nights when the house wants something different but still practical.",
      effort: recipe.prepMinutes <= 28 ? "easy" : "medium",
      proteinFit: `${recipe.proteinGrams} g protein per serving before any curd or dal on the side.`,
      repeatRisk: recentDinnerHistory.includes(recipe.name) ? "medium" : "low",
      recipe,
    }));
}

function deriveGroceriesFromRecipe(recipe: RecipeCard): GroceryItem[] {
  const recipeGroceries = recipe.ingredients.map((ingredient, index) => ({
    id: `${recipe.id}-${index}`,
    label: ingredient,
    quantity: index < 2 ? "Buy for 3 servings" : "Check pantry or top up",
    aisle: index < 2 ? "Fresh" : "Pantry",
    checked: false,
  }));

  return [...baseGroceries, ...recipeGroceries];
}

export function defaultDinnerSelection(kitchenCandidates: MealCandidate[] = buildDinnerCandidates()): MealSelection {
  const firstRecipe = kitchenCandidates[0].recipe;
  return {
    selectedMealId: firstRecipe.id,
    selectedMealName: firstRecipe.name,
    serves: 3,
    groceries: deriveGroceriesFromRecipe(firstRecipe),
  };
}

export function mealSelectionFromId(recipeId: string, kitchenCandidates: MealCandidate[] = buildDinnerCandidates()): MealSelection {
  const recipe = recipeLibrary.find((item) => item.id === recipeId) ?? kitchenCandidates[0].recipe;
  return {
    selectedMealId: recipe.id,
    selectedMealName: recipe.name,
    serves: 3,
    groceries: deriveGroceriesFromRecipe(recipe),
  };
}

function buildNutrition(
  profile: UserProfile,
  selectedDinner: MealSelection,
  kitchenCandidates: MealCandidate[],
): DailyNutritionTarget {
  return {
    proteinTargetGrams: proteinTargetFor(profile),
    hydrationTargetMl: hydrationTargetMlFor(profile),
    mealSlots: buildMealSlots(profile, selectedDinner, kitchenCandidates),
    quickProteinOptions: buildQuickProteinOptions(),
    hydrationOptions: buildHydrationOptions(),
    trackingNotes: buildTrackingNotes(profile),
  };
}

export function householdInsights(household: HouseholdProfileMap = householdProfiles): HouseholdInsight[] {
  return Object.values(household).map((profile) => ({
    memberId: profile.id,
    memberLabel: profile.shortLabel,
    goalLabel: goalLabels[profile.goal],
    proteinTarget: proteinTargetFor(profile),
    dinnerNeed:
      profile.goal === "build_muscle"
        ? "Needs the strongest protein share at dinner."
        : profile.goal === "strength_confidence"
          ? "Needs lighter-feeling meals that still close the protein gap."
          : profile.goal === "fat_loss"
            ? "Needs steady protein with easier portion control."
            : "Needs balanced dinner without making the day feel too heavy.",
  }));
}

function defaultTrackingState(): DailyTrackingState {
  const now = new Date().toISOString();
  return {
    dateKey: now.slice(0, 10),
    updatedAt: now,
    mealSelections: {},
    proteinAdds: {},
    hydrationAdds: {},
    exerciseFeedback: {},
    loadHints: {},
  };
}

export function buildDashboardBundleFromHousehold(
  memberId: HouseholdMemberId,
  household: HouseholdProfileMap,
  selectedDinner?: MealSelection,
  tracking?: DailyTrackingState,
): DashboardBundle {
  const currentUser = household[memberId];
  const kitchenCandidates = buildDinnerCandidates(household);
  const resolvedDinner = selectedDinner ?? defaultDinnerSelection(kitchenCandidates);
  const resolvedTracking = tracking ?? defaultTrackingState();

  return {
    generatedAt: new Date().toISOString(),
    currentUser,
    summary: beginnerSummary(currentUser),
    nutrition: buildNutrition(currentUser, resolvedDinner, kitchenCandidates),
    tracking: resolvedTracking,
    workoutPlan: buildWorkoutPlan(currentUser),
    kitchenCandidates,
    selectedDinner: resolvedDinner,
    householdInsights: householdInsights(household),
  };
}

export function buildDashboardBundle(memberId: HouseholdMemberId): DashboardBundle {
  return buildDashboardBundleFromHousehold(memberId, householdProfiles);
}

export function buildSchedulerPayload(household: HouseholdProfileMap = householdProfiles): SchedulerPayload {
  const orderedIds = Object.keys(householdProfiles) as HouseholdMemberId[];
  return {
    household: orderedIds.map((memberId) => buildDashboardBundleFromHousehold(memberId, household)),
    dinnerOptions: buildDinnerCandidates(household),
    ranAt: new Date().toISOString(),
  };
}

export function regenerateWorkoutForProfile(
  profile: UserProfile,
  household?: HouseholdProfileMap,
  selectedDinner?: MealSelection,
) {
  const nextHousehold = household ?? {
    ...householdProfiles,
    [profile.id]: profile,
  };
  const kitchenCandidates = buildDinnerCandidates(nextHousehold);
  const resolvedDinner = selectedDinner ?? defaultDinnerSelection(kitchenCandidates);

  return {
    currentUser: profile,
    summary: beginnerSummary(profile),
    nutrition: buildNutrition(profile, resolvedDinner, kitchenCandidates),
    workoutPlan: buildWorkoutPlan(profile),
  };
}

/**
 * Async AI generation — called ONLY from onboarding/refresh API routes.
 * Generates personalized content and returns it for the route to store.
 * Falls back to rule-based if AI fails.
 */
export async function regenerateWithAI(
  profile: UserProfile,
  household: HouseholdProfileMap,
  selectedDinner?: MealSelection,
) {
  const kitchenCandidates = buildDinnerCandidates(household);
  const resolvedDinner = selectedDinner ?? defaultDinnerSelection(kitchenCandidates);
  const proteinTarget = proteinTargetFor(profile);

  if (!aiEnabled) {
    return regenerateWorkoutForProfile(profile, household, resolvedDinner);
  }

  const [aiWorkout, aiMeals, aiSummary, aiNotes, aiInsights] = await Promise.all([
    aiGenerateWorkoutPlan(profile).catch(() => null),
    aiGenerateMealSlots(profile, proteinTarget).catch(() => null),
    aiGenerateCoachSummary(profile).catch(() => null),
    aiGenerateTrackingNotes(profile, proteinTarget, hydrationTargetMlFor(profile)).catch(() => null),
    aiGenerateHouseholdInsights(
      household,
      Object.fromEntries(
        (Object.entries(household) as [HouseholdMemberId, UserProfile][]).map(([id, p]) => [id, proteinTargetFor(p)]),
      ) as Record<HouseholdMemberId, number>,
    ).catch(() => null),
  ]);

  const ruleBased = regenerateWorkoutForProfile(profile, household, resolvedDinner);

  return {
    currentUser: profile,
    summary: aiSummary ?? ruleBased.summary,
    nutrition: {
      ...ruleBased.nutrition,
      mealSlots: aiMeals ?? ruleBased.nutrition.mealSlots,
      trackingNotes: aiNotes ?? ruleBased.nutrition.trackingNotes,
    },
    workoutPlan: aiWorkout ?? ruleBased.workoutPlan,
    householdInsights: aiInsights ?? householdInsights(household),
  };
}

export async function nextLoadHint(signal: DifficultySignal, currentRange: string, profile?: UserProfile, exerciseName?: string): Promise<string> {
  if (aiEnabled && profile && exerciseName) {
    const aiHint = await aiGenerateLoadHint(profile, exerciseName, signal, currentRange);
    if (aiHint) return aiHint;
  }

  if (signal === "too_easy") {
    return `Next session: go slightly above ${currentRange} if form stayed calm and consistent.`;
  }

  if (signal === "too_heavy") {
    return `Next session: stay below ${currentRange}, slow the reps, and keep 2-3 reps in reserve.`;
  }

  return `Next session: repeat around ${currentRange} and own the same clean reps again.`;
}
