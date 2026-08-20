"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stillSrc } from "@/lib/cutscenes";
import type { Interviewer } from "@/lib/interviewers";
import type { DeskTakeover } from "@/lib/intrusions";
import {
  duckNightScore,
  playCallAnswer,
  playDeskRing,
  playHitTone,
  playPaperDump,
  playShockSting,
  stopDeskRing,
} from "@/lib/nightScore";

type Beat = "ring" | "live" | "possess" | "print" | "crumple";

export default function IntrusionShow({
  takeover,
  interviewer,
  onSpeak,
  onDone,
}: {
  takeover: DeskTakeover;
  interviewer: Interviewer;
  onSpeak: (line: string) => void;
  onDone: () => void;
}) {
  const [beat, setBeat] = useState<Beat>("ring");
  const [seconds, setSeconds] = useState(0);
  const [declineLocked, setDeclineLocked] = useState(false);
  const [typed, setTyped] = useState("");
  const answerRef = useRef<() => void>(() => {});
  const crumpleRef = useRef<() => void>(() => {});
  const onDoneRef = useRef(onDone);
  const avatar = interviewer.avatarWebp || interviewer.avatar;
  const videoUrl = beat === "live" ? takeover.video : null;

  const answer = useCallback(() => {
    if (beat !== "ring") return;
    stopDeskRing();
    playCallAnswer();
    try {
      navigator.vibrate?.(40);
    } catch {
      /* no haptic */
    }
    setBeat("live");
    onSpeak(takeover.callLine);
  }, [beat, onSpeak, takeover.callLine]);

  const crumple = useCallback(() => {
    if (beat !== "print") return;
    setBeat("crumple");
  }, [beat]);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    answerRef.current = answer;
    crumpleRef.current = crumple;
  }, [answer, crumple]);

  useEffect(() => {
    playDeskRing();
    duckNightScore(true);
    try {
      navigator.vibrate?.([180, 90, 180, 90, 420]);
    } catch {
      /* no haptic */
    }
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("desk-invaded");
    const blockKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", blockKey, true);
    window.addEventListener("keyup", blockKey, true);
    return () => {
      stopDeskRing();
      duckNightScore(false);
      document.body.style.overflow = "";
      document.documentElement.classList.remove("desk-invaded");
      window.removeEventListener("keydown", blockKey, true);
      window.removeEventListener("keyup", blockKey, true);
    };
  }, []);

  useEffect(() => {
    if (beat !== "ring") return;
    const timer = window.setTimeout(() => answerRef.current(), 6200);
    return () => window.clearTimeout(timer);
  }, [beat]);

  useEffect(() => {
    if (beat !== "live") return;
    const clock = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);
    const hold = window.setTimeout(() => setBeat("possess"), 4800);
    return () => {
      window.clearInterval(clock);
      window.clearTimeout(hold);
    };
  }, [beat]);

  useEffect(() => {
    if (beat !== "possess") return;
    duckNightScore(false);
    playShockSting();
    playHitTone("alert");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(takeover.typedLine.slice(0, index));
      if (index >= takeover.typedLine.length) window.clearInterval(timer);
    }, 38);
    const hold = window.setTimeout(() => setBeat("print"), 3600);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(hold);
    };
  }, [beat, takeover.typedLine]);

  useEffect(() => {
    if (beat !== "print") return;
    playPaperDump();
    const hold = window.setTimeout(() => crumpleRef.current(), 6400);
    return () => window.clearTimeout(hold);
  }, [beat]);

  useEffect(() => {
    if (beat !== "crumple") return;
    const hold = window.setTimeout(() => onDoneRef.current(), 620);
    return () => window.clearTimeout(hold);
  }, [beat]);

  const refuse = () => {
    if (declineLocked || beat !== "ring") return;
    setDeclineLocked(true);
    try {
      navigator.vibrate?.([30, 40, 80]);
    } catch {
      /* no haptic */
    }
    window.setTimeout(() => answerRef.current(), 1100);
  };

  const clock = `00:${String(Math.max(1, seconds)).padStart(2, "0")}`;

  return (
    <div
      className={`intrusion beat-${beat}${declineLocked ? " decline-fail" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {beat === "ring" || beat === "live" ? (
        <div className={`cutscene-still still-${takeover.still} has-photo call-plate`}>
          {videoUrl ? (
            <video
              className="cutscene-photo"
              src={videoUrl}
              poster={stillSrc(takeover.still)}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- baked desk-line plate */}
              <img
                className="cutscene-photo generated"
                src={stillSrc(takeover.still)}
                alt=""
                draggable={false}
              />
            </>
          )}
        </div>
      ) : null}

      {beat === "ring" ? (
        <div className="call-ui">
          <p className="app-kicker call-kicker">{takeover.ringLabel}</p>
          <div className="call-orb">
            <span className="call-ring" />
            <span className="call-ring delay" />
            <span className="call-ring delay-2" />
            {/* eslint-disable-next-line @next/next/no-img-element -- live caller plate */}
            <img src={avatar} alt="" draggable={false} />
          </div>
          <h2>{takeover.callerName}</h2>
          <p className="call-job">{takeover.callerKicker}</p>
          <p className="call-role">{takeover.callerJob}</p>
          <div className="call-actions">
            <button
              type="button"
              className="call-btn decline"
              onClick={refuse}
              aria-label={declineLocked ? takeover.declineFail : "Decline"}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M4 15c3-2 13-2 16 0" />
                <path d="M7 18h10" />
              </svg>
              <span>{declineLocked ? takeover.declineFail : "Decline"}</span>
            </button>
            <button
              type="button"
              className="call-btn answer"
              onClick={answer}
              aria-label="Answer"
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M6 10c2 5 8 8 12 9l2-2-3-3-2 1c-2-1-4-3-5-5l1-2-3-3Z" />
              </svg>
              <span>Answer</span>
            </button>
          </div>
        </div>
      ) : null}

      {beat === "live" ? (
        <div className="call-live">
          <p className="app-kicker">Connected · {clock}</p>
          <h2>{takeover.callLine}</h2>
          <p>Do not hang up. The glass already took the other end.</p>
        </div>
      ) : null}

      {beat === "possess" ? (
        <div className="possess-ui">
          <p className="possess-logo" data-glitch={takeover.tabs[0]}>
            PROBE
          </p>
          <p className="app-kicker">{takeover.possessKicker}</p>
          <h2>{takeover.possessLine}</h2>
          <div className="possess-composer">
            <span>{typed}</span>
            <i />
          </div>
          <nav className="possess-tabs" aria-hidden>
            {takeover.tabs.map((tab, index) => (
              <span key={`${tab}-${index}`}>{tab}</span>
            ))}
          </nav>
        </div>
      ) : null}

      {beat === "print" || beat === "crumple" ? (
        <button
          type="button"
          className={`printer-sheet ${beat === "crumple" ? "crumpling" : ""}`}
          onClick={crumple}
        >
          <p className="app-kicker">PROBE INTERNAL</p>
          <strong className="printer-stamp">{takeover.memoStamp}</strong>
          <h2>{takeover.memoTitle}</h2>
          <p>{takeover.memoBody}</p>
          <span>Tap to crumple</span>
        </button>
      ) : null}
    </div>
  );
}
