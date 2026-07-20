"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DerekAvatar from "@/components/DerekAvatar";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      const next = searchParams.get("next") || "/";
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="room login-room">
      <div className="grain" aria-hidden />
      <div className="blinds" aria-hidden />
      <div className="lamp" aria-hidden />

      <main className="login-panel">
        <DerekAvatar size="lg" />
        <p className="eyebrow">Probe Labs</p>
        <h1 className="login-title">Staff only</h1>
        <p className="lede login-lede">
          Derek’s interview room is locked. Enter the site password to sit
          down.
        </p>
        <form className="login-form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="site-password">
            Password
          </label>
          <input
            id="site-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Site password"
            autoComplete="current-password"
            disabled={busy}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary" disabled={busy || !password}>
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </main>
    </div>
  );
}
