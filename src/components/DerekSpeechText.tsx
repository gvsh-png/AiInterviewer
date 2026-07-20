"use client";

import { useMemo, useSyncExternalStore } from "react";

type DerekSpeechTextProps = {
  text: string;
  settled?: string;
  activeChunk?: string;
  durationMs?: number;
  /** Epoch ms when the current chunk started typing. */
  chunkStartedAt?: number;
  complete?: boolean;
};

function subscribeTick(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 32);
  return () => window.clearInterval(id);
}

function getTick() {
  return Date.now();
}

export default function DerekSpeechText({
  text,
  settled = "",
  activeChunk = "",
  durationMs = 0,
  chunkStartedAt = 0,
  complete = false,
}: DerekSpeechTextProps) {
  const activeChars = useMemo(() => Array.from(activeChunk), [activeChunk]);
  const now = useSyncExternalStore(subscribeTick, getTick, getTick);

  const stepMs = useMemo(() => {
    if (!activeChars.length) return 0;
    return Math.max(16, (Math.max(durationMs, 500) * 0.9) / activeChars.length);
  }, [durationMs, activeChars.length]);

  if (complete) {
    return <p className="speech-text">{text}</p>;
  }

  const elapsed = chunkStartedAt > 0 ? Math.max(0, now - chunkStartedAt) : 0;
  const visibleCount =
    activeChars.length === 0
      ? 0
      : Math.min(
          activeChars.length,
          Math.floor(elapsed / Math.max(stepMs, 1))
        );

  const visibleActive = activeChars.slice(0, visibleCount).join("");
  const showing =
    settled && visibleActive
      ? `${settled} ${visibleActive}`
      : settled || visibleActive;

  const typing = activeChars.length > 0 && visibleCount < activeChars.length;

  return (
    <p className="speech-text revealing" aria-label={text}>
      {showing}
      {typing || !showing ? <span className="speech-caret" aria-hidden /> : null}
    </p>
  );
}
