"use client";

import { FormEvent, useMemo, useState } from "react";

type DemoCred = { label: string; username: string; password: string };

export function LoginForm({ demoCredentials }: { demoCredentials: DemoCred[] }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = useMemo(() => new Map(demoCredentials.map((c) => [c.label, c])), [demoCredentials]);

  const autofill = (label: string) => {
    const c = lookup.get(label);
    if (!c) return;
    setUsername(c.username);
    setPassword(c.password);
    setError("");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Enter username and password."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setError(data.error ?? "Wrong credentials."); return; }
      window.location.href = "/";
    } catch {
      setError("Can't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Member quick-pick */}
      <div className="grid grid-cols-3 gap-2">
        {demoCredentials.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => autofill(c.label)}
            className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3 text-center transition hover:border-[var(--accent-border)] hover:bg-[var(--surface-raised)]"
          >
            <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-sm font-bold text-[var(--accent)]">
              {c.label[0]}
            </div>
            <p className="text-xs font-medium text-[var(--text)]">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">or sign in</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          className="input-shell"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
        />
        <input
          className="input-shell"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-[var(--radius)] bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {error ? (
        <p className="rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3 py-2 text-center text-xs text-[var(--danger)]">{error}</p>
      ) : null}
    </div>
  );
}
