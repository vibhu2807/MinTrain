"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { ExerciseVisual } from "@/components/exercise-visual";
import { DashboardBundle, DifficultySignal, EquipmentAccess, GoalType } from "@/lib/types";

type View = "home" | "workout" | "dinner" | "settings";

export function MintrainDashboard({ initialData }: { initialData: DashboardBundle }) {
  const [view, setView] = useState<View>("home");
  const [bundle, setBundle] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [exIdx, setExIdx] = useState(() => {
    const i = initialData.workoutPlan.exercises.findIndex((e) => !initialData.tracking.exerciseFeedback[e.id]);
    return i >= 0 ? i : 0;
  });
  const [feedbackMap, setFeedbackMap] = useState<Record<string, DifficultySignal>>(initialData.tracking.exerciseFeedback);
  const [loadHints, setLoadHints] = useState<Record<string, string>>(initialData.tracking.loadHints);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [draftProfile, setDraftProfile] = useState({
    weightKg: initialData.currentUser.weightKg,
    trainingDaysPerWeek: initialData.currentUser.trainingDaysPerWeek,
    confidenceLevel: initialData.currentUser.confidenceLevel,
    goal: initialData.currentUser.goal,
    equipmentAccess: initialData.currentUser.equipmentAccess,
  });

  const exercises = bundle.workoutPlan.exercises;
  const ex = exercises[exIdx] ?? exercises[0];
  const doneCount = exercises.filter((e) => feedbackMap[e.id]).length;
  const allDone = doneCount === exercises.length && exercises.length > 0;
  const profileSnapshot = { ...bundle.currentUser, ...draftProfile };

  // Midnight auto-refresh
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const t = setTimeout(() => window.location.reload(), midnight.getTime() - now.getTime());
    return () => clearTimeout(t);
  }, []);

  // ── Actions ──

  const regenerate = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/workouts/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profileSnapshot) });
      const p = (await res.json()) as { workoutPlan?: DashboardBundle["workoutPlan"]; summary?: DashboardBundle["summary"]; nutrition?: DashboardBundle["nutrition"]; kitchenCandidates?: DashboardBundle["kitchenCandidates"] };
      if (res.ok && p.workoutPlan) {
        setBundle((c) => ({ ...c, generatedAt: new Date().toISOString(), currentUser: { ...c.currentUser, ...profileSnapshot }, summary: p.summary ?? c.summary, nutrition: p.nutrition ?? c.nutrition, workoutPlan: p.workoutPlan!, kitchenCandidates: p.kitchenCandidates ?? c.kitchenCandidates }));
        setExIdx(0); setFeedbackMap({}); setLoadHints({});
      }
    } finally { setBusy(false); }
  };

  const chooseDinner = async (recipeId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/meals/select", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipeId }) });
      const p = (await res.json()) as { selection?: DashboardBundle["selectedDinner"] };
      if (res.ok && p.selection) { setBundle((c) => ({ ...c, selectedDinner: p.selection! })); setView("home"); }
    } finally { setBusy(false); }
  };

  const logExercise = async (signal: DifficultySignal) => {
    setBusy(true);
    try {
      const res = await fetch("/api/workouts/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exerciseId: ex.id, currentRange: ex.startingLoad.rangeLabel, signal }) });
      const p = (await res.json()) as { nextLoadMessage?: string; tracking?: DashboardBundle["tracking"] };
      if (res.ok && p.tracking) {
        setFeedbackMap(p.tracking.exerciseFeedback);
        setLoadHints(p.tracking.loadHints);
        const next = exercises.findIndex((e) => !p.tracking!.exerciseFeedback[e.id]);
        if (next >= 0) setExIdx(next);
      }
    } finally { setBusy(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((c) => [...c, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg }) });
      const p = (await res.json()) as { reply?: string };
      setChatMessages((c) => [...c, { role: "ai", text: p.reply ?? "Sorry, couldn't process that." }]);
    } catch { setChatMessages((c) => [...c, { role: "ai", text: "Connection error." }]); }
    finally { setChatLoading(false); }
  };

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.assign("/login"); };
  const onProfileSubmit = async (e: FormEvent) => { e.preventDefault(); await regenerate(); setView("home"); };

  return (
    <main className="min-h-dvh px-4 pb-20 pt-5">
      <div className="mx-auto max-w-[430px]">

        {/* ═══ HOME ═══ */}
        {view === "home" ? (
          <div className="grid gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-[var(--text)]">{bundle.summary.greeting}</h1>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{bundle.summary.headline}</p>
              </div>
              <div className="rounded-[var(--radius)] border border-[var(--accent-border)] bg-[var(--accent-subtle)] px-3 py-2 text-right">
                <p className="text-lg font-bold text-[var(--accent)]">{bundle.nutrition.proteinTargetGrams}g</p>
                <p className="text-[10px] text-[var(--text-secondary)]">protein today</p>
              </div>
            </div>

            {/* Meals */}
            <Card title="Eat today">
              {bundle.nutrition.mealSlots.map((slot, i) => (
                <div key={slot.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedMeal(expandedMeal === slot.id ? null : slot.id)}
                    className={["flex w-full items-center justify-between py-3 text-left transition", i < bundle.nutrition.mealSlots.length - 1 && expandedMeal !== slot.id ? "border-b border-[var(--border)]" : ""].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-raised)] text-xs text-[var(--text-muted)]">
                        {slot.time.split(" ")[0]?.split(":")[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">{slot.label}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{slot.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[var(--text)]">{slot.primary.title.length > 20 ? slot.primary.title.slice(0, 20) + "..." : slot.primary.title}</p>
                      <p className="text-[11px] font-medium text-[var(--accent)]">{slot.primary.proteinGrams}g</p>
                    </div>
                  </button>
                  {expandedMeal === slot.id ? (
                    <div className="mb-3 rounded-[var(--radius)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                      <p className="font-medium text-[var(--text)]">What to eat:</p>
                      <p className="mt-1">{slot.primary.subtitle}</p>
                      <div className="mt-2 flex items-center gap-2 border-t border-[var(--border)] pt-2">
                        <span className="text-[var(--text-muted)]">Or:</span>
                        <span>{slot.backup.title} ({slot.backup.proteinGrams}g)</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </Card>

            {/* Water */}
            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 text-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
              </div>
              <p className="text-sm text-[var(--text)]">
                Drink <span className="font-semibold">{(bundle.nutrition.hydrationTargetMl / 1000).toFixed(1)} litres</span> today
                <span className="ml-1 text-[var(--text-muted)]">({Math.round(bundle.nutrition.hydrationTargetMl / 250)} glasses)</span>
              </p>
            </div>

            {/* Workout */}
            <button
              type="button"
              onClick={() => setView("workout")}
              className="group flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left transition hover:border-[var(--accent-border)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Today&apos;s workout</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{exercises.length} exercises &middot; {doneCount} done</p>
              </div>
              <div className={["rounded-full px-4 py-2 text-xs font-semibold", allDone ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--accent)] text-[var(--bg)]"].join(" ")}>
                {allDone ? "Done" : doneCount > 0 ? "Continue" : "Start"}
              </div>
            </button>

            {/* Dinner */}
            <button
              type="button"
              onClick={() => setView("dinner")}
              className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition hover:border-[var(--accent-border)]"
            >
              <div>
                <p className="text-[11px] text-[var(--text-muted)]">Tonight&apos;s dinner</p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">{bundle.selectedDinner.selectedMealName}</p>
              </div>
              <span className="text-xs font-medium text-[var(--accent)]">Change</span>
            </button>

            {/* Refresh plan */}
            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={busy}
              className="rounded-[var(--radius)] border border-[var(--border)] py-2.5 text-xs font-medium text-[var(--text-muted)] transition hover:text-[var(--text-secondary)] disabled:opacity-40"
            >
              {busy ? "Refreshing plan..." : "Refresh my plan"}
            </button>
          </div>
        ) : null}

        {/* ═══ WORKOUT ═══ */}
        {view === "workout" ? (
          <div className="grid gap-3">
            {/* Top bar */}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setView("home")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm">&larr;</button>
              <div className="flex flex-1 gap-1">
                {exercises.map((e, i) => (
                  <button key={e.id} type="button" onClick={() => setExIdx(i)} className={["h-1.5 flex-1 rounded-full transition-all", exIdx === i ? "bg-[var(--accent)]" : feedbackMap[e.id] ? "bg-[var(--accent)]/30" : "bg-[var(--border)]"].join(" ")} />
                ))}
              </div>
              <span className="text-xs font-medium text-[var(--text-secondary)]">{exIdx + 1}/{exercises.length}</span>
            </div>

            {/* GIF */}
            <ExerciseVisual title={ex.name} />

            {/* Info */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <h3 className="text-lg font-semibold text-[var(--text)]">{ex.name}</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{ex.startingLoad.mode} &middot; {ex.target}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Stat label="Sets" value={ex.sets} />
                <Stat label="Reps" value={ex.reps} />
                <Stat label="Weight" value={ex.startingLoad.rangeLabel} />
              </div>
            </div>

            {/* Feedback */}
            {feedbackMap[ex.id] ? (
              <div className="rounded-[var(--radius)] border border-[var(--accent-border)] bg-[var(--surface-active)] px-4 py-3 text-center">
                <p className="text-sm font-medium text-[var(--accent)]">{feedbackMap[ex.id]?.replace(/_/g, " ")}</p>
                {loadHints[ex.id] ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{loadHints[ex.id]}</p> : null}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {([["Easy", "too_easy"], ["Good", "good_challenge"], ["Heavy", "too_heavy"]] as const).map(([label, val]) => (
                  <button key={val} type="button" onClick={() => void logExercise(val)} disabled={busy}
                    className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent-border)] disabled:opacity-40">
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Nav */}
            <div className="flex gap-2">
              <button type="button" onClick={() => setExIdx((c) => Math.max(0, c - 1))} disabled={exIdx === 0}
                className="flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-2.5 text-sm font-medium text-[var(--text-secondary)] disabled:opacity-20">Prev</button>
              <button type="button" onClick={() => setExIdx((c) => Math.min(c + 1, exercises.length - 1))} disabled={exIdx >= exercises.length - 1}
                className="flex-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] py-2.5 text-sm font-medium text-[var(--text-secondary)] disabled:opacity-20">Next</button>
            </div>

            {/* Tips */}
            <details className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
              <summary className="cursor-pointer list-none text-xs font-medium text-[var(--text-secondary)]">How to do this exercise</summary>
              <div className="mt-2 grid gap-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                <p>{ex.instruction.setup}</p>
                {ex.instruction.cues.map((c) => <p key={c}>&bull; {c}</p>)}
                <p className="mt-1 text-[var(--text-muted)]">Avoid: {ex.instruction.mistakes.join(", ")}</p>
              </div>
            </details>
          </div>
        ) : null}

        {/* ═══ DINNER ═══ */}
        {view === "dinner" ? (
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setView("home")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm">&larr;</button>
              <h2 className="text-base font-semibold text-[var(--text)]">Pick tonight&apos;s dinner</h2>
            </div>

            {bundle.kitchenCandidates.map((c) => {
              const picked = bundle.selectedDinner.selectedMealId === c.recipe.id;
              return (
                <div key={c.recipe.id} className={["rounded-[var(--radius-xl)] border p-4 transition", picked ? "border-[var(--accent-border)] bg-[var(--surface-active)]" : "border-[var(--border)] bg-[var(--surface)]"].join(" ")}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text)]">{c.recipe.name}</h3>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{c.recipe.proteinGrams}g protein &middot; {c.recipe.prepMinutes} min</p>
                    </div>
                    <button type="button" onClick={() => void chooseDinner(c.recipe.id)} disabled={busy}
                      className={["shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition", picked ? "border border-[var(--accent-border)] text-[var(--accent)]" : "bg-[var(--accent)] text-[var(--bg)]"].join(" ")}>
                      {picked ? "Picked" : "Pick"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{c.reason}</p>

                  <button type="button" onClick={() => setExpandedRecipe(expandedRecipe === c.recipe.id ? null : c.recipe.id)} className="mt-2 text-xs font-medium text-[var(--accent)]">
                    {expandedRecipe === c.recipe.id ? "Hide recipe" : "See full recipe"}
                  </button>

                  {expandedRecipe === c.recipe.id ? (
                    <div className="mt-3 grid gap-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-secondary)]">
                      <div>
                        <p className="font-medium text-[var(--text)]">You will need:</p>
                        <ul className="mt-1.5 grid gap-1">{c.recipe.ingredients.map((ing) => <li key={ing}>&bull; {ing}</li>)}</ul>
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text)]">How to make it:</p>
                        <ol className="mt-1.5 grid gap-1.5">{c.recipe.method.map((s, i) => <li key={s}>{i + 1}. {s}</li>)}</ol>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* ═══ SETTINGS ═══ */}
        {view === "settings" ? (
          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setView("home")} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-sm">&larr;</button>
              <h2 className="text-base font-semibold text-[var(--text)]">Settings</h2>
            </div>

            <form onSubmit={onProfileSubmit} className="grid gap-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Weight (kg)">
                  <input type="number" min={35} max={200} value={draftProfile.weightKg} onChange={(e) => setDraftProfile((c) => ({ ...c, weightKg: Number(e.target.value) || c.weightKg }))} className="input-shell" />
                </Field>
                <Field label="Days/week">
                  <input type="number" min={2} max={7} value={draftProfile.trainingDaysPerWeek} onChange={(e) => setDraftProfile((c) => ({ ...c, trainingDaysPerWeek: Number(e.target.value) || c.trainingDaysPerWeek }))} className="input-shell" />
                </Field>
                <Field label="Goal">
                  <select value={draftProfile.goal} onChange={(e) => setDraftProfile((c) => ({ ...c, goal: e.target.value as GoalType }))} className="input-shell">
                    <option value="build_muscle">Build muscle</option>
                    <option value="fat_loss">Lose fat</option>
                    <option value="recomp">Get fit again</option>
                    <option value="strength_confidence">Get stronger</option>
                  </select>
                </Field>
                <Field label="Equipment">
                  <select value={draftProfile.equipmentAccess} onChange={(e) => setDraftProfile((c) => ({ ...c, equipmentAccess: e.target.value as EquipmentAccess }))} className="input-shell">
                    <option value="gym">Gym only</option>
                    <option value="home">Home only</option>
                    <option value="mixed">Gym + home</option>
                  </select>
                </Field>
              </div>

              <div>
                <p className="mb-2 text-xs text-[var(--text-muted)]">Gym confidence (1 = beginner, 5 = experienced)</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((l) => (
                    <button key={l} type="button" onClick={() => setDraftProfile((c) => ({ ...c, confidenceLevel: l as 1 | 2 | 3 | 4 | 5 }))}
                      className={["flex-1 rounded-[var(--radius)] py-2 text-xs font-semibold transition", draftProfile.confidenceLevel === l ? "bg-[var(--accent)] text-[var(--bg)]" : "border border-[var(--border)] text-[var(--text-secondary)]"].join(" ")}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={busy} className="rounded-[var(--radius)] bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50">
                {busy ? "Saving..." : "Save and update my plan"}
              </button>
            </form>

            <button type="button" onClick={() => window.location.assign("/onboarding")} className="rounded-[var(--radius)] border border-[var(--border)] py-3 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-hover)]">
              Change full profile
            </button>
            <button type="button" onClick={() => void logout()} className="rounded-[var(--radius)] border border-[var(--border)] py-3 text-xs font-medium text-[var(--danger)]/60 transition hover:text-[var(--danger)]">
              Log out
            </button>

            <p className="text-center text-[10px] text-[var(--text-muted)] pt-2">Made by Mintellion</p>
          </div>
        ) : null}
      </div>

      {/* ═══ AI CHAT ═══ */}
      {chatOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] rounded-t-[1.5rem] border-t border-[var(--border)] bg-[var(--bg)] p-4 shadow-[0_-20px_60px_rgba(0,0,0,0.6)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text)]">Ask MinTrain</h3>
            <button type="button" onClick={() => setChatOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)]">&times;</button>
          </div>
          <div className="max-h-[40vh] overflow-y-auto space-y-2">
            {chatMessages.length === 0 ? <p className="text-xs text-[var(--text-muted)] text-center py-6">Ask about your meals, workout, or anything fitness related.</p> : null}
            {chatMessages.map((m, i) => (
              <div key={i} className={["rounded-[var(--radius)] px-3 py-2.5 text-sm leading-relaxed", m.role === "user" ? "bg-[var(--surface-active)] text-[var(--text)] ml-12" : "bg-[var(--surface)] text-[var(--text-secondary)] mr-12"].join(" ")}>{m.text}</div>
            ))}
            {chatLoading ? <div className="skeleton h-10 w-3/4 mr-12" /> : null}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void sendChat(); }} className="mt-3 flex gap-2">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="What should I eat now?" className="input-shell flex-1" />
            <button type="submit" disabled={chatLoading} className="rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--bg)] disabled:opacity-50">Send</button>
          </form>
        </div>
      ) : null}

      {/* ═══ NAV ═══ */}
      <nav className="fixed bottom-0 left-1/2 z-40 w-[min(100vw,430px)] -translate-x-1/2 border-t border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-xl">
        <div className="flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <NavBtn icon="H" label="Home" active={view === "home"} onClick={() => setView("home")} />
          <NavBtn icon="W" label="Workout" active={view === "workout"} onClick={() => setView("workout")} />
          <button type="button" onClick={() => setChatOpen((c) => !c)}
            className={["flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition", chatOpen ? "text-[var(--accent)]" : "text-[var(--text-muted)]"].join(" ")}>
            <span className="text-base">AI</span>
            <span>Chat</span>
          </button>
          <NavBtn icon="S" label="Settings" active={view === "settings"} onClick={() => setView("settings")} />
        </div>
      </nav>
    </main>
  );
}

// ── Components ──

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">{title}</p>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] bg-[var(--surface-raised)] px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={["flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition", active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"].join(" ")}>
      <span className={["text-base font-bold transition", active ? "text-[var(--accent)]" : ""].join(" ")}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-xs text-[var(--text-secondary)]"><span>{label}</span>{children}</label>;
}
