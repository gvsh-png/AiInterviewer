"use client";

import { useEffect, useState } from "react";
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
  const shot = cut.shots[Math.min(index, cut.shots.length - 1)]!;
  const last = index >= cut.shots.length - 1;
  const videoUrl =
    shot.video ||
    stillVideo(shot.still) ||
    (shot.still === "building" ? "/stills/intro.mp4" : null);

  useEffect(() => {
    const hold = last ? 4200 : 3200;
    const timer = window.setTimeout(() => {
      if (!last) {
        setIndex((value) => value + 1);
        return;
      }
      onDone();
    }, hold);
    return () => window.clearTimeout(timer);
  }, [index, last, onDone, shot.line]);

  useEffect(() => {
    const blockKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", blockKey, true);
    window.addEventListener("keyup", blockKey, true);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", blockKey, true);
      window.removeEventListener("keyup", blockKey, true);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="shock-cut"
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      onClick={(event) => event.stopPropagation()}
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
        <span>UNSKIPPABLE · {index + 1} / {cut.shots.length}</span>
      </div>
    </div>
  );
}
