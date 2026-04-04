import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignupForm } from "@/components/signup-form";

export default async function SignupPage() {
  const session = await getSession();
  if (session != null) redirect("/");

  return (
    <div className="phone-frame">
      <main className="flex min-h-dvh flex-col items-center justify-center px-6">
        <div className="w-full max-w-[340px] grid gap-10">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent-border)]">
              <span className="text-2xl font-bold text-[var(--accent)]">M</span>
            </div>
            <h1 className="font-[var(--font-display)] text-3xl tracking-[-0.03em] text-[var(--text)]">Join MinTrain</h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">Create your account to get started</p>
          </div>
          <SignupForm />
          <p className="text-center text-[10px] text-[var(--text-muted)]">Made by Mintellion</p>
        </div>
      </main>
    </div>
  );
}
