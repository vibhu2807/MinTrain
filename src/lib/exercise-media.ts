
/**
 * GIF lookup — maps exercise keywords to local GIF files.
 * When AI generates an exercise name, we search for a matching GIF.
 * If no match, no GIF is shown (just exercise info).
 */
const gifMap: Record<string, string> = {
  // Lower body
  "leg press": "/exercises/leg-press.gif",
  "barbell squat": "/exercises/barbell-squat.gif",
  "squat": "/exercises/barbell-squat.gif",
  "goblet squat": "/exercises/goblet-squat.gif",
  "split squat": "/exercises/split-squat.gif",
  "bulgarian": "/exercises/split-squat.gif",
  "lunge": "/exercises/lunges.gif",
  "lunges": "/exercises/lunges.gif",
  "leg curl": "/exercises/leg-curl.gif",
  "hamstring curl": "/exercises/leg-curl.gif",
  "leg extension": "/exercises/leg-extension.gif",
  "calf raise": "/exercises/calf-raise.gif",
  "hip thrust": "/exercises/hip-thrust.gif",
  "romanian deadlift": "/exercises/romanian-deadlift.gif",
  "rdl": "/exercises/romanian-deadlift.gif",
  "deadlift": "/exercises/romanian-deadlift.gif",

  // Upper push
  "bench press": "/exercises/bench-press.gif",
  "chest press": "/exercises/chest-press.gif",
  "incline press": "/exercises/incline-press.gif",
  "incline dumbbell": "/exercises/incline-press.gif",
  "shoulder press": "/exercises/shoulder-press.gif",
  "overhead press": "/exercises/shoulder-press.gif",
  "push up": "/exercises/push-up.gif",
  "push-up": "/exercises/push-up.gif",
  "pushup": "/exercises/push-up.gif",
  "cable fly": "/exercises/cable-fly.gif",
  "chest fly": "/exercises/cable-fly.gif",

  // Upper pull
  "lat pulldown": "/exercises/lat-pulldown.gif",
  "pulldown": "/exercises/lat-pulldown.gif",
  "seated row": "/exercises/seated-row.gif",
  "cable row": "/exercises/seated-row.gif",
  "dumbbell row": "/exercises/dumbbell-row.gif",
  "bent over row": "/exercises/dumbbell-row.gif",
  "face pull": "/exercises/face-pull.gif",

  // Arms
  "bicep curl": "/exercises/bicep-curl.gif",
  "dumbbell curl": "/exercises/bicep-curl.gif",
  "curl": "/exercises/bicep-curl.gif",
  "tricep pushdown": "/exercises/tricep-pushdown.gif",
  "tricep": "/exercises/tricep-pushdown.gif",
  "pushdown": "/exercises/tricep-pushdown.gif",

  // Core
  "dead bug": "/exercises/dead-bug.gif",
  "plank": "/exercises/plank.gif",
  "front plank": "/exercises/plank.gif",
  "mountain climber": "/exercises/mountain-climber.gif",
  "russian twist": "/exercises/russian-twist.gif",
};

/**
 * Find the best GIF match for an exercise name.
 * Returns the GIF path or undefined if no match.
 */
export function findGifForExercise(name: string): string | undefined {
  const lower = name.toLowerCase();

  // Exact key match first
  if (gifMap[lower]) return gifMap[lower];

  // Partial match — check if any key is contained in the name
  for (const [key, url] of Object.entries(gifMap)) {
    if (lower.includes(key)) return url;
  }

  return undefined;
}

