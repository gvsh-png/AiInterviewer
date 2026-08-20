"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { stillSrc, stillVideo } from "@/lib/cutscenes";
import type { ShockCut } from "@/lib/shockCuts";

export default function ShockCutscene({
  cut,
  onDone,
}: {
  cut: ShockCut;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const onDoneRef = useRef(onDone);
  const shot = cut.shots[Math.min(index, cut.shots.length - 1)]!;
  const last = index >= cut.shots.length - 1;
  const videoUrl =
    shot.video ||
    stillVideo(shot.still) ||
    (shot.still === "building" ? "/stills/intro.mp4" : null);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const hold = last ? 4200 : 3200;
    const timer = window.setTimeout(() => {
      if (!last) {
        setIndex((value) => value + 1);
        return;
      }
      onDoneRef.current();
    }, hold);
    return () => window.clearTimeout(timer);
  }, [index, last, shot.line]);

  useEffect(() => {
    const failSafe = window.setTimeout(() => onDoneRef.current(), 14000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onDoneRef.current();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(failSafe);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      document.body.style.overflow = "";
    };
  }, []);

  return createPortal(
    <div
      className="shock-cut"
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      onClick={() => onDoneRef.current()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className={`cutscene-still still-${shot.still} has-photo shock-still`}>
        {videoUrl ? (
          <video
            className="cutscene-photo"
            src={videoUrl}
            poster={stillSrc(shot.still)}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-baked shock plates */}
            <img
              className="cutscene-photo generated"
              src={stillSrc(shot.still)}
              alt=""
              draggable={false}
            />
          </>
        )}
      </div>
      <div className="shock-caption">
        <p className="app-kicker">{shot.kicker}</p>
        <h2>{cut.title}</h2>
        <p>{shot.line}</p>
        <span>HOLD THE DESK · {index + 1} / {cut.shots.length}</span>
      </div>
    </div>,
    document.body
  );
}
