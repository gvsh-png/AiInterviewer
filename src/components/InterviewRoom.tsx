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
import {
  clearConversation,
  loadConversation,
  saveConversation,
} from "@/lib/chatStorage";
import { buildVerdictPdf, verdictPdfFilename } from "@/lib/offerPdf";
import { verdictHeadline, verdictLabel, type InterviewVerdict } from "@/lib/verdict";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/useSpeech";
import PersonaAvatar from "@/components/PersonaAvatar";
import DerekSpeechText from "@/components/DerekSpeechText";
import ContactsSidebar from "@/components/ContactsSidebar";

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
  const [hydrated, setHydrated] = useState(false);
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
    if (!mounted) return;
    const stored = loadConversation(interviewer.id);
    const timer = window.setTimeout(() => {
      if (stored?.started) {
        setStarted(true);
        setLines(stored.lines);
        setMessages(stored.messages);
        setMeta({
          turnCount: stored.meta.turnCount ?? 0,
          therapyScore: stored.meta.therapyScore ?? 0,
          phase: stored.meta.phase ?? "strict",
          lastImageTurn: stored.meta.lastImageTurn ?? 0,
          verdict: stored.meta.verdict,
        });
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mounted, interviewer.id]);

  useEffect(() => {
    if (!hydrated || !contact) return;
    saveConversation({
      version: 1,
      interviewerId: interviewer.id,
      started,
      lines,
      messages,
      meta,
      updatedAt: Date.now(),
    });
  }, [hydrated, contact, interviewer.id, started, lines, messages, meta]);

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
    clearConversation(interviewer.id);
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
      <main className="messenger-shell thread-shell">
        <ContactsSidebar selectedId={interviewer.id} compact />
        <section className="chat-thread">
          <div className="chat-loading" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    );
  }

  const status = listening
    ? "Listening to you"
    : themTalking
      ? "Speaking…"
      : showThinking
        ? interviewer.thinkingLine
        : coverJobLine(appliedJob);

  return (
    <main
      className="messenger-shell thread-shell"
      style={themeStyle(interviewer.theme) as CSSProperties}
    >
      <ContactsSidebar selectedId={interviewer.id} compact />

      <section className="chat-thread">
        <header className="thread-header">
          <Link href="/" className="mobile-back" aria-label="Back to chats">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="m15 5-7 7 7 7" />
            </svg>
          </Link>
          <PersonaAvatar
            interviewer={interviewer}
            size="sm"
            speaking={themTalking}
            listening={listening}
          />
          <div className="thread-person">
            <h1>{interviewer.name}</h1>
            <p>{status}</p>
          </div>
          <div className="thread-actions">
            {started ? (
              <button
                type="button"
                className="icon-button"
                onClick={restart}
                aria-label="Reset conversation"
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M4 7h16M9 7V5h6v2M8 7l.8 12h6.4L16 7" />
                </svg>
              </button>
            ) : null}
            <button
              type="button"
              className="icon-button desktop-lock"
              onClick={() => void logout()}
              aria-label="Lock"
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </button>
          </div>
        </header>

        {!started ? (
          <div className="new-chat-state">
            <PersonaAvatar interviewer={interviewer} size="lg" />
            <h2>{interviewer.name}</h2>
            <p>
              {coverRoleLine(interviewer)}
              <br />
              {coverJobLine(appliedJob)}
            </p>
            {activeVerdict ? (
              <>
                <Link href="/story" className="start-chat-button">
                  Continue the story
                </Link>
                <button type="button" className="text-button" onClick={downloadLetter}>
                  Download letter
                </button>
                <button type="button" className="text-button" onClick={beginInterview}>
                  Interview again
                </button>
              </>
            ) : (
              <button type="button" className="start-chat-button" onClick={beginInterview}>
                Start conversation
              </button>
            )}
            <small>
              {ttsOk
                ? "Voice replies are on."
                : "Voice is unavailable; text still works."}
            </small>
          </div>
        ) : (
          <>
            <div className="transcript" ref={scrollRef}>
              <div className="conversation-date">Today</div>
              {lines
                .filter((line) => line.id !== pendingSpeechLineId)
                .map((line) => (
                  <div
                    key={line.id}
                    className={`message-row ${line.role === "them" ? "incoming" : "outgoing"}`}
                  >
                    {line.role === "them" ? (
                      <PersonaAvatar
                        interviewer={interviewer}
                        size="sm"
                        className="message-avatar"
                      />
                    ) : null}
                    <div className="message-content">
                      <div className="message-bubble">
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
                            <figcaption>
                              {line.imageCaption || "Shared photo"}
                            </figcaption>
                          </figure>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              {interim ? (
                <div className="message-row outgoing interim">
                  <div className="message-content">
                    <div className="message-bubble">
                      <p>{interim}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              {showThinking ? (
                <div className="message-row incoming thinking">
                  <PersonaAvatar
                    interviewer={interviewer}
                    size="sm"
                    className="message-avatar"
                  />
                  <div className="message-content">
                    <div className="message-bubble typing-bubble">
                      <span />
                      <span />
                      <span />
                      <em>{interviewer.thinkingLine}</em>
                    </div>
                  </div>
                </div>
              ) : null}
              {activeVerdict && !themTalking && !showThinking ? (
                <div className="verdict-card">
                  <p className="app-kicker">{verdictLabel(activeVerdict.decision)}</p>
                  <h3>{verdictHeadline(activeVerdict.decision)}</h3>
                  <p>{activeVerdict.letter}</p>
                </div>
              ) : null}
            </div>

            <div className="composer">
              {error ? <p className="composer-error">{error}</p> : null}
              {activeVerdict ? (
                <div className="composer-row story-continue">
                  <Link href="/story" className="start-chat-button">
                    Continue the story
                  </Link>
                  <button type="button" className="text-button" onClick={downloadLetter}>
                    Download PDF
                  </button>
                </div>
              ) : (
                <div className="composer-row">
                  <button
                    type="button"
                    className={`mic-button ${listening ? "active" : ""}`}
                    onClick={() => (listening ? stopListen() : tryStartListen())}
                    disabled={!sttOk || inputLocked}
                    aria-label={listening ? "Stop listening" : "Speak"}
                  >
                    {listening ? (
                      <span className="stop-icon" />
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden>
                        <rect x="9" y="3" width="6" height="11" rx="3" />
                        <path d="M6 11a6 6 0 0 0 12 0M12 17v4" />
                      </svg>
                    )}
                  </button>
                  <form
                    className="message-form"
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
                            ? `${firstName} is talking…`
                            : "Message"
                      }
                      disabled={inputLocked}
                      readOnly={inputLocked}
                      aria-label="Message"
                    />
                    <button
                      type="submit"
                      className="send-button"
                      disabled={inputLocked || !typed.trim()}
                      aria-label="Send"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden>
                        <path d="M4 12h16M13 5l7 7-7 7" />
                      </svg>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
