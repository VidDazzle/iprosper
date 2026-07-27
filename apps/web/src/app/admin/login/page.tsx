"use client";

import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.href = "/admin";
      return;
    }

    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "Login failed.");
    setSubmitting(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <h1 className="text-lg font-semibold">APEX Admin</h1>
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-sm"
        />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded bg-white py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </main>
  );
}
