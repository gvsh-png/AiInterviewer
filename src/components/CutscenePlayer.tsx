"use client";

import { useEffect, useRef, useState } from "react";
import type { Interviewer } from "@/lib/interviewers";
import type { Shot } from "@/lib/cutscenes";
import PersonaAvatar from "@/components/PersonaAvatar";
import { getCachedStill, setCachedStill, stillCacheKey } from "@/lib/stillCache";

export type CutsceneMood = {
  night?: string;
  premise?: string;
  throughline?: string;
};

export default function CutscenePlayer({
  shots,
  person,
  mood,
  actionLabel,
  onAdvance,
  onComplete,
}: {
  shots: Shot[];
  person?: Interviewer | null;
  mood?: CutsceneMood;
  actionLabel: string;
  onAdvance?: () => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(
    null
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const list = shots.length > 0 ? shots : FALLBACK_SHOTS;
  const safeIndex = Math.min(index, list.length - 1);
  const shot = list[safeIndex]!;
  const nextShot = list[safeIndex + 1];
  const last = safeIndex >= list.length - 1;
  const key = stillKey(shot, mood, person?.name);
  const imageUrl =
    (loaded?.key === key ? loaded.url : null) || getCachedStill(key);

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
  }, [shot.line, shot.still]);

  useEffect(() => {
    let gone = false;
    if (!getCachedStill(key)) {
      void requestStill(shot, mood, person?.name).then((url) => {
        if (gone || !url) return;
        setCachedStill(key, url);
        setLoaded({ key, url });
      });
    }
    if (nextShot) {
      const nextKey = stillKey(nextShot, mood, person?.name);
      if (!getCachedStill(nextKey)) {
        void requestStill(nextShot, mood, person?.name).then((url) => {
          if (gone || !url) return;
          setCachedStill(nextKey, url);
        });
      }
    }
    return () => {
      gone = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on still identity
  }, [key, nextShot?.line, nextShot?.still, mood, person?.name]);

  const advance = () => {
    stopAudio();
    onAdvance?.();
    if (!last) {
      setIndex((value) => value + 1);
      return;
    }
    onComplete();
  };

  const skip = () => {
    stopAudio();
    onAdvance?.();
    onComplete();
  };

  return (
    <div
      className="cutscene"
      onClick={advance}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          advance();
        }
      }}
      role="presentation"
    >
      <div
        className={`cutscene-still still-${shot.still} ${imageUrl ? "has-photo" : ""}`}
      >
        {imageUrl ? (
          // Generated stills are ephemeral data URLs from OpenRouter, not static assets.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="cutscene-photo"
            src={imageUrl}
            alt=""
            draggable={false}
          />
        ) : (
          <span className="cutscene-mark" aria-hidden />
        )}
        {shot.still === "portrait" && person ? (
          <PersonaAvatar interviewer={person} size="lg" />
        ) : null}
      </div>
      <div className="cutscene-caption">
        <p className="app-kicker">{shot.kicker}</p>
        <p>{shot.line}</p>
        <div className="cutscene-bar">
          <span>
            {safeIndex + 1} / {list.length}
          </span>
          <div className="cutscene-actions">
            <button
              type="button"
              className="text-button"
              onClick={(event) => {
                event.stopPropagation();
                skip();
              }}
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
            >
              {last ? actionLabel : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const FALLBACK_SHOTS: Shot[] = [
  {
    still: "night",
    kicker: "PROBE",
    line: "The glass does not advertise. You sit down anyway.",
  },
];

function stillKey(shot: Shot, mood?: CutsceneMood, personName?: string) {
  return stillCacheKey([
    shot.still,
    shot.line,
    shot.kicker,
    mood?.night,
    mood?.premise,
    personName,
  ]);
}

async function requestStill(
  shot: Shot,
  mood?: CutsceneMood,
  personName?: string
) {
  try {
    const res = await fetch("/api/story-still", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        still: shot.still,
        line: shot.line,
        kicker: shot.kicker,
        night: mood?.night,
        premise: mood?.premise,
        throughline: mood?.throughline,
        personName,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { image?: string };
    return data.image || null;
  } catch {
    return null;
  }
}
