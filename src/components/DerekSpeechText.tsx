"use client";

import { useMemo } from "react";

type DerekSpeechTextProps = {
  /** Full final text once speech is done (or non-animated lines). */
  text: string;
  /** Text already fully spoken (previous chunks). */
  settled?: string;
  /** Current chunk being spoken. */
  activeChunk?: string;
  /** How long the active chunk audio lasts. */
  durationMs?: number;
  /** When true, show full text with no animation. */
  complete?: boolean;
};

function tokenize(chunk: string): string[] {
  return chunk.match(/\S+\s*/g) || (chunk ? [chunk] : []);
}

export default function DerekSpeechText({
  text,
  settled = "",
  activeChunk = "",
  durationMs = 0,
  complete = false,
}: DerekSpeechTextProps) {
  const words = useMemo(() => tokenize(activeChunk), [activeChunk]);
  const stepMs = useMemo(() => {
    if (!words.length) return 0;
    return Math.max(40, (Math.max(durationMs, 600) * 0.92) / words.length);
  }, [durationMs, words.length]);

  if (complete) {
    return <p className="speech-text">{text}</p>;
  }

  if (!settled && !activeChunk) {
    return (
      <p className="speech-text revealing" aria-label={text}>
        <span className="speech-caret" aria-hidden />
      </p>
    );
  }

  return (
    <p className="speech-text revealing" aria-label={text}>
      {settled ? <span className="speech-settled">{settled} </span> : null}
      {words.map((word, index) => (
        <span
          key={`${activeChunk}-${index}-${word}`}
          className="speech-word"
          style={{ animationDelay: `${index * stepMs}ms` }}
        >
          {word}
        </span>
      ))}
      <span
        className="speech-caret"
        aria-hidden
        style={{
          animationDelay: `${words.length * stepMs}ms`,
          animationName: "caret-fade-out",
          animationDuration: "0.01ms",
          animationFillMode: "forwards",
        }}
      />
    </p>
  );
}
