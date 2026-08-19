"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Interviewer } from "@/lib/interviewers";
import { stillSrc, stillVideo, type Shot } from "@/lib/cutscenes";
import type { StoryRun } from "@/lib/storySeed";
import {
  musicMuted,
  setMusicMuted,
  startNightScore,
  stopNightScore,
} from "@/lib/nightScore";
import PersonaAvatar from "@/components/PersonaAvatar";

export default function CutscenePlayer({
  shots,
  person,
  run,
  actionLabel,
  onAdvance,
  onComplete,
}: {
  shots: Shot[];
  person?: Interviewer | null;
  run?: StoryRun | null;
  actionLabel: string;
  onAdvance?: () => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [generated, setGenerated] = useState<{ key: string; src: string } | null>(
    null
  );
  const [muted, setMuted] = useState(musicMuted);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const list = shots.length > 0 ? shots : FALLBACK_SHOTS;
  const safeIndex = Math.min(index, list.length - 1);
  const shot = list[safeIndex]!;
  const last = safeIndex >= list.length - 1;
  const shotKey = `${shot.still}:${shot.kicker}:${shot.line}`;
  const generatedSrc = generated?.key === shotKey ? generated.src : null;
  const imageUrl = generatedSrc || stillSrc(shot.still);
  const videoUrl = safeIndex === 0 ? stillVideo(shot.still) : null;

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
    if (!run) return;
    void startNightScore(run.night.mood);
    return () => stopNightScore();
  }, [run]);

  useEffect(() => {
    let gone = false;
    const key = `${shot.still}:${shot.kicker}:${shot.line}`;
    const baked = stillSrc(shot.still);
    const play = async () => {
      try {
        const res = await fetch("/api/story-still", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            still: shot.still,
            nightId: run?.night.id,
            night: run?.night.title,
            premise: run?.premise.title,
            throughline: run?.throughline.echo,
            kicker: shot.kicker,
            line: shot.line,
            personName: person?.name,
          }),
        });
        if (!res.ok || gone) return;
        const data = (await res.json()) as { src?: string };
        if (gone || !data.src || data.src === baked) return;
        setGenerated({ key, src: data.src });
      } catch {
        /* baked still stays */
      }
    };
    void play();
    return () => {
      gone = true;
    };
  }, [shot.still, shot.line, shot.kicker, run, person?.name]);

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

  const toggleMute = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const next = !muted;
    setMuted(next);
    setMusicMuted(next);
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
      <div className={`cutscene-still still-${shot.still} has-photo`}>
        {videoUrl ? (
          <video
            key={videoUrl}
            className="cutscene-photo"
            src={videoUrl}
            poster={imageUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated or baked stills */}
            <img
              className={`cutscene-photo ${generatedSrc ? "generated" : ""}`}
              src={imageUrl}
              alt=""
              draggable={false}
            />
          </>
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
            <button type="button" className="text-button" onClick={toggleMute}>
              {muted ? "Music off" : "Music on"}
            </button>
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
