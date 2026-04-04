import { findGifForExercise } from "@/lib/exercise-media";

/**
 * Shows an exercise GIF if one is available for the exercise name.
 * If no GIF found, shows nothing — the exercise info card handles the rest.
 */
export function ExerciseVisual({ title }: { title: string }) {
  const gifUrl = findGifForExercise(title);

  if (!gifUrl) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#1f1f21]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={gifUrl} alt={title} className="w-full" loading="lazy" />
    </div>
  );
}
