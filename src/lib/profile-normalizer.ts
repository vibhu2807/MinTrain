import {
  ActivityLevel,
  EquipmentAccess,
  ExperienceLevel,
  GoalType,
  SpiceComfort,
  TimelinePace,
  UserProfile,
} from "@/lib/types";

export type UserProfileInput = Partial<UserProfile> & {
  likes?: string[] | string;
  avoids?: string[] | string;
  limitations?: string[] | string;
};

const goalValues: GoalType[] = ["build_muscle", "fat_loss", "recomp", "strength_confidence"];
const activityValues: ActivityLevel[] = ["light", "moderate", "active"];
const experienceValues: ExperienceLevel[] = ["new", "returning"];
const equipmentValues: EquipmentAccess[] = ["gym", "home", "mixed"];
const spiceValues: SpiceComfort[] = ["mild", "balanced", "bold"];
const paceValues: TimelinePace[] = ["gentle", "steady", "focused"];
const sexValues = ["female", "male", "other"] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pickString(value: unknown, fallback: string, maxLength = 80) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : fallback;
}

function pickFreeText(value: unknown, fallback: string, maxLength = 240) {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim().slice(0, maxLength);
}

function pickNumber(value: unknown, fallback: number, min: number, max: number) {
  const next = Number(value);
  if (!Number.isFinite(next)) {
    return fallback;
  }

  return clamp(Math.round(next), min, max);
}

function pickTime(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(cleaned)) {
    return cleaned;
  }

  return fallback;
}

function pickDate(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  return fallback;
}

function pickArray(value: unknown, fallback: string[]) {
  if (value === undefined) {
    return fallback;
  }

  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]/g)
      : [];

  return raw
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean)
    .slice(0, 10);
}

function pickEnum<T extends string>(value: unknown, fallback: T, options: readonly T[]) {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : fallback;
}

export function mergeProfilePatch(
  baseProfile: UserProfile,
  input: UserProfileInput | null | undefined,
  options?: { markOnboardingComplete?: boolean },
): UserProfile {
  const patch = input ?? {};
  const displayName = pickString(patch.displayName, baseProfile.displayName, 40);
  const shortLabel = pickString(
    patch.shortLabel,
    displayName.split(/\s+/)[0]?.slice(0, 12) ?? baseProfile.shortLabel,
    12,
  );

  return {
    ...baseProfile,
    displayName,
    shortLabel,
    age: pickNumber(patch.age, baseProfile.age, 16, 80),
    sex: pickEnum(patch.sex, baseProfile.sex, sexValues),
    heightCm: pickNumber(patch.heightCm, baseProfile.heightCm, 135, 220),
    weightKg: pickNumber(patch.weightKg, baseProfile.weightKg, 35, 200),
    goal: pickEnum(patch.goal, baseProfile.goal, goalValues),
    targetDate: pickDate(patch.targetDate, baseProfile.targetDate),
    timelinePace: pickEnum(patch.timelinePace, baseProfile.timelinePace, paceValues),
    activityLevel: pickEnum(patch.activityLevel, baseProfile.activityLevel, activityValues),
    experience: pickEnum(patch.experience, baseProfile.experience, experienceValues),
    confidenceLevel: pickNumber(patch.confidenceLevel, baseProfile.confidenceLevel, 1, 5) as 1 | 2 | 3 | 4 | 5,
    equipmentAccess: pickEnum(patch.equipmentAccess, baseProfile.equipmentAccess, equipmentValues),
    trainingDaysPerWeek: pickNumber(patch.trainingDaysPerWeek, baseProfile.trainingDaysPerWeek, 2, 7),
    preferredWorkoutTime: pickTime(patch.preferredWorkoutTime, baseProfile.preferredWorkoutTime),
    wakeTime: pickTime(patch.wakeTime, baseProfile.wakeTime),
    breakfastTime: pickTime(patch.breakfastTime, baseProfile.breakfastTime),
    lunchTime: pickTime(patch.lunchTime, baseProfile.lunchTime),
    snackTime: pickTime(patch.snackTime, baseProfile.snackTime),
    dinnerTime: pickTime(patch.dinnerTime, baseProfile.dinnerTime),
    sleepTime: pickTime(patch.sleepTime, baseProfile.sleepTime),
    dietStyle: "vegetarian_dairy",
    limitations: pickArray(patch.limitations, baseProfile.limitations),
    likes: pickArray(patch.likes, baseProfile.likes),
    avoids: pickArray(patch.avoids, baseProfile.avoids),
    spiceComfort: pickEnum(patch.spiceComfort, baseProfile.spiceComfort, spiceValues),
    notes: pickFreeText(patch.notes, baseProfile.notes),
    onboardingComplete: options?.markOnboardingComplete ? true : baseProfile.onboardingComplete,
  };
}
