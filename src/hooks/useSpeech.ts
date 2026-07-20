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

  // Prefer clearly male / deep system voices.
  if (
    /onyx|guy|david|mark|eric|daniel|george|arthur|thomas|reed|andrew|brian|christopher|james|ryan|steffan|male/.test(
      name
    )
  ) {
    score += 20;
  }

  // Natural neural / online voices beat robotic local ones.
  if (/neural|natural|online|google|microsoft|premium|enhanced/.test(name)) {
    score += 10;
  }

  // Avoid obviously feminine / high voices.
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

export function useSpeechSynthesis() {
  const browserSupported = useSyncExternalStore(
    subscribeNoop,
    () => typeof window !== "undefined" && Boolean(window.speechSynthesis),
    () => false
  );
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
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
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const speakBrowser = useCallback(
    (text: string) => {
      if (!browserSupported || !text.trim()) {
        setSpeaking(false);
        return;
      }
      stopAudio();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickMaleVoice(voices);
      if (voice) utterance.voice = voice;
      // Deeper, slower, more grounded male delivery.
      utterance.rate = 0.9;
      utterance.pitch = 0.68;
      utterance.volume = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [browserSupported, stopAudio, voices]
  );

  const speak = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      stopBrowser();
      stopAudio();
      setSpeaking(true);

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean }),
        });

        if (!res.ok) {
          throw new Error(`TTS ${res.status}`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setSpeaking(false);
          stopAudio();
        };
        audio.onerror = () => {
          setSpeaking(false);
          stopAudio();
          speakBrowser(clean);
        };
        await audio.play();
      } catch {
        // Fall back to deeper browser male voice if cloud TTS fails.
        speakBrowser(clean);
      }
    },
    [speakBrowser, stopAudio, stopBrowser]
  );

  const cancel = useCallback(() => {
    stopBrowser();
    stopAudio();
    setSpeaking(false);
  }, [stopAudio, stopBrowser]);

  return {
    supported: true,
    speaking,
    speak: (text: string) => {
      void speak(text);
    },
    cancel,
  };
}
