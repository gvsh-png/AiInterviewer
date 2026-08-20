"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getInterviewer } from "@/lib/interviewers";
import PersonaAvatar from "@/components/PersonaAvatar";
import { bumpKnocks, deskClick, playFun } from "@/lib/funKit";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [knocked, setKnocked] = useState(false);
  const knocks = useRef(0);
  const host = getInterviewer("derek")!;

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
      playFun("login-unlock");
      deskClick("door-close");
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
    <div className={`login-room ${busy ? "fun-unlocking" : ""}`} data-fun="login-unlock">
      <main className="login-panel">
        <button
          type="button"
          className="login-knock-hit"
          data-fun="login-knock"
          onClick={() => {
            knocks.current += 1;
            bumpKnocks();
            deskClick("glass-tap");
            playFun("login-knock");
            if (knocks.current >= 3) setKnocked(true);
          }}
          aria-label="Knock the staff door"
        >
          <PersonaAvatar interviewer={host} size="lg" />
        </button>
        <p className="eyebrow">Probe Labs</p>
        <h1 className="login-title">Staff only</h1>
        <p className="lede login-lede">
          {knocked
            ? "They heard the knock. The floor is still locked."
            : "The interview floor is locked. Enter the site password to meet the board."}
        </p>
        <form className="login-form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="site-password">
            Password
          </label>
          <input
            id="site-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              playFun("login-clack");
            }}
            placeholder="Site password"
            autoComplete="current-password"
            disabled={busy}
            required
            data-fun="login-clack"
          />
          <div className="login-redact" data-fun="login-redact" aria-hidden>
            {Array.from({ length: Math.min(12, password.length) }, (_, index) => (
              <i key={index} />
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary" disabled={busy || !password}>
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </main>
    </div>
  );
}
