"use client";

import { FormEvent, useState } from "react";

export function SignupForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError("Pick a username."); return; }
    if (password.length < 4) { setError("Password needs at least 4 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setError(data.error ?? "Signup failed."); return; }
      window.location.href = "/";
    } catch {
      setError("Can't reach the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          className="input-shell"
          placeholder="Pick a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
        />
        <input
          className="input-shell"
          placeholder="Create a password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-[var(--radius)] bg-[var(--accent)] py-3 text-sm font-semibold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      {error ? (
        <p className="rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger)]/5 px-3 py-2 text-center text-xs text-[var(--danger)]">{error}</p>
      ) : null}

      <p className="text-center text-xs text-[var(--text-muted)]">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-[var(--accent)]">Sign in</a>
      </p>
    </div>
  );
}
