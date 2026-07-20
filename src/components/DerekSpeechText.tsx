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

export default function DerekSpeechText({
  text,
  settled = "",
  activeChunk = "",
  durationMs = 0,
  complete = false,
}: DerekSpeechTextProps) {
  const chars = useMemo(() => Array.from(activeChunk), [activeChunk]);
  const stepMs = useMemo(() => {
    if (!chars.length) return 0;
    // Type slightly ahead of audio end so the line finishes with his voice.
    return Math.max(18, (Math.max(durationMs, 500) * 0.9) / chars.length);
  }, [durationMs, chars.length]);

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
      <span className="speech-typewriter">
        {chars.map((char, index) => (
          <span
            key={`${activeChunk}-${index}`}
            className="speech-char"
            style={{ animationDelay: `${index * stepMs}ms` }}
          >
            {char === " " ? "\u00a0" : char}
          </span>
        ))}
        <span
          className="speech-caret"
          aria-hidden
          style={{ animationDelay: `${chars.length * stepMs}ms` }}
        />
      </span>
    </p>
  );
}
