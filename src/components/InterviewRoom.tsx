"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChatMessage, ConversationMeta } from "@/lib/personality";
import type { Interviewer } from "@/lib/interviewers";
import { themeStyle } from "@/lib/interviewers";
import { coverJobLine, coverOpeningLine, coverRoleLine } from "@/lib/cover";
import {
  getContactsSnapshot,
  parseContactsSnapshot,
  subscribeToContacts,
  updateContact,
} from "@/lib/contacts";
import { buildVerdictPdf, verdictPdfFilename } from "@/lib/offerPdf";
import { verdictHeadline, verdictLabel, type InterviewVerdict } from "@/lib/verdict";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/useSpeech";
import PersonaAvatar from "@/components/PersonaAvatar";
import DerekSpeechText from "@/components/DerekSpeechText";

type Line = {
  id: string;
  role: "them" | "you";
  text: string;
  imageUrl?: string;
  imageCaption?: string;
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
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [started, setStarted] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [meta, setMeta] = useState<ConversationMeta>({
    turnCount: 0,
    therapyScore: 0,
    phase: "strict",
    lastImageTurn: 0,
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

  const contactsRaw = useSyncExternalStore(
    subscribeToContacts,
    getContactsSnapshot,
    () => "[]"
  );
  const contact = useMemo(
    () =>
      parseContactsSnapshot(contactsRaw).find(
        (item) => item.interviewerId === interviewer.id
      ) ?? null,
    [contactsRaw, interviewer.id]
  );
  const appliedJob = contact?.appliedJob || interviewer.job;
  const openingLine = coverOpeningLine(interviewer, appliedJob);
  const storedVerdict = contact?.verdict ?? null;

  const themTalking = speaking && speechReveal?.complete !== true;
  const decided = Boolean(meta.verdict || storedVerdict);
  const inputLocked = busy || preparingSpeech || themTalking || decided;
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
    if (!mounted) return;
    if (!contact) router.replace("/");
  }, [mounted, contact, router]);

  useEffect(() => {
    prefetch(openingLine, interviewer.id);
  }, [prefetch, openingLine, interviewer.id]);

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
      if (!text || busy || preparingSpeech || themTalking || decided) return;

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
            appliedJob,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.detail || "Chat failed");
        }

        const reply = String(data.reply || "");
        const nextMeta = data.meta as ConversationMeta;
        const themId = uid();
        const imageUrl =
          typeof data.image?.dataUrl === "string" ? data.image.dataUrl : undefined;
        const imageCaption =
          typeof data.image?.caption === "string" ? data.image.caption : undefined;
        const verdict = (data.verdict || nextMeta.verdict) as
          | InterviewVerdict
          | undefined;
        setMeta({
          turnCount: nextMeta.turnCount ?? 0,
          therapyScore: nextMeta.therapyScore ?? 0,
          phase: nextMeta.phase ?? "strict",
          lastImageTurn: nextMeta.lastImageTurn ?? 0,
          verdict,
        });
        updateContact(interviewer.id, {
          preview: reply,
          verdict,
        });
        setMessages([...nextMessages, { role: "assistant", content: reply }]);
        setLines([
          ...nextLines,
          {
            id: themId,
            role: "them",
            text: reply,
            imageUrl,
            imageCaption,
          },
        ]);
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
      themTalking,
      preparingSpeech,
      lines,
      messages,
      meta,
      interviewer.id,
      appliedJob,
      decided,
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
      { id: themId, role: "them", text: openingLine },
    ]);
    setMessages([
      { role: "assistant", content: openingLine },
    ]);
    setMeta({ turnCount: 0, therapyScore: 0, phase: "strict", lastImageTurn: 0 });
    setTyped("");
    updateContact(interviewer.id, { preview: openingLine, verdict: undefined });
    startPersonaSpeech(themId, openingLine);
  };

  const restart = () => {
    cancel();
    stopListen();
    setBusy(false);
    setStarted(false);
    setLines([]);
    setMessages([]);
    setMeta({ turnCount: 0, therapyScore: 0, phase: "strict", lastImageTurn: 0 });
    setTyped("");
    setError(null);
    setSpeechReveal(null);
    updateContact(interviewer.id, { verdict: undefined, preview: "New interview" });
  };

  const logout = async () => {
    cancel();
    stopListen();
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  };

  const activeVerdict = meta.verdict || storedVerdict;
  const downloadLetter = () => {
    if (!activeVerdict) return;
    const blob = buildVerdictPdf({
      interviewer,
      appliedJob,
      verdict: activeVerdict,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = verdictPdfFilename(interviewer.company, appliedJob);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  if (!mounted || !contact) {
    return (
      <div className="room" style={themeStyle(interviewer.theme) as CSSProperties}>
        <header className="topbar">
          <p className="mark">PROBE</p>
        </header>
      </div>
    );
  }

  return (
    <div className="room" style={themeStyle(interviewer.theme) as CSSProperties}>

      <header className="topbar">
        <p className="mark">PROBE</p>
        <div className="top-actions">
          <Link href="/" className="ghost">
            Contacts
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
            <p className="eyebrow">{coverJobLine(appliedJob)}</p>
            <h1 className="brand">{firstName.toUpperCase()}</h1>
            <p className="hero-role">{coverRoleLine(interviewer)}</p>
            <div className="cta-row">
              {activeVerdict ? (
                <>
                  <button type="button" className="primary" onClick={downloadLetter}>
                    Download letter
                  </button>
                  <button type="button" className="ghost" onClick={beginInterview}>
                    Interview again
                  </button>
                </>
              ) : (
                <button type="button" className="primary" onClick={beginInterview}>
                  Sit for the interview
                </button>
              )}
            </div>
            {activeVerdict ? (
              <p className="hint">
                {verdictHeadline(activeVerdict.decision)}. The letter is on file.
              </p>
            ) : (
              <p className="hint">
                {sttOk
                  ? "Mic + voice reply ready in Chrome / Edge."
                  : "Speech recognition needs Chrome or Edge — typing still works."}
                {!ttsOk ? " Text-to-speech unavailable in this browser." : ""}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="stage">
          <div className="derek-panel">
            <PersonaAvatar
              interviewer={interviewer}
              size="lg"
              speaking={themTalking}
              listening={listening}
            />
            <div className="derek-meta">
              <h2>{interviewer.name}</h2>
              <p>{coverJobLine(appliedJob)}</p>
              <p className="phase">{coverRoleLine(interviewer)}</p>
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
                  {line.imageUrl ? (
                    <figure className="speech-photo">
                      <img
                        src={line.imageUrl}
                        alt={line.imageCaption || `${firstName} shared a photo`}
                        className="speech-photo-img"
                      />
                      <figcaption className="speech-photo-cap">
                        {line.imageCaption || "Shared photo"}
                      </figcaption>
                    </figure>
                  ) : null}
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
            {activeVerdict ? (
              <div className="verdict-card">
                <p className="eyebrow">{verdictLabel(activeVerdict.decision)}</p>
                <h3>{verdictHeadline(activeVerdict.decision)}</h3>
                <p>{activeVerdict.letter}</p>
                <div className="cta-row">
                  <button type="button" className="primary" onClick={downloadLetter}>
                    Download PDF
                  </button>
                </div>
              </div>
            ) : (
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
                    : themTalking
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
                      : themTalking
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
            )}
          </div>
        </section>
      )}
    </div>
  );
}
