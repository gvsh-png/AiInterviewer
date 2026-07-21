"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChatMessage, ConversationMeta } from "@/lib/personality";
import type { Interviewer } from "@/lib/interviewers";
import { themeStyle } from "@/lib/interviewers";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/useSpeech";
import PersonaAvatar from "@/components/PersonaAvatar";
import DerekSpeechText from "@/components/DerekSpeechText";

type Line = {
  id: string;
  role: "them" | "you";
  text: string;
};

type SpeechReveal = {
  lineId: string;
  fullText: string;
  settled: string;
  activeChunk: string;
  durationMs: number;
  chunkStartedAt: number;
  complete: boolean;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function InterviewRoom({
  interviewer,
}: {
  interviewer: Interviewer;
}) {
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
  const [speechReveal, setSpeechReveal] = useState<SpeechReveal | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});
  const lockedRef = useRef(false);

  const { supported: ttsOk, speaking, preparingSpeech, speak, prefetch, cancel } =
    useSpeechSynthesis();

  const inputLocked = busy || speaking || preparingSpeech;
  const showThinking = busy || preparingSpeech;

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
    prefetch(interviewer.openingLine, interviewer.id);
  }, [prefetch, interviewer.openingLine, interviewer.id]);

  useEffect(() => {
    if (inputLocked && listening) stopListen();
  }, [inputLocked, listening, stopListen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines, interim, showThinking, speechReveal]);

  const startPersonaSpeech = useCallback(
    (lineId: string, reply: string) => {
      setSpeechReveal({
        lineId,
        fullText: reply,
        settled: "",
        activeChunk: "",
        durationMs: 0,
        chunkStartedAt: 0,
        complete: false,
      });
      speak(reply, {
        interviewerId: interviewer.id,
        onChunkStart: (progress) => {
          setSpeechReveal((prev) => {
            if (!prev || prev.lineId !== lineId) return prev;
            return {
              ...prev,
              settled: progress.settledText,
              activeChunk: progress.chunk,
              durationMs: progress.durationMs,
              chunkStartedAt: Date.now(),
              complete: false,
            };
          });
        },
        onComplete: () => {
          setSpeechReveal((prev) => {
            if (!prev || prev.lineId !== lineId) return prev;
            return {
              ...prev,
              settled: reply,
              activeChunk: "",
              chunkStartedAt: 0,
              complete: true,
            };
          });
        },
      });
    },
    [speak, interviewer.id]
  );

  const sendUserMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy || speaking || preparingSpeech) return;

      stopListen();
      setError(null);
      setBusy(true);
      setTyped("");

      const nextLines: Line[] = [...lines, { id: uid(), role: "you", text }];
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
            interviewerId: interviewer.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.detail || "Chat failed");
        }

        const reply = String(data.reply || "");
        const nextMeta = data.meta as ConversationMeta;
        const themId = uid();
        setMeta(nextMeta);
        setMessages([...nextMessages, { role: "assistant", content: reply }]);
        setLines([...nextLines, { id: themId, role: "them", text: reply }]);
        startPersonaSpeech(themId, reply);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something broke";
        setError(message);
      } finally {
        setBusy(false);
      }
    },
    [
      busy,
      speaking,
      preparingSpeech,
      lines,
      messages,
      meta,
      interviewer.id,
      startPersonaSpeech,
      stopListen,
    ]
  );

  useEffect(() => {
    sendRef.current = sendUserMessage;
  }, [sendUserMessage]);

  const tryStartListen = () => {
    if (inputLocked || !sttOk) return;
    startListen();
  };

  const beginInterview = () => {
    cancel();
    stopListen();
    setError(null);
    setStarted(true);
    const themId = uid();
    setLines([
      { id: themId, role: "them", text: interviewer.openingLine },
    ]);
    setMessages([
      { role: "assistant", content: interviewer.openingLine },
    ]);
    setMeta({ turnCount: 0, therapyScore: 0, phase: "strict" });
    setTyped("");
    startPersonaSpeech(themId, interviewer.openingLine);
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
    setSpeechReveal(null);
  };

  const logout = async () => {
    cancel();
    stopListen();
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  };

  const phaseLabel: Record<ConversationMeta["phase"], string> = {
    strict: "Mask on",
    cracking: "Cracking",
    confessional: "Spilling",
    enamored: "Attached",
  };

  const isLineRevealing = (lineId: string) =>
    Boolean(
      speechReveal &&
        speechReveal.lineId === lineId &&
        !speechReveal.complete &&
        speaking
    );

  const firstName = interviewer.name.split(" ")[0] || interviewer.name;
  const pendingSpeechLineId =
    preparingSpeech && speechReveal ? speechReveal.lineId : null;

  return (
    <div className="room" style={themeStyle(interviewer.theme) as CSSProperties}>

      <header className="topbar">
        <p className="mark">PROBE</p>
        <div className="top-actions">
          <Link href="/" className="ghost">
            Roster
          </Link>
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
            <PersonaAvatar interviewer={interviewer} size="hero" />
          </div>
          <div className="hero-copy">
            <p className="eyebrow">{interviewer.job}</p>
            <h1 className="brand">{firstName.toUpperCase()}</h1>
            <p className="hero-role">
              {interviewer.title} · {interviewer.company}
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
            <PersonaAvatar
              interviewer={interviewer}
              size="lg"
              speaking={speaking}
              listening={listening}
            />
            <div className="derek-meta">
              <h2>{interviewer.name}</h2>
              <p>
                {interviewer.title} · {interviewer.job}
              </p>
              <p className="phase">{phaseLabel[meta.phase]}</p>
            </div>
          </div>

          <div className="transcript" ref={scrollRef}>
            {lines
              .filter((line) => line.id !== pendingSpeechLineId)
              .map((line) => (
              <div key={line.id} className={`bubble ${line.role === "them" ? "derek" : "you"}`}>
                {line.role === "them" && (
                  <PersonaAvatar
                    interviewer={interviewer}
                    size="sm"
                    speaking={false}
                    className="bubble-avatar"
                  />
                )}
                <div className="bubble-body">
                  <span className="who">
                    {line.role === "them" ? firstName : "You"}
                  </span>
                  {line.role === "them" &&
                  isLineRevealing(line.id) &&
                  speechReveal ? (
                    <DerekSpeechText
                      key={speechReveal.lineId}
                      text={speechReveal.fullText}
                      settled={speechReveal.settled}
                      activeChunk={speechReveal.activeChunk}
                      durationMs={speechReveal.durationMs}
                      chunkStartedAt={speechReveal.chunkStartedAt}
                      complete={false}
                    />
                  ) : (
                    <p className="speech-text">{line.text}</p>
                  )}
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
            {showThinking && (
              <div className="bubble derek thinking">
                <PersonaAvatar
                  interviewer={interviewer}
                  size="sm"
                  className="bubble-avatar"
                />
                <div className="bubble-body">
                  <span className="who">{firstName}</span>
                  <p>{interviewer.thinkingLine}</p>
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
                onClick={() => (listening ? stopListen() : tryStartListen())}
                disabled={!sttOk || inputLocked}
                aria-label={listening ? "Stop listening" : "Speak"}
              >
                {listening
                  ? "Listening"
                  : showThinking
                    ? "Wait…"
                    : speaking
                      ? `${firstName} talking…`
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
                    showThinking
                      ? interviewer.thinkingLine
                      : speaking
                        ? `Wait until ${firstName} finishes…`
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
