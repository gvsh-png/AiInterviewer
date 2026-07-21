"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};

function getRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function subscribeNoop() {
  return () => {};
}

export function useSpeechRecognition(onFinal: (text: string) => void) {
  const supported = useSyncExternalStore(
    subscribeNoop,
    () => Boolean(getRecognitionCtor()),
    () => false
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
    }

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const piece = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += piece;
        else interimText += piece;
      }
      setInterim(interimText);
      if (finalText.trim()) {
        setInterim("");
        onFinalRef.current(finalText.trim());
      }
    };

    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };

    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { supported, listening, interim, start, stop };
}

const MALE_VOICE_SCORE = (v: SpeechSynthesisVoice): number => {
  const name = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();
  let score = 0;

  if (lang.startsWith("en-us")) score += 8;
  else if (lang.startsWith("en-gb")) score += 5;
  else if (lang.startsWith("en")) score += 3;
  else return -100;

  if (
    /onyx|guy|david|mark|eric|daniel|george|arthur|thomas|reed|andrew|brian|christopher|james|ryan|steffan|male/.test(
      name
    )
  ) {
    score += 20;
  }

  if (/neural|natural|online|google|microsoft|premium|enhanced/.test(name)) {
    score += 10;
  }

  if (
    /female|woman|zira|samantha|karen|moira|tessa|fiona|victoria|susan|hazel|jenny|aria|sara|michelle|catherine|helena/.test(
      name
    )
  ) {
    score -= 40;
  }

  if (v.localService) score -= 2;
  return score;
};

function pickMaleVoice(voices: SpeechSynthesisVoice[]) {
  if (!voices.length) return null;
  const ranked = [...voices].sort(
    (a, b) => MALE_VOICE_SCORE(b) - MALE_VOICE_SCORE(a)
  );
  return ranked[0] ?? null;
}

/** Split into speakable chunks so first audio can start ASAP. */
export function splitSpeakChunks(text: string): string[] {
  const clean = text.trim();
  if (!clean) return [];

  const raw = clean.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [clean];
  const sentences = raw.map((s) => s.trim()).filter(Boolean);

  const chunks: string[] = [];
  let buf = "";
  for (const sentence of sentences) {
    const next = buf ? `${buf} ${sentence}` : sentence;
    // Keep chunks short so mobile transcript wraps naturally.
    if (next.length > 72 && buf) {
      chunks.push(buf);
      buf = sentence;
    } else {
      buf = next;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

async function fetchTtsBlob(
  text: string,
  signal?: AbortSignal,
  interviewerId?: string
): Promise<Blob> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, interviewerId }),
    signal,
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  return res.blob();
}

function loadAudioBlob(
  blob: Blob,
  audioRef: { current: HTMLAudioElement | null }
): Promise<{ durationMs: number; play: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = 1;
    audio.src = url;
    audioRef.current = audio;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      if (audioRef.current === audio) audioRef.current = null;
    };

    const fail = (err: Error) => {
      cleanup();
      reject(err);
    };

    const boostPlayback = async () => {
      audio.volume = 1;
      const Ctx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;

      try {
        const ctx = new Ctx();
        if (ctx.state === "suspended") await ctx.resume();
        const source = ctx.createMediaElementSource(audio);
        const gain = ctx.createGain();
        gain.gain.value = 1.85;
        source.connect(gain);
        gain.connect(ctx.destination);
      } catch {
        /* fall back to plain element playback */
      }
    };

    const ready = () => {
      const durationMs =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration * 1000
          : 0;

      resolve({
        durationMs,
        play: async () => {
          try {
            await boostPlayback();
            await audio.play();
            await new Promise<void>((endResolve, endReject) => {
              audio.onended = () => {
                cleanup();
                endResolve();
              };
              audio.onerror = () => {
                cleanup();
                endReject(new Error("audio play failed"));
              };
            });
          } catch (err) {
            cleanup();
            throw err instanceof Error ? err : new Error("play failed");
          }
        },
      });
    };

    if (audio.readyState >= 1) ready();
    else {
      audio.onloadedmetadata = ready;
      audio.onerror = () => fail(new Error("audio load failed"));
    }
  });
}

export type SpeakChunkProgress = {
  index: number;
  total: number;
  chunk: string;
  /** All text through the current chunk (settled + active). */
  revealedText: string;
  /** Previous chunks only (fully spoken). */
  settledText: string;
  durationMs: number;
};

export type SpeakOptions = {
  interviewerId?: string;
  onChunkStart?: (progress: SpeakChunkProgress) => void;
  onComplete?: () => void;
};

export function useSpeechSynthesis() {
  const browserSupported = useSyncExternalStore(
    subscribeNoop,
    () => typeof window !== "undefined" && Boolean(window.speechSynthesis),
    () => false
  );
  const [speaking, setSpeaking] = useState(false);
  const [preparingSpeech, setPreparingSpeech] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, Blob>>(new Map());
  const generationRef = useRef(0);

  useEffect(() => {
    if (!browserSupported) return;

    const load = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [browserSupported]);

  const stopBrowser = useCallback(() => {
    if (browserSupported) window.speechSynthesis.cancel();
  }, [browserSupported]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  const speakBrowser = useCallback(
    (text: string): Promise<void> =>
      new Promise((resolve) => {
        if (!browserSupported || !text.trim()) {
          setSpeaking(false);
          resolve();
          return;
        }
        stopAudio();
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickMaleVoice(voices);
        if (voice) utterance.voice = voice;
        utterance.rate = 0.92;
        utterance.pitch = 0.68;
        utterance.volume = 1;
        utterance.onstart = () => setSpeaking(true);
        const finish = () => {
          setSpeaking(false);
          resolve();
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      }),
    [browserSupported, stopAudio, voices]
  );

  const prefetch = useCallback(async (text: string, interviewerId?: string) => {
    const clean = text.trim();
    if (!clean) return;
    try {
      const chunks = splitSpeakChunks(clean);
      await Promise.all(
        chunks.map(async (chunk) => {
          const key = `${interviewerId || "default"}:${chunk}`;
          if (cacheRef.current.has(key)) return;
          const blob = await fetchTtsBlob(chunk, undefined, interviewerId);
          cacheRef.current.set(key, blob);
        })
      );
    } catch {
      /* prefetch is best-effort */
    }
  }, []);

  const speak = useCallback(
    async (text: string, options?: SpeakOptions) => {
      const clean = text.trim();
      if (!clean) return;

      const generation = ++generationRef.current;
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;
      const interviewerId = options?.interviewerId;

      stopBrowser();
      stopAudio();
      setPreparingSpeech(true);
      setSpeaking(true);

      const chunks = splitSpeakChunks(clean);
      let chunkStarted = false;

      const finish = () => {
        if (generation !== generationRef.current) return;
        setPreparingSpeech(false);
        setSpeaking(false);
        options?.onComplete?.();
      };

      try {
        const blobPromises = chunks.map((chunk) => {
          const key = `${interviewerId || "default"}:${chunk}`;
          const cached = cacheRef.current.get(key);
          if (cached) return Promise.resolve(cached);
          return fetchTtsBlob(chunk, abort.signal, interviewerId).then(
            (blob) => {
              cacheRef.current.set(key, blob);
              return blob;
            }
          );
        });

        for (let i = 0; i < chunks.length; i += 1) {
          if (generation !== generationRef.current) return;
          const blob = await blobPromises[i]!;
          if (generation !== generationRef.current) return;

          const settledText = chunks.slice(0, i).join(" ");
          const chunk = chunks[i]!;
          const revealedText = chunks.slice(0, i + 1).join(" ");

          const estimatedMs = Math.max(900, chunk.split(/\s+/).length * 320);
          const loaded = await loadAudioBlob(blob, audioRef);
          if (generation !== generationRef.current) return;

          chunkStarted = true;
          setPreparingSpeech(false);
          options?.onChunkStart?.({
            index: i,
            total: chunks.length,
            chunk,
            settledText,
            revealedText,
            durationMs: loaded.durationMs || estimatedMs,
          });

          await loaded.play();
        }

        finish();
      } catch {
        if (generation !== generationRef.current) return;
        if (abort.signal.aborted) {
          setPreparingSpeech(false);
          setSpeaking(false);
          return;
        }
        setPreparingSpeech(false);
        if (!chunkStarted) {
          options?.onChunkStart?.({
            index: 0,
            total: 1,
            chunk: clean,
            settledText: "",
            revealedText: clean,
            durationMs: Math.max(1200, clean.split(/\s+/).length * 280),
          });
        }
        await speakBrowser(clean);
        finish();
      }
    },
    [speakBrowser, stopAudio, stopBrowser]
  );

  const cancel = useCallback(() => {
    generationRef.current += 1;
    abortRef.current?.abort();
    stopBrowser();
    stopAudio();
    setPreparingSpeech(false);
    setSpeaking(false);
  }, [stopAudio, stopBrowser]);

  return {
    supported: true,
    speaking,
    preparingSpeech,
    speak: (text: string, options?: SpeakOptions) => {
      void speak(text, options);
    },
    prefetch: (text: string, interviewerId?: string) => {
      void prefetch(text, interviewerId);
    },
    cancel,
  };
}
