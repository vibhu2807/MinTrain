import { NextResponse } from "next/server";

import { nextLoadHint } from "@/lib/engine";
import { saveWorkoutFeedback } from "@/lib/household-store";
import { getSession } from "@/lib/session";
import { DifficultySignal } from "@/lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (session == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    signal?: DifficultySignal;
    currentRange?: string;
    exerciseId?: string;
  } | null;

  if (body?.signal == null || body.currentRange == null || body.exerciseId == null) {
    return NextResponse.json({ error: "Signal, exercise id, and current range are required." }, { status: 400 });
  }

  const nextLoadMessage = await nextLoadHint(body.signal, body.currentRange);
  const tracking = await saveWorkoutFeedback(session.memberId, body.exerciseId, body.signal, nextLoadMessage);

  return NextResponse.json({
    ok: true,
    exerciseId: body.exerciseId,
    nextLoadMessage,
    tracking,
  });
}
