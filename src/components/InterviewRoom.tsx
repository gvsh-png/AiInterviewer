"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  OPENING_LINE,
  type ChatMessage,
  type ConversationMeta,
} from "@/lib/personality";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/useSpeech";

const STORAGE_KEY = "derek-openrouter-key";
const KEY_EVENT = "derek-key-change";

type Line = {
  id: string;
  role: "derek" | "you";
  text: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStoredKey() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}

function subscribeKey(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  };
  const onLocal = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(KEY_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(KEY_EVENT, onLocal);
  };
}

function writeStoredKey(value: string) {
  if (value) localStorage.setItem(STORAGE_KEY, value);
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(KEY_EVENT));
}

export default function InterviewRoom() {
  const apiKey = useSyncExternalStore(subscribeKey, readStoredKey, () => "");
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
  const [showSettings, setShowSettings] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoListenRef = useRef(false);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});

  const { supported: ttsOk, speaking, speak, cancel } = useSpeechSynthesis();

  const onFinalSpeech = useCallback((text: string) => {
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
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines, interim, busy]);

  const sendUserMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      stopListen();
      cancel();
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
            apiKey: apiKey || undefined,
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
        speak(reply);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something broke";
        setError(message);
      } finally {
        setBusy(false);
      }
    },
    [apiKey, busy, cancel, lines, messages, meta, speak, stopListen]
  );

  useEffect(() => {
    sendRef.current = sendUserMessage;
  }, [sendUserMessage]);

  useEffect(() => {
    if (!speaking && autoListenRef.current && started && !busy && sttOk) {
      autoListenRef.current = false;
      const t = window.setTimeout(() => startListen(), 350);
      return () => window.clearTimeout(t);
    }
  }, [speaking, started, busy, sttOk, startListen]);

  const saveKey = () => {
    writeStoredKey(keyDraft.trim());
    setShowSettings(false);
  };

  const openSettings = () => {
    setKeyDraft(apiKey);
    setShowSettings(true);
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
          <button
            type="button"
            className="ghost"
            onClick={openSettings}
          >
            Key
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
        </section>
      ) : (
        <section className="stage">
          <div className="derek-panel">
            <div
              className={`avatar ${speaking ? "talking" : ""} ${listening ? "hearing" : ""}`}
            >
              <span className="initial">D</span>
              <span className="pulse" aria-hidden />
            </div>
            <div className="derek-meta">
              <h2>Derek Holloway</h2>
              <p>Senior QA Lead · Probe Labs</p>
              <p className="phase">{phaseLabel[meta.phase]}</p>
            </div>
          </div>

          <div className="transcript" ref={scrollRef}>
            {lines.map((line) => (
              <div key={line.id} className={`bubble ${line.role}`}>
                <span className="who">
                  {line.role === "derek" ? "Derek" : "You"}
                </span>
                <p>{line.text}</p>
              </div>
            ))}
            {interim && (
              <div className="bubble you interim">
                <span className="who">You</span>
                <p>{interim}</p>
              </div>
            )}
            {busy && (
              <div className="bubble derek thinking">
                <span className="who">Derek</span>
                <p>Judging you…</p>
              </div>
            )}
          </div>

          <div className="composer">
            {error && <p className="error">{error}</p>}
            <div className="row">
              <button
                type="button"
                className={`mic ${listening ? "on" : ""}`}
                onClick={() => (listening ? stopListen() : startListen())}
                disabled={!sttOk || busy || speaking}
                aria-label={listening ? "Stop listening" : "Speak"}
              >
                {listening ? "Listening" : "Speak"}
              </button>
              <form
                className="type-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendUserMessage(typed);
                }}
              >
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder="Or type your answer…"
                  disabled={busy}
                  aria-label="Type your answer"
                />
                <button
                  type="submit"
                  className="send"
                  disabled={busy || !typed.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {showSettings && (
        <div className="sheet" role="dialog" aria-label="API key settings">
          <div className="sheet-card">
            <h3>OpenRouter key</h3>
            <p>
              Paste your key for local use, or set{" "}
              <code>OPENROUTER_API_KEY</code> on the server.
            </p>
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="sk-or-…"
              autoComplete="off"
            />
            <div className="sheet-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setShowSettings(false)}
              >
                Cancel
              </button>
              <button type="button" className="primary" onClick={saveKey}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
