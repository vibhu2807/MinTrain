import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getProfileForMember, getSession } from "@/lib/session";

export default async function OnboardingPage() {
  const session = await getSession();
  if (session == null) redirect("/login");

  const profile = await getProfileForMember(session.memberId);

  return (
    <div className="phone-frame">
      <main className="min-h-dvh px-4 py-6">
        <div className="mx-auto grid max-w-[400px] gap-5">
          <div className="grid gap-2 pt-2">
            <h1 className="font-[var(--font-display)] text-3xl tracking-[-0.03em] text-[var(--text)]">
              {profile.onboardingComplete ? "Update your profile" : "Set up your plan"}
            </h1>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              Fill this out once. AI builds your personal food and gym plan from these details.
            </p>
          </div>
          <OnboardingWizard initialProfile={profile} />
        </div>
      </main>
    </div>
  );
}
