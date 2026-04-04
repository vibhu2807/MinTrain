import "server-only";

import OpenAI from "openai";

import type {
  DailyCoachSummary,
  DailyMealSlot,
  HouseholdInsight,
  HouseholdMemberId,
  TrackingNote,
  UserProfile,
  WorkoutExercise,
  WorkoutPlan,
} from "@/lib/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

const MODEL = "gpt-4o-mini";

function profileContext(profile: UserProfile): string {
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = new Date().toLocaleDateString("en-GB");
  return [
    `Today: ${dayName}, ${dateStr}`,
    `Name: ${profile.displayName}`,
    `Age: ${profile.age}, Sex: ${profile.sex}, Height: ${profile.heightCm}cm, Weight: ${profile.weightKg}kg`,
    `Goal: ${profile.goal.replace(/_/g, " ")}`,
    `Target date: ${profile.targetDate}`,
    `Experience: ${profile.experience}, Confidence: ${profile.confidenceLevel}/5`,
    `Equipment: ${profile.equipmentAccess}, Training days/week: ${profile.trainingDaysPerWeek}`,
    `Workout time: ${profile.preferredWorkoutTime}`,
    `Schedule: Wake ${profile.wakeTime}, Breakfast ${profile.breakfastTime}, Lunch ${profile.lunchTime}, Snack ${profile.snackTime}, Dinner ${profile.dinnerTime}, Sleep ${profile.sleepTime}`,
    `Diet: Indian vegetarian with dairy`,
    `Likes: ${profile.likes.join(", ") || "no specific"}`,
    `Avoids: ${profile.avoids.join(", ") || "nothing specific"}`,
    `Limitations: ${profile.limitations.join(", ") || "none"}`,
    `Spice: ${profile.spiceComfort}`,
    profile.notes ? `Personal goal: ${profile.notes}` : "",
  ].filter(Boolean).join("\n");
}

function pickMediaId(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("leg press") || (lower.includes("squat") && !lower.includes("split"))) return "leg_press";
  if (lower.includes("chest") || lower.includes("bench") || lower.includes("push")) return "chest_press";
  if (lower.includes("lat") || lower.includes("pull") || lower.includes("row")) return "lat_pulldown";
  if (lower.includes("deadlift") || lower.includes("hinge") || lower.includes("rdl")) return "romanian_deadlift";
  if (lower.includes("split") || lower.includes("lunge") || lower.includes("step")) return "split_squat";
  return "dead_bug";
}

async function chatJson<T>(system: string, user: string, temperature = 0.7): Promise<T | null> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const text = response.choices[0]?.message?.content;
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ─── Workout Plan ───────────────────────────────────────────────────────────

type AIWorkoutResponse = {
  title: string;
  split: string;
  estimatedMinutes: number;
  recoveryNote: string;
  focus: string[];
  exercises: Array<{
    id: string;
    name: string;
    target: string;
    why: string;
    sets: string;
    reps: string;
    restSeconds: number;
    tempo: string;
    startingLoad: { mode: string; rangeLabel: string; note: string };
    instruction: { setup: string; cues: string[]; mistakes: string[]; painResponse: string };
    homeSubstitute: { label: string; reason: string };
  }>;
};

export async function aiGenerateWorkoutPlan(profile: UserProfile): Promise<WorkoutPlan | null> {
  const system = `You are a certified personal trainer creating a beginner-safe gym workout plan for an Indian household member.
Return a JSON object with this exact structure:
{
  "title": "short plan name",
  "split": "session structure description",
  "estimatedMinutes": number,
  "recoveryNote": "recovery guidance",
  "focus": ["focus1", "focus2", "focus3"],
  "exercises": [
    {
      "id": "kebab-case-id",
      "name": "Exercise Name",
      "target": "muscle group",
      "why": "why this exercise matters for the user's goal",
      "sets": "3 sets",
      "reps": "8-10 reps",
      "restSeconds": 90,
      "tempo": "3-1-1",
      "startingLoad": { "mode": "machine|dumbbell|bodyweight|cable|barbell", "rangeLabel": "weight range", "note": "load coaching cue" },
      "instruction": { "setup": "how to set up", "cues": ["cue1","cue2","cue3"], "mistakes": ["mistake1","mistake2"], "painResponse": "what to do if pain" },
      "homeSubstitute": { "label": "home exercise name", "reason": "why it works at home" }
    }
  ]
}

Rules:
- Generate 5-7 exercises for TODAY's session based on the day of the week
- Use a real gym trainer weekly split:
  Monday = Chest + Biceps
  Tuesday = Back + Triceps
  Wednesday = Legs + Shoulders
  Thursday = Chest + Triceps
  Friday = Back + Biceps
  Saturday = Legs + Core
  Sunday = Rest day (light stretching or cardio only, 2-3 exercises max)
- Each muscle group day should have 3-4 exercises for the main muscle and 2-3 for the secondary
- For example Monday: Bench Press, Incline Press, Cable Fly, Push-up (chest) + Bicep Curl, Dumbbell Curl (biceps)
- Exercises can repeat across weeks — that's normal gym training. Consistency builds muscle.
- Vary the ORDER and exact exercises slightly week to week to keep it interesting
- Adapt load ranges to the user's confidence level (1=very light, 5=experienced)
- If user has limitations (e.g. knee issues), modify exercises accordingly
- Keep instructions short and in simple English
- Include home alternatives for every exercise
- Use common exercise names: Bench Press, Incline Press, Lat Pulldown, Barbell Squat, Leg Press, Shoulder Press, Bicep Curl, Tricep Pushdown, Cable Fly, Dumbbell Row, Seated Row, Face Pull, Leg Curl, Leg Extension, Hip Thrust, Romanian Deadlift, Split Squat, Lunges, Dead Bug, Plank, Push-up, Mountain Climber, Russian Twist, Calf Raise, Goblet Squat`;

  const user = profileContext(profile);
  const result = await chatJson<AIWorkoutResponse>(system, user, 0.4);
  if (!result?.exercises?.length) return null;

  return {
    title: result.title,
    split: result.split,
    estimatedMinutes: result.estimatedMinutes || 48,
    recoveryNote: result.recoveryNote,
    focus: result.focus?.slice(0, 3) ?? [],
    exercises: result.exercises.slice(0, 6).map((ex): WorkoutExercise => ({
      id: ex.id || ex.name.toLowerCase().replace(/\s+/g, "-"),
      mediaId: pickMediaId(ex.name),
      name: ex.name,
      target: ex.target,
      why: ex.why,
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: ex.restSeconds || 90,
      tempo: ex.tempo || "2-1-1",
      startingLoad: {
        mode: (["bodyweight", "dumbbell", "machine", "cable", "barbell"].includes(ex.startingLoad?.mode) ? ex.startingLoad.mode : "machine") as WorkoutExercise["startingLoad"]["mode"],
        rangeLabel: ex.startingLoad?.rangeLabel ?? "Start light",
        note: ex.startingLoad?.note ?? "Focus on form first.",
      },
      confidencePrompt: "How did the final clean set feel?",
      instruction: {
        setup: ex.instruction?.setup ?? "Set up with good posture.",
        cues: ex.instruction?.cues?.slice(0, 4) ?? ["Control the movement"],
        mistakes: ex.instruction?.mistakes?.slice(0, 3) ?? ["Rushing reps"],
        painResponse: ex.instruction?.painResponse ?? "Stop and switch to an easier variation if anything feels sharp.",
      },
      homeSubstitute: {
        label: ex.homeSubstitute?.label ?? "Bodyweight variation",
        reason: ex.homeSubstitute?.reason ?? "Same movement pattern at home.",
      },
    })),
  };
}

// ─── Meal Slots ─────────────────────────────────────────────────────────────

type AIMealSlotResponse = {
  slots: Array<{
    id: string;
    label: string;
    time: string;
    note: string;
    primary: { title: string; subtitle: string; proteinGrams: number };
    backup: { title: string; subtitle: string; proteinGrams: number };
  }>;
};

export async function aiGenerateMealSlots(profile: UserProfile, proteinTarget: number): Promise<DailyMealSlot[] | null> {
  const system = `You are a sports nutritionist creating a daily Indian vegetarian meal plan.
Return a JSON object:
{
  "slots": [
    {
      "id": "breakfast|lunch|evening|dinner",
      "label": "Meal Name",
      "time": "display time like 8:00 AM",
      "note": "short coaching note about this meal's purpose",
      "primary": { "title": "meal name", "subtitle": "short description", "proteinGrams": number },
      "backup": { "title": "alternative meal", "subtitle": "short description", "proteinGrams": number }
    }
  ]
}

Rules:
- Generate exactly 6 meal slots: breakfast, lunch, pre_workout, post_workout, evening_snack, dinner
- All meals must be Indian vegetarian with dairy allowed
- Total protein across all primary meals should approximate ${proteinTarget}g
- Use the user's actual meal timing from their schedule
- Respect their likes and avoids
- Each meal should have one main option and one backup
- Make meals DIFFERENT from typical suggestions — vary each day, don't repeat the same breakfast every time
- Keep descriptions short, in simple English, with actual portions (grams, cups, pieces)
- Include what to eat and how much (e.g. "200g curd + 1 banana + handful roasted chana")
- Protein values must be realistic for the portion size`;

  const user = profileContext(profile);
  const result = await chatJson<AIMealSlotResponse>(system, user);
  if (!result?.slots?.length) return null;

  return result.slots.slice(0, 4).map((slot): DailyMealSlot => ({
    id: slot.id,
    label: slot.label,
    time: slot.time,
    note: slot.note,
    primary: {
      title: slot.primary?.title ?? "Protein-rich meal",
      subtitle: slot.primary?.subtitle ?? "",
      proteinGrams: slot.primary?.proteinGrams ?? 20,
    },
    backup: {
      title: slot.backup?.title ?? "Quick alternative",
      subtitle: slot.backup?.subtitle ?? "",
      proteinGrams: slot.backup?.proteinGrams ?? 15,
    },
  }));
}

// ─── Coach Summary ──────────────────────────────────────────────────────────

export async function aiGenerateCoachSummary(profile: UserProfile): Promise<DailyCoachSummary | null> {
  const system = `You are a warm, motivating fitness coach for an Indian household.
Return JSON:
{
  "greeting": "short personal greeting with their name",
  "headline": "one sentence about their current focus and goal progress",
  "nextBestAction": "one clear action they should do next tonight",
  "beginnerReminder": "one calm, encouraging reminder for someone at their level"
}
Keep it brief, warm, and practical. No generic fluff.`;

  const user = profileContext(profile);
  return chatJson<DailyCoachSummary>(system, user);
}

// ─── Tracking Notes ─────────────────────────────────────────────────────────

export async function aiGenerateTrackingNotes(profile: UserProfile, proteinTarget: number, hydrationTarget: number): Promise<TrackingNote[] | null> {
  const system = `You are a sports nutritionist explaining daily targets to a user.
Return JSON:
{
  "notes": [
    { "title": "short title", "body": "1-2 sentence explanation" }
  ]
}
Generate exactly 3 notes explaining their protein target (${proteinTarget}g), hydration target (${hydrationTarget}ml), and recovery guidance. Be specific to their goal and body stats. Keep it brief.`;

  const user = profileContext(profile);
  const result = await chatJson<{ notes: TrackingNote[] }>(system, user);
  return result?.notes?.slice(0, 3) ?? null;
}

// ─── Household Insights ─────────────────────────────────────────────────────

export async function aiGenerateHouseholdInsights(
  householdProfiles: Record<HouseholdMemberId, UserProfile>,
  proteinTargets: Record<HouseholdMemberId, number>,
): Promise<HouseholdInsight[] | null> {
  const members = Object.entries(householdProfiles) as [HouseholdMemberId, UserProfile][];
  const context = members
    .map(([id, p]) => `${id}: ${p.displayName}, goal=${p.goal.replace(/_/g, " ")}, protein=${proteinTargets[id]}g`)
    .join("\n");

  const system = `You are a household nutrition coach. For each family member, explain what they need from the shared dinner in one sentence.
Return JSON:
{
  "insights": [
    { "memberId": "member_you|member_brother|member_sister_in_law", "dinnerNeed": "one sentence about what this person needs from dinner" }
  ]
}
Generate one insight per member. Be specific about protein and portion needs.`;

  const user = context;
  const result = await chatJson<{ insights: Array<{ memberId: HouseholdMemberId; dinnerNeed: string }> }>(system, user);
  if (!result?.insights?.length) return null;

  return members.map(([id, p]): HouseholdInsight => {
    const insight = result.insights.find((i) => i.memberId === id);
    return {
      memberId: id,
      memberLabel: p.shortLabel,
      goalLabel: p.goal.replace(/_/g, " "),
      proteinTarget: proteinTargets[id],
      dinnerNeed: insight?.dinnerNeed ?? "Needs a balanced protein share at dinner.",
    };
  });
}

// ─── Load Hint ──────────────────────────────────────────────────────────────

export async function aiGenerateLoadHint(
  profile: UserProfile,
  exerciseName: string,
  signal: string,
  currentRange: string,
): Promise<string | null> {
  const system = `You are a gym coach giving a one-sentence next-session load recommendation.
Return JSON: { "hint": "one sentence advice" }
The user just did "${exerciseName}" and reported "${signal}" at ${currentRange}. Their confidence is ${profile.confidenceLevel}/5 and experience is "${profile.experience}". Give specific, safe advice for next time.`;

  const user = `Exercise: ${exerciseName}\nSignal: ${signal}\nCurrent range: ${currentRange}`;
  const result = await chatJson<{ hint: string }>(system, user, 0.5);
  return result?.hint ?? null;
}

