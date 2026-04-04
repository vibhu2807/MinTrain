"use client";

import { ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ActivityLevel,
  EquipmentAccess,
  ExperienceLevel,
  GoalType,
  SpiceComfort,
  TimelinePace,
  UserProfile,
} from "@/lib/types";

type StepKey = "basics" | "goal" | "routine" | "food";

type FormState = {
  displayName: string;
  age: number;
  sex: UserProfile["sex"];
  heightCm: number;
  weightKg: number;
  goal: GoalType;
  targetDate: string;
  goalDescription: string;
  timelinePace: TimelinePace;
  activityLevel: ActivityLevel;
  experience: ExperienceLevel;
  confidenceLevel: UserProfile["confidenceLevel"];
  equipmentAccess: EquipmentAccess;
  trainingDaysPerWeek: number;
  preferredWorkoutTime: string;
  wakeTime: string;
  breakfastTime: string;
  lunchTime: string;
  snackTime: string;
  dinnerTime: string;
  sleepTime: string;
  spiceComfort: SpiceComfort;
  likesText: string;
  avoidsText: string;
  limitationsText: string;
  notes: string;
};

const stepOrder: { key: StepKey; eyebrow: string; title: string; description: string }[] = [
  {
    key: "basics",
    eyebrow: "Step 1",
    title: "About you",
    description: "Basic details so we can calculate your protein, water, and workout plan.",
  },
  {
    key: "goal",
    eyebrow: "Step 2",
    title: "Your goal",
    description: "Tell us what you want to achieve. Be as specific as you like.",
  },
  {
    key: "routine",
    eyebrow: "Step 3",
    title: "Your schedule",
    description: "When do you eat and sleep? We'll plan meals and gym around your real day.",
  },
  {
    key: "food",
    eyebrow: "Step 4",
    title: "Food & body",
    description: "What do you like eating? Any injuries we should know about?",
  },
];

const goalChoices: { value: GoalType; label: string }[] = [
  { value: "build_muscle", label: "Build muscle" },
  { value: "fat_loss", label: "Lose fat" },
  { value: "recomp", label: "Get fit again" },
  { value: "strength_confidence", label: "Get stronger" },
];

const activityChoices: { value: ActivityLevel; label: string }[] = [
  { value: "light", label: "Mostly sitting" },
  { value: "moderate", label: "Normal active day" },
  { value: "active", label: "Quite active day" },
];

const experienceChoices: { value: ExperienceLevel; label: string }[] = [
  { value: "new", label: "New to gym" },
  { value: "returning", label: "Returning" },
];

const equipmentChoices: { value: EquipmentAccess; label: string }[] = [
  { value: "gym", label: "Gym only" },
  { value: "mixed", label: "Gym + home" },
  { value: "home", label: "Home only" },
];

const spiceChoices: { value: SpiceComfort; label: string }[] = [
  { value: "mild", label: "Mild" },
  { value: "balanced", label: "Balanced" },
  { value: "bold", label: "Bold" },
];

function splitEntries(value: string) {
  return value
    .split(/[\n,]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function OnboardingWizard({ initialProfile }: { initialProfile: UserProfile }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState(
    initialProfile.onboardingComplete
      ? "Update your details and we'll rebuild your plan."
      : "Fill this out once. AI will build your personal plan from these details.",
  );
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormState>({
    displayName: initialProfile.displayName,
    age: initialProfile.age,
    sex: initialProfile.sex,
    heightCm: initialProfile.heightCm,
    weightKg: initialProfile.weightKg,
    goal: initialProfile.goal,
    targetDate: initialProfile.targetDate,
    goalDescription: initialProfile.notes || "",
    timelinePace: initialProfile.timelinePace,
    activityLevel: initialProfile.activityLevel,
    experience: initialProfile.experience,
    confidenceLevel: initialProfile.confidenceLevel,
    equipmentAccess: initialProfile.equipmentAccess,
    trainingDaysPerWeek: initialProfile.trainingDaysPerWeek,
    preferredWorkoutTime: initialProfile.preferredWorkoutTime,
    wakeTime: initialProfile.wakeTime,
    breakfastTime: initialProfile.breakfastTime,
    lunchTime: initialProfile.lunchTime,
    snackTime: initialProfile.snackTime,
    dinnerTime: initialProfile.dinnerTime,
    sleepTime: initialProfile.sleepTime,
    spiceComfort: initialProfile.spiceComfort,
    likesText: initialProfile.likes.join(", "),
    avoidsText: initialProfile.avoids.join(", "),
    limitationsText: initialProfile.limitations.join(", "),
    notes: initialProfile.notes,
  });

  const payload = useMemo(
    () => ({
      displayName: form.displayName,
      age: form.age,
      sex: form.sex,
      heightCm: form.heightCm,
      weightKg: form.weightKg,
      goal: form.goal,
      targetDate: form.targetDate,
      timelinePace: form.timelinePace,
      notes: form.goalDescription ? `${form.goalDescription}${form.notes ? `. ${form.notes}` : ""}` : form.notes,
      activityLevel: form.activityLevel,
      experience: form.experience,
      confidenceLevel: form.confidenceLevel,
      equipmentAccess: form.equipmentAccess,
      trainingDaysPerWeek: form.trainingDaysPerWeek,
      preferredWorkoutTime: form.preferredWorkoutTime,
      wakeTime: form.wakeTime,
      breakfastTime: form.breakfastTime,
      lunchTime: form.lunchTime,
      snackTime: form.snackTime,
      dinnerTime: form.dinnerTime,
      sleepTime: form.sleepTime,
      spiceComfort: form.spiceComfort,
      likes: splitEntries(form.likesText),
      avoids: splitEntries(form.avoidsText),
      limitations: splitEntries(form.limitationsText),
    }),
    [form],
  );

  const stepValid = [
    form.displayName.trim().length >= 2 && form.age >= 16 && form.heightCm >= 135 && form.weightKg >= 35,
    form.targetDate.length === 10 && form.trainingDaysPerWeek >= 2 && form.preferredWorkoutTime.length === 5,
    Boolean(form.wakeTime && form.breakfastTime && form.lunchTime && form.snackTime && form.dinnerTime && form.sleepTime),
    true,
  ];

  const activeStep = stepOrder[stepIndex];

  const moveNext = () => {
    if (!stepValid[stepIndex]) {
      setStatus("Fill in the missing fields on this step first.");
      return;
    }

    setStatus("Good. Keep going.");
    setStepIndex((current) => Math.min(current + 1, stepOrder.length - 1));
  };

  const moveBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
    setStatus("You can change anything before saving.");
  };

  const submit = async () => {
    if (!stepValid[stepIndex]) {
      setStatus("Finish the required details on this step first.");
      return;
    }

    setLoading(true);
    setStatus("Building your personal plan... this takes a few seconds.");

    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(data.error ?? "Could not save the onboarding profile.");
        return;
      }

      setStatus("Done! Opening your plan...");
      router.replace("/");
      router.refresh();
    } catch {
      setStatus("Could not reach the local MinTrain server. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 rounded-[2.2rem] border border-white/8 bg-[var(--surface-raised)] p-5 text-[var(--text)]">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-[var(--surface)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text)]">
          personal setup
        </span>
        <span className="rounded-full border border-[var(--accent)]/20 bg-[var(--surface-active)] px-3 py-1 text-[11px] font-semibold text-[var(--accent)]">
          {stepIndex + 1} / {stepOrder.length}
        </span>
      </div>

      <div className="grid gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">{activeStep.eyebrow}</p>
        <h1 className="font-[var(--font-display)] text-[2.5rem] leading-[0.95] tracking-[-0.04em] text-[var(--text)]">
          {activeStep.title}
        </h1>
        <p className="text-[15px] leading-6 text-[var(--text-secondary)]">{activeStep.description}</p>
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-[1.5rem] border border-white/8 bg-[var(--surface)] p-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        {stepOrder.map((step, index) => (
          <div
            key={step.key}
            className={[
              "rounded-[1rem] px-2 py-3",
              index === stepIndex ? "bg-[var(--accent)] text-[var(--bg)]" : index < stepIndex ? "bg-[var(--surface-active)] text-[var(--accent)]" : "bg-transparent",
            ].join(" ")}
          >
            {index + 1}
          </div>
        ))}
      </div>

      {activeStep.key === "basics" ? (
        <section className="grid gap-4">
          <Field label="Display name">
            <input
              className="input-shell"
              value={form.displayName}
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              placeholder="How should MinTrain address you?"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <input
                className="input-shell"
                type="number"
                min="16"
                max="80"
                value={form.age}
                onChange={(event) => setForm((current) => ({ ...current, age: Number(event.target.value) || current.age }))}
              />
            </Field>
            <Field label="Sex">
              <select
                className="input-shell"
                value={form.sex}
                onChange={(event) => setForm((current) => ({ ...current, sex: event.target.value as UserProfile["sex"] }))}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Height (cm)">
              <input
                className="input-shell"
                type="number"
                min="135"
                max="220"
                value={form.heightCm}
                onChange={(event) => setForm((current) => ({ ...current, heightCm: Number(event.target.value) || current.heightCm }))}
              />
            </Field>
            <Field label="Weight (kg)">
              <input
                className="input-shell"
                type="number"
                min="35"
                max="200"
                value={form.weightKg}
                onChange={(event) => setForm((current) => ({ ...current, weightKg: Number(event.target.value) || current.weightKg }))}
              />
            </Field>
          </div>
        </section>
      ) : null}

      {activeStep.key === "goal" ? (
        <section className="grid gap-4">
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-[var(--text)]">What do you want?</p>
            <div className="grid grid-cols-2 gap-2">
              {goalChoices.map((g) => (
                <button key={g.value} type="button" onClick={() => setForm((c) => ({ ...c, goal: g.value }))} className={["rounded-xl px-3 py-3 text-sm font-semibold transition", form.goal === g.value ? "bg-[var(--accent)] text-[var(--bg)]" : "border border-white/8 bg-[var(--surface)] text-[var(--text)]"].join(" ")}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Describe your goal in your own words">
            <textarea
              className="input-shell min-h-[100px] resize-none"
              value={form.goalDescription}
              onChange={(e) => setForm((c) => ({ ...c, goalDescription: e.target.value }))}
              placeholder="Example: I want to build muscle and get abs in 6 months. I'm skinny right now and never been to gym before."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="By when?">
              <input className="input-shell" type="date" min={todayIso()} value={form.targetDate} onChange={(e) => setForm((c) => ({ ...c, targetDate: e.target.value }))} />
            </Field>
            <Field label="Workout time">
              <input className="input-shell" type="time" value={form.preferredWorkoutTime} onChange={(e) => setForm((c) => ({ ...c, preferredWorkoutTime: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Days/week you can train">
              <input className="input-shell" type="number" min="2" max="7" value={form.trainingDaysPerWeek} onChange={(e) => setForm((c) => ({ ...c, trainingDaysPerWeek: Number(e.target.value) || c.trainingDaysPerWeek }))} />
            </Field>
            <Field label="Gym confidence (1=new, 5=pro)">
              <input className="input-shell" type="number" min="1" max="5" value={form.confidenceLevel} onChange={(e) => setForm((c) => ({ ...c, confidenceLevel: (Number(e.target.value) || c.confidenceLevel) as UserProfile["confidenceLevel"] }))} />
            </Field>
          </div>

          <SimpleChoiceRow<ActivityLevel> label="How active is your day?" value={form.activityLevel} options={activityChoices} onChange={(v) => setForm((c) => ({ ...c, activityLevel: v }))} />
          <SimpleChoiceRow<ExperienceLevel> label="Gym experience" value={form.experience} options={experienceChoices} onChange={(v) => setForm((c) => ({ ...c, experience: v }))} />
          <SimpleChoiceRow<EquipmentAccess> label="Equipment" value={form.equipmentAccess} options={equipmentChoices} onChange={(v) => setForm((c) => ({ ...c, equipmentAccess: v }))} />
        </section>
      ) : null}

      {activeStep.key === "routine" ? (
        <section className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Wake time">
              <input className="input-shell" type="time" value={form.wakeTime} onChange={(event) => setForm((current) => ({ ...current, wakeTime: event.target.value }))} />
            </Field>
            <Field label="Sleep time">
              <input className="input-shell" type="time" value={form.sleepTime} onChange={(event) => setForm((current) => ({ ...current, sleepTime: event.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Breakfast">
              <input className="input-shell" type="time" value={form.breakfastTime} onChange={(event) => setForm((current) => ({ ...current, breakfastTime: event.target.value }))} />
            </Field>
            <Field label="Lunch">
              <input className="input-shell" type="time" value={form.lunchTime} onChange={(event) => setForm((current) => ({ ...current, lunchTime: event.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Evening snack / pre-gym">
              <input className="input-shell" type="time" value={form.snackTime} onChange={(event) => setForm((current) => ({ ...current, snackTime: event.target.value }))} />
            </Field>
            <Field label="Dinner">
              <input className="input-shell" type="time" value={form.dinnerTime} onChange={(event) => setForm((current) => ({ ...current, dinnerTime: event.target.value }))} />
            </Field>
          </div>

          <div className="rounded-[1.5rem] border border-white/8 bg-[var(--surface)] px-4 py-4 text-sm leading-6 text-[var(--text)]">
            We use these times to plan your meals around your actual day.
          </div>
        </section>
      ) : null}

      {activeStep.key === "food" ? (
        <section className="grid gap-4">
          <SimpleChoiceRow<SpiceComfort>
            label="Spice comfort"
            value={form.spiceComfort}
            options={spiceChoices}
            onChange={(value) => setForm((current) => ({ ...current, spiceComfort: value }))}
          />

          <Field label="Foods you like">
            <textarea
              className="input-shell min-h-[104px] resize-none"
              value={form.likesText}
              onChange={(event) => setForm((current) => ({ ...current, likesText: event.target.value }))}
              placeholder="paneer, curd, wraps, Gujarati shaak"
            />
          </Field>

          <Field label="Foods to avoid or keep lighter">
            <textarea
              className="input-shell min-h-[96px] resize-none"
              value={form.avoidsText}
              onChange={(event) => setForm((current) => ({ ...current, avoidsText: event.target.value }))}
              placeholder="very oily dinners, heavy cream sauces"
            />
          </Field>

          <Field label="Injuries, discomfort, or movement limits">
            <textarea
              className="input-shell min-h-[96px] resize-none"
              value={form.limitationsText}
              onChange={(event) => setForm((current) => ({ ...current, limitationsText: event.target.value }))}
              placeholder="knee discomfort, shoulder tightness, none"
            />
          </Field>

          <Field label="Extra notes">
            <textarea
              className="input-shell min-h-[110px] resize-none"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Anything MinTrain should remember about confidence, schedule, or food habits."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 rounded-[1.6rem] border border-white/8 bg-[var(--surface)] p-4 text-sm text-[var(--text)]">
            <SummaryCell label="Goal" value={goalChoices.find((choice) => choice.value === form.goal)?.label ?? form.goal} />
            <SummaryCell label="Target" value={form.targetDate} />
            <SummaryCell label="Workout" value={form.preferredWorkoutTime} />
            <SummaryCell label="Days" value={`${form.trainingDaysPerWeek} / week`} />
          </div>
        </section>
      ) : null}

      <div className="rounded-[1.5rem] border border-white/10 bg-[var(--surface)] px-4 py-4 text-sm leading-6 text-[var(--text)]">
        {status}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={moveBack}
          disabled={stepIndex === 0 || loading}
          className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)]/35 hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        {stepIndex < stepOrder.length - 1 ? (
          <button
            type="button"
            onClick={moveNext}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:bg-[var(--accent-hover)]"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70"
          >
            {loading ? "Saving..." : initialProfile.onboardingComplete ? "Save setup" : "Build my plan"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm text-[var(--text)]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SimpleChoiceRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "rounded-[1.2rem] px-3 py-3 text-sm font-semibold transition",
              option.value === value ? "bg-[var(--accent)] text-[var(--bg)]" : "border border-white/8 bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]/28",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}
