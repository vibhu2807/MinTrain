import { NextResponse } from "next/server";
import OpenAI from "openai";

import { buildDashboardBundleFromHousehold } from "@/lib/engine";
import { ensureProfile, getAllProfiles, getKitchenState, getTracking, resolveDinnerSelection } from "@/lib/household-store";
import { getSession } from "@/lib/session";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { message?: string } | null;
  if (!body?.message?.trim()) return NextResponse.json({ error: "Message required." }, { status: 400 });

  const profile = await ensureProfile(session.memberId);
  const profiles = await getAllProfiles();
  const kitchen = await getKitchenState();
  const dinner = resolveDinnerSelection(profiles, kitchen);
  const tracking = await getTracking(session.memberId);
  const bundle = buildDashboardBundleFromHousehold(session.memberId, profiles, dinner, tracking);

  const mealContext = bundle.nutrition.mealSlots
    .map((s) => `${s.label} (${s.time}): ${s.primary.title} — ${s.primary.subtitle} (${s.primary.proteinGrams}g protein)`)
    .join("\n");

  const workoutContext = bundle.workoutPlan.exercises
    .map((e, i) => `${i + 1}. ${e.name} — ${e.sets}, ${e.reps}, ${e.startingLoad.rangeLabel}`)
    .join("\n");

  const systemPrompt = `You are MinTrain, a personal fitness and food coach for an Indian vegetarian household. Answer in simple English, 2-3 sentences max. Be specific to this user's actual plan.

USER: ${profile.displayName}, ${profile.age}yo ${profile.sex}, ${profile.weightKg}kg
Goal: ${profile.goal.replace(/_/g, " ")}
Protein target: ${bundle.nutrition.proteinTargetGrams}g | Water: ${bundle.nutrition.hydrationTargetMl}ml

TODAY'S MEALS:
${mealContext}

DINNER: ${dinner.selectedMealName}

TODAY'S WORKOUT (${bundle.workoutPlan.title}):
${workoutContext}

Likes: ${profile.likes.join(", ")}. Avoids: ${profile.avoids.join(", ")}. Spice: ${profile.spiceComfort}.

Answer from the data above. Don't make up different meals. Keep answers short.`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 250,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: body.message },
      ],
    });
    return NextResponse.json({ reply: res.choices[0]?.message?.content ?? "Couldn't process that." });
  } catch {
    return NextResponse.json({ reply: "AI is temporarily unavailable. Try again." });
  }
}
