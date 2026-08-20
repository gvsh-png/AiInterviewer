"use client";

import { Component, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  CHAIR_LINES,
  DEFAULT_FUN_PREFS,
  EMPTY_FUN_STATE,
  FUN_EVENT,
  bumpChair,
  bumpKnocks,
  getFunPrefs,
  getFunState,
  grantAward,
  motionOk,
  playFun,
  subscribeToFunPrefs,
  subscribeToFunState,
  tapHaptic,
  touchNightStreak,
  type FunBurst,
} from "@/lib/funKit";
import { playFoley } from "@/lib/deskFoley";
import { musicMuted } from "@/lib/nightScore";

type Dot = { id: number; x: number; y: number };
type Toast = { id: string; text: string };

class FunGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    /* toys must never take the hour down */
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function subscribeClock(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}

function readClock() {
  return new Date().toTimeString().slice(0, 5);
}

function FunDesk() {
  const live = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const clock = useSyncExternalStore(subscribeClock, readClock, () => "--:--");
  const prefs = useSyncExternalStore(
    subscribeToFunPrefs,
    getFunPrefs,
    () => DEFAULT_FUN_PREFS
  );
  const state = useSyncExternalStore(
    subscribeToFunState,
    getFunState,
    () => EMPTY_FUN_STATE
  );
  const [dots, setDots] = useState<Dot[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flash, setFlash] = useState(false);
  const [wipe, setWipe] = useState(false);
  const [chairLine, setChairLine] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [redact, setRedact] = useState(false);
  const [heart, setHeart] = useState(false);
  const [tape, setTape] = useState(false);
  const [vu, setVu] = useState(0.2);
  const idRef = useRef(0);

  useEffect(() => {
    if (!live) return;
    touchNightStreak();
    document.documentElement.classList.add("fun-desk");
    document.documentElement.dataset.funToys = prefs.toys ? "on" : "off";
    if (!motionOk()) document.documentElement.classList.add("fun-still");
    else document.documentElement.classList.remove("fun-still");
    return () => {
      document.documentElement.classList.remove("fun-desk", "fun-still");
    };
  }, [live, prefs.toys]);

  useEffect(() => {
    const onBurst = (event: Event) => {
      const burst = (event as CustomEvent<FunBurst>).detail;
      if (!burst?.id) return;
      playFoley(burst.id);
      if (
        burst.id === "nav-haptic" ||
        burst.id === "tap-haptic" ||
        burst.id === "tab-tick"
      ) {
        tapHaptic(burst.id === "nav-haptic" ? [8, 20, 8] : 10);
      }
      if (burst.id === "desk-award" && burst.text) {
        const toast = { id: `${Date.now()}`, text: burst.text };
        setToasts((prev) => [...prev.slice(-2), toast]);
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== toast.id));
        }, 2400);
      }
      if (burst.id === "flashlight") {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 900);
      }
      if (burst.id === "theme-wipe") {
        setWipe(true);
        window.setTimeout(() => setWipe(false), 520);
      }
      if (burst.id === "hire-confetti") {
        setConfetti(true);
        window.setTimeout(() => setConfetti(false), 1800);
      }
      if (burst.id === "reject-redact") {
        setRedact(true);
        window.setTimeout(() => setRedact(false), 1200);
      }
      if (burst.id === "heart-stamp") {
        setHeart(true);
        window.setTimeout(() => setHeart(false), 1400);
      }
      if (burst.id === "ticker-tape") {
        setTape(true);
        grantAward("ticker-tape");
        window.setTimeout(() => setTape(false), 2200);
      }
      if (burst.id === "shake-dust") {
        document.documentElement.classList.toggle("fun-dust-storm");
        window.setTimeout(
          () => document.documentElement.classList.remove("fun-dust-storm"),
          1400
        );
      }
    };
    window.addEventListener(FUN_EVENT, onBurst);
    return () => window.removeEventListener(FUN_EVENT, onBurst);
  }, []);

  useEffect(() => {
    if (!live || !prefs.toys || !motionOk()) return;
    const move = (event: globalThis.PointerEvent) => {
      idRef.current += 1;
      const dot = { id: idRef.current, x: event.clientX, y: event.clientY };
      setDots((prev) => [...prev.slice(-10), dot]);
      window.setTimeout(() => {
        setDots((prev) => prev.filter((item) => item.id !== dot.id));
      }, 420);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [live, prefs.toys]);

  useEffect(() => {
    const onShake = () => playFun("shake-dust");
    let last = 0;
    const motion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const mag = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
      if (mag > 38 && Date.now() - last > 1600) {
        last = Date.now();
        onShake();
      }
    };
    window.addEventListener("devicemotion", motion);
    return () => window.removeEventListener("devicemotion", motion);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVu(musicMuted() ? 0.08 : 0.25 + Math.random() * 0.7);
    }, 180);
    return () => window.clearInterval(timer);
  }, []);

  const sitWithChair = () => {
    if (!prefs.toys) return;
    const count = bumpChair();
    playFun("chair-toy");
    playFun("glass-tap");
    tapHaptic([12, 40, 12]);
    setChairLine(CHAIR_LINES[(count - 1) % CHAIR_LINES.length] || CHAIR_LINES[0]!);
    window.setTimeout(() => setChairLine(null), 2600);
  };

  const knockLogo = () => {
    const knocks = bumpKnocks();
    playFun("desk-knock");
    playFun("glass-tap");
    tapHaptic(knocks >= 3 ? [20, 40, 20, 40, 80] : 16);
  };

  if (!live) return null;

  if (!prefs.toys) {
    return (
      <div className="fun-layer muted" aria-hidden data-fun="toys-pref">
        <i className="fun-vu" style={{ transform: `scaleY(${vu})` }} data-fun="music-vu" />
      </div>
    );
  }

  return (
    <div className="fun-layer" aria-hidden>
      <div className="fun-grain" data-fun="grain-alive" />
      <div className="fun-scan" data-fun="scan-alive" />
      <div className="fun-dust home" data-fun="home-dust">
        {Array.from({ length: 8 }, (_, index) => (
          <i key={index} style={{ left: `${(index * 13) % 100}%`, animationDelay: `${index * 0.4}s` }} />
        ))}
      </div>
      <div className="fun-dust desk" data-fun="desk-dust">
        {Array.from({ length: 6 }, (_, index) => (
          <i key={index} style={{ left: `${(index * 17) % 100}%`, animationDelay: `${index * 0.55}s` }} />
        ))}
      </div>
      <div className="fun-rain" data-fun="glass-rain">
        {Array.from({ length: 10 }, (_, index) => (
          <i key={index} style={{ left: `${(index * 9) % 100}%`, animationDelay: `${(index % 7) * 0.2}s` }} />
        ))}
      </div>
      <div className="fun-lamp" data-fun="warm-lamp" />
      <div className="fun-story-lamp" data-fun="story-lamp" />
      <div className="fun-coffee" data-fun="coffee-ring" />
      <div className="fun-smudge" data-fun="glass-smudge" />
      <div className="fun-floor" data-fun="floor-number">
        FL {Math.max(1, state.streakCount || 1)}
      </div>
      <p className="fun-streak" data-fun="night-streak">
        {state.streakCount > 1 ? `${state.streakCount} nights` : "tonight"}
      </p>
      <i className="fun-select-mark" data-fun="highlighter" />
      <i className="fun-scroll-mark" data-fun="paper-scroll" />
      <div className="fun-clock" data-fun="night-clock">
        {clock}
      </div>
      <p className="fun-ticker" data-fun="memo-ticker">
        COPIED LIVE · THE PRINTERS HAVE THE LAST LINE · KEEP THE HOUR SHORT
      </p>
      {dots.map((dot) => (
        <i
          key={dot.id}
          className="fun-ink"
          data-fun="ink-trail"
          style={{ left: dot.x, top: dot.y }}
        />
      ))}
      <button
        type="button"
        className="fun-chair"
        data-fun="extra-chair"
        onClick={sitWithChair}
        aria-label="Extra chair"
      />
      {chairLine ? (
        <p className="fun-chair-line" data-fun="chair-toy">
          {chairLine}
        </p>
      ) : null}
      <button
        type="button"
        className="fun-knock"
        data-fun="desk-knock"
        onClick={knockLogo}
        aria-label="Knock the desk"
      />
      {flash ? <div className="fun-flash" data-fun="flashlight" /> : null}
      {wipe ? <div className="fun-wipe" data-fun="theme-wipe" /> : null}
      {confetti ? (
        <div className="fun-confetti" data-fun="hire-confetti">
          {["HIRE", "STAMP", "FILE", "KEEP", "COPY"].map((word, index) => (
            <b key={word} style={{ left: `${12 + index * 16}%` }}>
              {word}
            </b>
          ))}
        </div>
      ) : null}
      {redact ? <div className="fun-redact" data-fun="reject-redact" /> : null}
      {heart ? <div className="fun-heart" data-fun="heart-stamp">KEEP</div> : null}
      {tape ? (
        <div className="fun-tape" data-fun="ticker-tape">
          HIRED · HIRED · HIRED · THE TAPE IS RUNNING
        </div>
      ) : null}
      <i className="fun-vu" data-fun="music-vu" style={{ transform: `scaleY(${vu})` }} />
      <div className="fun-toasts" data-fun="desk-award">
        {toasts.map((toast) => (
          <p key={toast.id}>{toast.text}</p>
        ))}
      </div>
    </div>
  );
}

export default function FunLayer() {
  return (
    <FunGuard>
      <FunDesk />
    </FunGuard>
  );
}
