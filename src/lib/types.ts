export type HouseholdMemberId = string;

export type GoalType = "build_muscle" | "fat_loss" | "recomp" | "strength_confidence";
export type ExperienceLevel = "new" | "returning";
export type EquipmentAccess = "gym" | "home" | "mixed";
export type ActivityLevel = "light" | "moderate" | "active";
export type SpiceComfort = "mild" | "balanced" | "bold";
export type TimelinePace = "gentle" | "steady" | "focused";
export type DifficultySignal = "too_easy" | "good_challenge" | "too_heavy";
export type StartingLoadMode = "bodyweight" | "dumbbell" | "machine" | "cable" | "barbell";
export type MealChoiceKey = "primary" | "backup";
export type ExerciseMediaId =
  | "leg_press"
  | "chest_press"
  | "lat_pulldown"
  | "romanian_deadlift"
  | "split_squat"
  | "dead_bug";

export interface UserProfile {
  id: HouseholdMemberId;
  displayName: string;
  shortLabel: string;
  email: string;
  age: number;
  sex: "female" | "male" | "other";
  heightCm: number;
  weightKg: number;
  goal: GoalType;
  targetDate: string;
  timelinePace: TimelinePace;
  activityLevel: ActivityLevel;
  experience: ExperienceLevel;
  confidenceLevel: 1 | 2 | 3 | 4 | 5;
  equipmentAccess: EquipmentAccess;
  trainingDaysPerWeek: number;
  preferredWorkoutTime: string;
  wakeTime: string;
  breakfastTime: string;
  lunchTime: string;
  snackTime: string;
  dinnerTime: string;
  sleepTime: string;
  dietStyle: "vegetarian_dairy";
  limitations: string[];
  likes: string[];
  avoids: string[];
  spiceComfort: SpiceComfort;
  notes: string;
  onboardingComplete: boolean;
}

export interface StartingLoadRecommendation {
  mode: StartingLoadMode;
  rangeLabel: string;
  note: string;
}

export interface ExerciseInstruction {
  setup: string;
  cues: string[];
  mistakes: string[];
  painResponse: string;
}

export interface ExerciseSubstitution {
  label: string;
  reason: string;
}

export interface WorkoutExercise {
  id: string;
  mediaId: ExerciseMediaId;
  name: string;
  target: string;
  why: string;
  sets: string;
  reps: string;
  restSeconds: number;
  tempo: string;
  startingLoad: StartingLoadRecommendation;
  confidencePrompt: string;
  instruction: ExerciseInstruction;
  homeSubstitute: ExerciseSubstitution;
}

export interface WorkoutPlan {
  title: string;
  split: string;
  estimatedMinutes: number;
  recoveryNote: string;
  focus: string[];
  exercises: WorkoutExercise[];
}

export interface MealChoice {
  title: string;
  subtitle: string;
  proteinGrams: number;
}

export interface DailyMealSlot {
  id: string;
  label: string;
  time: string;
  note: string;
  primary: MealChoice;
  backup: MealChoice;
}

export interface QuickTrackOption {
  id: string;
  label: string;
  amountLabel: string;
  value: number;
  unit: "g" | "ml";
}

export interface TrackingNote {
  title: string;
  body: string;
}

export interface DailyNutritionTarget {
  proteinTargetGrams: number;
  hydrationTargetMl: number;
  mealSlots: DailyMealSlot[];
  quickProteinOptions: QuickTrackOption[];
  hydrationOptions: QuickTrackOption[];
  trackingNotes: TrackingNote[];
}

export interface DailyTrackingState {
  dateKey: string;
  updatedAt: string;
  mealSelections: Record<string, MealChoiceKey>;
  proteinAdds: Record<string, number>;
  hydrationAdds: Record<string, number>;
  exerciseFeedback: Record<string, DifficultySignal>;
  loadHints: Record<string, string>;
}

export interface RecipeCard {
  id: string;
  name: string;
  cuisine: string;
  prepMinutes: number;
  proteinGrams: number;
  spiceProfile: string;
  whyItWorks: string;
  ingredients: string[];
  method: string[];
  tags: string[];
}

export interface MealCandidate {
  rank: number;
  reason: string;
  effort: "easy" | "medium";
  proteinFit: string;
  repeatRisk: "low" | "medium";
  recipe: RecipeCard;
}

export interface GroceryItem {
  id: string;
  label: string;
  quantity: string;
  aisle: string;
  checked: boolean;
}

export interface MealSelection {
  selectedMealId: string;
  selectedMealName: string;
  serves: number;
  groceries: GroceryItem[];
}

export interface DailyCoachSummary {
  greeting: string;
  headline: string;
  nextBestAction: string;
  beginnerReminder: string;
}

export interface HouseholdInsight {
  memberId: HouseholdMemberId;
  memberLabel: string;
  goalLabel: string;
  proteinTarget: number;
  dinnerNeed: string;
}

export interface DashboardBundle {
  generatedAt: string;
  currentUser: UserProfile;
  summary: DailyCoachSummary;
  nutrition: DailyNutritionTarget;
  tracking: DailyTrackingState;
  workoutPlan: WorkoutPlan;
  kitchenCandidates: MealCandidate[];
  selectedDinner: MealSelection;
  householdInsights: HouseholdInsight[];
}

export interface SchedulerPayload {
  household: DashboardBundle[];
  dinnerOptions: MealCandidate[];
  ranAt: string;
}
