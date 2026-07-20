"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  OPENING_LINE,
  type ChatMessage,
  type ConversationMeta,
} from "@/lib/personality";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/useSpeech";
import DerekAvatar from "@/components/DerekAvatar";

type Line = {
  id: string;
  role: "derek" | "you";
  text: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function InterviewRoom() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [meta, setMeta] = useState<ConversationMeta>({
    turnCount: 0,
    therapyScore: 0,
    phase: "strict",
  });
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoListenRef = useRef(false);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});
  const lockedRef = useRef(false);

  const { supported: ttsOk, speaking, speak, prefetch, cancel } =
    useSpeechSynthesis();

  // Block all user input while Derek is thinking or still talking.
  const inputLocked = busy || speaking;

  useEffect(() => {
    lockedRef.current = inputLocked;
  }, [inputLocked]);

  const onFinalSpeech = useCallback((text: string) => {
    if (lockedRef.current) return;
    void sendRef.current(text);
  }, []);

  const {
    supported: sttOk,
    listening,
    interim,
    start: startListen,
    stop: stopListen,
  } = useSpeechRecognition(onFinalSpeech);

  useEffect(() => {
    prefetch(OPENING_LINE);
  }, [prefetch]);

  // Never keep the mic open while Derek owns the turn.
  useEffect(() => {
    if (inputLocked && listening) {
      stopListen();
    }
  }, [inputLocked, listening, stopListen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines, interim, busy]);

  const sendUserMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy || speaking) return;

      stopListen();
      setError(null);
      setBusy(true);
      setTyped("");

      const nextLines: Line[] = [
        ...lines,
        { id: uid(), role: "you", text },
      ];
      setLines(nextLines);

      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content: text },
      ];
      setMessages(nextMessages);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            meta,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.detail || "Chat failed");
        }

        const reply = String(data.reply || "");
        const nextMeta = data.meta as ConversationMeta;
        setMeta(nextMeta);
        setMessages([...nextMessages, { role: "assistant", content: reply }]);
        setLines([...nextLines, { id: uid(), role: "derek", text: reply }]);
        autoListenRef.current = true;
        // Start TTS before clearing busy so input stays locked across the handoff.
        speak(reply);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something broke";
        setError(message);
      } finally {
        setBusy(false);
      }
    },
    [busy, speaking, lines, messages, meta, speak, stopListen]
  );

  useEffect(() => {
    sendRef.current = sendUserMessage;
  }, [sendUserMessage]);

  useEffect(() => {
    if (!speaking && autoListenRef.current && started && !busy && sttOk) {
      autoListenRef.current = false;
      const t = window.setTimeout(() => {
        if (!lockedRef.current) startListen();
      }, 350);
      return () => window.clearTimeout(t);
    }
  }, [speaking, started, busy, sttOk, startListen]);

  const tryStartListen = () => {
    if (inputLocked || !sttOk) return;
    startListen();
  };
  const beginInterview = () => {
    cancel();
    stopListen();
    setError(null);
    setStarted(true);
    setLines([{ id: uid(), role: "derek", text: OPENING_LINE }]);
    setMessages([{ role: "assistant", content: OPENING_LINE }]);
    setMeta({ turnCount: 0, therapyScore: 0, phase: "strict" });
    setTyped("");
    autoListenRef.current = true;
    speak(OPENING_LINE);
  };

  const restart = () => {
    cancel();
    stopListen();
    setBusy(false);
    setStarted(false);
    setLines([]);
    setMessages([]);
    setMeta({ turnCount: 0, therapyScore: 0, phase: "strict" });
    setTyped("");
    setError(null);
    autoListenRef.current = false;
  };

  const logout = async () => {
    cancel();
    stopListen();
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  };

  const phaseLabel: Record<ConversationMeta["phase"], string> = {
    strict: "Strict hire mode",
    cracking: "Cracking",
    confessional: "Family spill",
    enamored: "Attached",
  };

  return (
    <div className="room">
      <div className="grain" aria-hidden />
      <div className="blinds" aria-hidden />
      <div className="lamp" aria-hidden />

      <header className="topbar">
        <p className="mark">PROBE</p>
        <div className="top-actions">
          <button type="button" className="ghost" onClick={() => void logout()}>
            Lock
          </button>
          {started && (
            <button type="button" className="ghost danger" onClick={restart}>
              Restart
            </button>
          )}
        </div>
      </header>

      {!started ? (
        <section className="hero">
          <div className="hero-portrait" aria-hidden>
            <DerekAvatar size="hero" />
          </div>
          <div className="hero-copy">
            <p className="eyebrow">Game testing intake</p>
            <h1 className="brand">DEREK</h1>
            <p className="lede">
              Senior QA Lead. Strict. Self-obsessed. Will open up about his
              family — if you last long enough.
            </p>
            <div className="cta-row">
              <button type="button" className="primary" onClick={beginInterview}>
                Sit for the interview
              </button>
            </div>
            <p className="hint">
              {sttOk
                ? "Mic + voice reply ready in Chrome / Edge."
                : "Speech recognition needs Chrome or Edge — typing still works."}
              {!ttsOk ? " Text-to-speech unavailable in this browser." : ""}
            </p>
          </div>
        </section>
      ) : (
        <section className="stage">
          <div className="derek-panel">
            <DerekAvatar
              size="lg"
              speaking={speaking}
              listening={listening}
            />
            <div className="derek-meta">
              <h2>Derek Holloway</h2>
              <p>Senior QA Lead · Probe Labs</p>
              <p className="phase">{phaseLabel[meta.phase]}</p>
            </div>
          </div>

          <div className="transcript" ref={scrollRef}>
            {lines.map((line) => (
              <div key={line.id} className={`bubble ${line.role}`}>
                {line.role === "derek" && (
                  <DerekAvatar
                    size="sm"
                    speaking={false}
                    className="bubble-avatar"
                  />
                )}
                <div className="bubble-body">
                  <span className="who">
                    {line.role === "derek" ? "Derek" : "You"}
                  </span>
                  <p>{line.text}</p>
                </div>
              </div>
            ))}
            {interim && (
              <div className="bubble you interim">
                <div className="bubble-body">
                  <span className="who">You</span>
                  <p>{interim}</p>
                </div>
              </div>
            )}
            {busy && (
              <div className="bubble derek thinking">
                <DerekAvatar size="sm" className="bubble-avatar" />
                <div className="bubble-body">
                  <span className="who">Derek</span>
                  <p>Judging you…</p>
                </div>
              </div>
            )}
          </div>

          <div className="composer">
            {error && <p className="error">{error}</p>}
            <div className="row">
              <button
                type="button"
                className={`mic ${listening ? "on" : ""}`}
                onClick={() =>
                  listening ? stopListen() : tryStartListen()
                }
                disabled={!sttOk || inputLocked}
                aria-label={listening ? "Stop listening" : "Speak"}
              >
                {listening
                  ? "Listening"
                  : busy
                    ? "Wait…"
                    : speaking
                      ? "Derek talking…"
                      : "Speak"}
              </button>
              <form
                className="type-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputLocked) return;
                  void sendUserMessage(typed);
                }}
              >
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={
                    busy
                      ? "Derek is thinking…"
                      : speaking
                        ? "Wait until Derek finishes…"
                        : "Or type your answer…"
                  }
                  disabled={inputLocked}
                  readOnly={inputLocked}
                  aria-label="Type your answer"
                />
                <button
                  type="submit"
                  className="send"
                  disabled={inputLocked || !typed.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
