"use client";

import { useEffect, useRef, useState } from "react";
import type { Interviewer } from "@/lib/interviewers";
import type { Shot } from "@/lib/cutscenes";
import PersonaAvatar from "@/components/PersonaAvatar";

export default function CutscenePlayer({
  shots,
  person,
  loading = false,
  actionLabel,
  onAdvance,
  onComplete,
}: {
  shots: Shot[];
  person?: Interviewer | null;
  loading?: boolean;
  actionLabel: string;
  onAdvance?: () => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const shot = shots[Math.min(index, Math.max(0, shots.length - 1))];
  const last = shots.length > 0 && index >= shots.length - 1;

  const stopAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  };

  useEffect(() => {
    if (!shot || loading) return;
    let gone = false;
    stopAudio();
    const play = async () => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: shot.line,
            voice: "am_michael",
            speed: 0.92,
          }),
        });
        if (!res.ok || gone) return;
        const blob = await res.blob();
        if (gone) return;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = audioRef.current || new Audio();
        audioRef.current = audio;
        audio.src = url;
        await audio.play();
      } catch {
        /* narration is optional */
      }
    };
    void play();
    return () => {
      gone = true;
      stopAudio();
    };
  }, [shot?.line, loading]);

  const advance = () => {
    if (loading || !shot) return;
    stopAudio();
    onAdvance?.();
    if (!last) {
      setIndex((value) => value + 1);
      return;
    }
    onComplete();
  };

  const skip = () => {
    if (loading) return;
    stopAudio();
    onAdvance?.();
    onComplete();
  };

  return (
    <div className="cutscene" onClick={advance} onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        advance();
      }
    }} role="presentation">
      <div className={`cutscene-still still-${shot?.still || "night"}`}>
        {shot?.still === "portrait" && person ? (
          <PersonaAvatar interviewer={person} size="lg" />
        ) : (
          <span className="cutscene-mark" aria-hidden />
        )}
      </div>
      <div className="cutscene-caption">
        <p className="app-kicker">{loading ? "PROBE" : shot?.kicker}</p>
        <p>{loading ? "The file is printing…" : shot?.line}</p>
        <div className="cutscene-bar">
          <span>
            {loading
              ? "…"
              : `${Math.min(index + 1, shots.length)} / ${shots.length || 1}`}
          </span>
          <div className="cutscene-actions">
            <button
              type="button"
              className="text-button"
              onClick={(event) => {
                event.stopPropagation();
                skip();
              }}
              disabled={loading}
            >
              Skip
            </button>
            <button
              type="button"
              className="start-chat-button"
              onClick={(event) => {
                event.stopPropagation();
                advance();
              }}
              disabled={loading}
            >
              {last ? actionLabel : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
