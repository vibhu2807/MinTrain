import { findGifForExercise } from "@/lib/exercise-media";

export function ExerciseVisual({ title }: { title: string }) {
  const gifUrl = findGifForExercise(title);

  if (!gifUrl) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-8">
        <p className="text-xs text-[var(--text-muted)]">No preview available</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={gifUrl} alt={title} className="w-full" loading="lazy" />
    </div>
  );
}
