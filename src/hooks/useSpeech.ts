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

/** Split into speakable chunks so the typewriter can track sentences. */
export function splitSpeakChunks(text: string): string[] {
  const clean = text.trim();
  if (!clean) return [];

  const raw = clean.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [clean];
  const sentences = raw.map((s) => s.trim()).filter(Boolean);

  const chunks: string[] = [];
  let buf = "";
  for (const sentence of sentences) {
    const next = buf ? `${buf} ${sentence}` : sentence;
    if (next.length > 220 && buf) {
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

function isIOSWebKit() {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function playbackWatchdogMs(durationMs: number, estimatedMs: number) {
  const estimated = Math.max(estimatedMs > 0 ? estimatedMs : 1800, 1400);
  const durationLooksShort = durationMs > 0 && durationMs < estimated * 0.5;
  const durationLooksLong = durationMs > estimated * 3;
  const expected =
    durationMs > 0 && !durationLooksShort && !durationLooksLong
      ? Math.max(durationMs, estimated * 0.8)
      : estimated;
  return Math.min(60000, expected + 1200);
}

type PersistentPlayer = {
  audio: HTMLAudioElement;
  ctx: AudioContext | null;
  source: MediaElementAudioSourceNode | null;
  gain: GainNode | null;
  url: string | null;
  boostFailed: boolean;
};

function createPlayer(): PersistentPlayer {
  const audio = new Audio();
  audio.preload = "auto";
  audio.volume = 1;
  return {
    audio,
    ctx: null,
    source: null,
    gain: null,
    url: null,
    boostFailed: false,
  };
}

function revokePlayerUrl(player: PersistentPlayer) {
  if (!player.url) return;
  try {
    URL.revokeObjectURL(player.url);
  } catch {
    /* ignore */
  }
  player.url = null;
}

function stopPlayer(player: PersistentPlayer | null, destroyGraph: boolean) {
  if (!player) return;
  try {
    player.audio.pause();
  } catch {
    /* ignore */
  }
  try {
    player.audio.dispatchEvent(new Event("ended"));
  } catch {
    /* ignore */
  }
  player.audio.removeAttribute("src");
  try {
    player.audio.load();
  } catch {
    /* ignore */
  }
  revokePlayerUrl(player);
  if (destroyGraph) {
    try {
      player.source?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      player.gain?.disconnect();
    } catch {
      /* ignore */
    }
    void player.ctx?.close().catch(() => {
      /* ignore */
    });
    player.source = null;
    player.gain = null;
    player.ctx = null;
  }
}

async function attachBoost(player: PersistentPlayer) {
  if (isIOSWebKit() || player.source || player.boostFailed) {
    if (player.ctx?.state === "suspended") await player.ctx.resume();
    return;
  }

  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;

  try {
    player.ctx = new Ctx();
    if (player.ctx.state === "suspended") await player.ctx.resume();
    player.source = player.ctx.createMediaElementSource(player.audio);
    player.gain = player.ctx.createGain();
    player.gain.gain.value = 1.85;
    player.source.connect(player.gain);
    player.gain.connect(player.ctx.destination);
  } catch {
    player.boostFailed = true;
  }
}

function playClip(
  player: PersistentPlayer,
  blob: Blob,
  estimatedMs: number,
  onReady?: (durationMs: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    revokePlayerUrl(player);
    const url = URL.createObjectURL(blob);
    player.url = url;
    const audio = player.audio;
    audio.volume = 1;
    audio.preload = "auto";
    audio.src = url;

    let settled = false;
    let startedPlayback = false;
    let timeoutId: number | null = null;
    let pollId: number | null = null;
    let metaTimer = 0;
    let durationMs = 0;
    let lastTime = 0;
    let lastAdvanceAt = Date.now();
    let playStartedAt = Date.now();
    const listeners = new AbortController();

    const clearTimers = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (pollId !== null) window.clearInterval(pollId);
      window.clearTimeout(metaTimer);
      timeoutId = null;
      pollId = null;
    };

    const releaseClip = () => {
      listeners.abort();
      audio.onended = null;
      audio.onerror = null;
      audio.onpause = null;
      audio.ontimeupdate = null;
      audio.onplaying = null;
      audio.onloadedmetadata = null;
      if (player.url === url) revokePlayerUrl(player);
    };

    const settle = (ok: boolean, err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimers();
      try {
        releaseClip();
      } catch {
        /* never block unlocking after speech */
      }
      if (ok) resolve();
      else reject(err ?? new Error("audio play failed"));
    };

    const nearEnd = () => {
      if (audio.ended) return true;
      const dur = audio.duration;
      const t = audio.currentTime;
      const ms =
        Number.isFinite(dur) && dur > 0 ? dur * 1000 : durationMs;
      const reliable = ms > 0 && (estimatedMs <= 0 || ms >= estimatedMs * 0.5);
      if (!reliable || !Number.isFinite(dur) || dur <= 0 || t < 0.08) {
        return false;
      }
      return t >= dur - 0.2;
    };

    const stallCheck = () => {
      if (settled) return;
      const t = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      if (t > lastTime + 0.03) {
        lastTime = t;
        lastAdvanceAt = Date.now();
      }
      if (audio.ended || nearEnd()) {
        settle(true);
        return;
      }
      // Sentence pauses in Kokoro/OpenRouter audio are often 300–800ms.
      // Only finish if we are actually at the end, or far past the estimate
      // with no further progress.
      const stalledFor = Date.now() - lastAdvanceAt;
      const playedFor = Date.now() - playStartedAt;
      const budget = playbackWatchdogMs(durationMs, estimatedMs);
      if (nearEnd() && stalledFor >= 200) {
        settle(true);
        return;
      }
      if (playedFor >= budget && stalledFor >= 1000) settle(true);
      else if (playedFor >= Math.max(budget + 8000, 60000)) settle(true);
    };

    const startPlayback = async () => {
      if (startedPlayback || settled) return;
      startedPlayback = true;
      durationMs =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration * 1000
          : 0;
      lastAdvanceAt = Date.now();
      playStartedAt = Date.now();
      try {
        await attachBoost(player);
        if (settled) return;
        onReady?.(durationMs || estimatedMs);
        audio.addEventListener("ended", () => settle(true), {
          signal: listeners.signal,
        });
        audio.addEventListener(
          "error",
          () => settle(false, new Error("audio play failed")),
          { signal: listeners.signal }
        );
        audio.addEventListener(
          "playing",
          () => {
            lastAdvanceAt = Date.now();
          },
          { signal: listeners.signal }
        );
        audio.addEventListener("timeupdate", stallCheck, {
          signal: listeners.signal,
        });
        audio.addEventListener(
          "pause",
          () => {
            if (audio.ended || nearEnd()) settle(true);
          },
          { signal: listeners.signal }
        );
        timeoutId = window.setTimeout(
          stallCheck,
          playbackWatchdogMs(durationMs, estimatedMs)
        );
        pollId = window.setInterval(stallCheck, 80);
        await audio.play();
      } catch (err) {
        settle(
          false,
          err instanceof Error ? err : new Error("play failed")
        );
      }
    };

    metaTimer = window.setTimeout(() => {
      if (audio.readyState >= 1) void startPlayback();
      else settle(false, new Error("audio metadata timeout"));
    }, 6000);

    if (audio.readyState >= 1) void startPlayback();
    else {
      audio.onloadedmetadata = () => {
        void startPlayback();
      };
      audio.onerror = () => settle(false, new Error("audio load failed"));
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
  const playerRef = useRef<PersistentPlayer | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, Blob>>(new Map());
  const generationRef = useRef(0);

  const getPlayer = useCallback(() => {
    if (!playerRef.current) playerRef.current = createPlayer();
    return playerRef.current;
  }, []);

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
      stopPlayer(playerRef.current, true);
      playerRef.current = null;
    };
  }, [browserSupported]);

  const stopBrowser = useCallback(() => {
    if (browserSupported) window.speechSynthesis.cancel();
  }, [browserSupported]);

  const stopAudio = useCallback(() => {
    stopPlayer(playerRef.current, false);
  }, []);

  const speakBrowser = useCallback(
    (text: string): Promise<void> =>
      new Promise((resolve) => {
        let settled = false;
        let watchdog = 0;
        const finish = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(watchdog);
          setSpeaking(false);
          resolve();
        };

        if (!browserSupported || !text.trim()) {
          finish();
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
        utterance.onstart = () => {
          if (!settled) setSpeaking(true);
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        watchdog = window.setTimeout(
          finish,
          Math.min(60000, Math.max(4000, text.split(/\s+/).length * 420))
        );
        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          finish();
        }
      }),
    [browserSupported, stopAudio, voices]
  );

  const prefetch = useCallback(async (text: string, interviewerId?: string) => {
    const clean = text.trim();
    if (!clean) return;
    try {
      const key = `${interviewerId || "default"}:${clean}`;
      if (cacheRef.current.has(key)) return;
      const blob = await fetchTtsBlob(clean, undefined, interviewerId);
      cacheRef.current.set(key, blob);
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
      const chunkTimers: number[] = [];

      stopBrowser();
      stopAudio();
      setPreparingSpeech(true);
      setSpeaking(true);

      let chunkStarted = false;
      let didFinish = false;
      let hardStop = 0;

      const finish = () => {
        if (didFinish) return;
        didFinish = true;
        window.clearTimeout(hardStop);
        chunkTimers.forEach((id) => window.clearTimeout(id));
        if (generation !== generationRef.current) return;
        setPreparingSpeech(false);
        setSpeaking(false);
        options?.onComplete?.();
      };

      hardStop = window.setTimeout(
        () => {
          if (generation !== generationRef.current) return;
          abort.abort();
          stopAudio();
          stopBrowser();
          finish();
        },
        Math.min(90000, Math.max(10000, clean.split(/\s+/).length * 480 + 4000))
      );

      try {
        const key = `${interviewerId || "default"}:${clean}`;
        let blob = cacheRef.current.get(key);
        if (!blob) {
          blob = await fetchTtsBlob(clean, abort.signal, interviewerId);
          cacheRef.current.set(key, blob);
        }
        if (generation !== generationRef.current) return;

        const estimatedMs = Math.max(1400, clean.split(/\s+/).length * 380);
        const player = getPlayer();
        const visual = splitSpeakChunks(clean);

        await playClip(player, blob, estimatedMs, (durationMs) => {
          if (generation !== generationRef.current) return;
          chunkStarted = true;
          setPreparingSpeech(false);
          const total = durationMs || estimatedMs;
          const totalChars =
            visual.reduce((sum, chunk) => sum + chunk.length, 0) || 1;
          let delay = 0;
          visual.forEach((chunk, i) => {
            const durationShare = Math.max(
              400,
              total * (chunk.length / totalChars)
            );
            const startAt = delay;
            delay += durationShare;
            const kick = () => {
              if (generation !== generationRef.current) return;
              options?.onChunkStart?.({
                index: i,
                total: visual.length,
                chunk,
                settledText: visual.slice(0, i).join(" "),
                revealedText: visual.slice(0, i + 1).join(" "),
                durationMs: durationShare,
              });
            };
            if (i === 0) kick();
            else chunkTimers.push(window.setTimeout(kick, startAt));
          });
        });
      } catch {
        if (generation !== generationRef.current) return;
        if (abort.signal.aborted) return;
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
      } finally {
        finish();
      }
    },
    [getPlayer, speakBrowser, stopAudio, stopBrowser]
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
