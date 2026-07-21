"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChatMessage, ConversationMeta } from "@/lib/personality";
import type { Interviewer } from "@/lib/interviewers";
import { themeStyle } from "@/lib/interviewers";
import {
  clearConversation,
  loadConversation,
  saveConversation,
  type ConversationLine,
} from "@/lib/chatStorage";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/useSpeech";
import ContactsSidebar from "@/components/ContactsSidebar";
import PersonaAvatar from "@/components/PersonaAvatar";
import DerekSpeechText from "@/components/DerekSpeechText";

type SpeechReveal = {
  lineId: string;
  fullText: string;
  settled: string;
  activeChunk: string;
  durationMs: number;
  chunkStartedAt: number;
  complete: boolean;
};

const EMPTY_META: ConversationMeta = {
  turnCount: 0,
  therapyScore: 0,
  phase: "strict",
  lastImageTurn: 0,
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function InterviewRoom({
  interviewer,
}: {
  interviewer: Interviewer;
}) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHydrated(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!hydrated) {
    return (
      <main
        className="messenger-shell thread-shell"
        style={themeStyle(interviewer.theme) as CSSProperties}
      >
        <ContactsSidebar selectedId={interviewer.id} compact />
        <section className="chat-thread">
          <div className="chat-loading" aria-label="Loading conversation">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    );
  }

  return <HydratedInterviewRoom interviewer={interviewer} />;
}

function HydratedInterviewRoom({ interviewer }: { interviewer: Interviewer }) {
  const router = useRouter();
  const [initialConversation] = useState(() =>
    loadConversation(interviewer.id)
  );
  const [started, setStarted] = useState(
    () => initialConversation?.started ?? false
  );
  const [lines, setLines] = useState<ConversationLine[]>(
    () => initialConversation?.lines ?? []
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialConversation?.messages ?? []
  );
  const [meta, setMeta] = useState<ConversationMeta>(
    () => ({ ...EMPTY_META, ...initialConversation?.meta })
  );
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
  const firstName = interviewer.name.split(" ")[0] || interviewer.name;

  const persist = useCallback(
    (
      nextLines: ConversationLine[],
      nextMessages: ChatMessage[],
      nextMeta: ConversationMeta,
      nextStarted = true
    ) => {
      saveConversation({
        version: 1,
        interviewerId: interviewer.id,
        started: nextStarted,
        lines: nextLines,
        messages: nextMessages,
        meta: nextMeta,
        updatedAt: Date.now(),
      });
    },
    [interviewer.id]
  );

  const scrollTranscriptToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const node = scrollRef.current;
      if (!node) return;
      window.requestAnimationFrame(() => {
        node.scrollTo({ top: node.scrollHeight, behavior });
      });
    },
    []
  );

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
    scrollTranscriptToBottom();
  }, [lines, interim, showThinking, speechReveal, scrollTranscriptToBottom]);

  useEffect(() => {
    if (!speaking) return;
    const timer = window.setInterval(
      () => scrollTranscriptToBottom("auto"),
      140
    );
    return () => {
      window.clearInterval(timer);
      scrollTranscriptToBottom();
    };
  }, [speaking, scrollTranscriptToBottom]);

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
          setSpeechReveal((previous) => {
            if (!previous || previous.lineId !== lineId) return previous;
            return {
              ...previous,
              settled: progress.settledText,
              activeChunk: progress.chunk,
              durationMs: progress.durationMs,
              chunkStartedAt: Date.now(),
              complete: false,
            };
          });
        },
        onComplete: () => {
          setSpeechReveal((previous) => {
            if (!previous || previous.lineId !== lineId) return previous;
            return {
              ...previous,
              settled: reply,
              activeChunk: "",
              chunkStartedAt: 0,
              complete: true,
            };
          });
          scrollTranscriptToBottom();
          window.setTimeout(() => scrollTranscriptToBottom(), 100);
        },
      });
    },
    [interviewer.id, scrollTranscriptToBottom, speak]
  );

  const sendUserMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy || speaking || preparingSpeech) return;

      stopListen();
      setError(null);
      setBusy(true);
      setTyped("");

      const nextLines: ConversationLine[] = [
        ...lines,
        { id: uid(), role: "you", text },
      ];
      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content: text },
      ];
      setLines(nextLines);
      setMessages(nextMessages);
      persist(nextLines, nextMessages, meta);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            meta,
            interviewerId: interviewer.id,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.detail || "Chat failed");
        }

        const reply = String(data.reply || "");
        const responseMeta = data.meta as ConversationMeta;
        const nextMeta: ConversationMeta = {
          turnCount: responseMeta.turnCount ?? 0,
          therapyScore: responseMeta.therapyScore ?? 0,
          phase: responseMeta.phase ?? "strict",
          lastImageTurn: responseMeta.lastImageTurn ?? 0,
        };
        const lineId = uid();
        const assistantLine: ConversationLine = {
          id: lineId,
          role: "them",
          text: reply,
          imageUrl:
            typeof data.image?.dataUrl === "string"
              ? data.image.dataUrl
              : undefined,
          imageCaption:
            typeof data.image?.caption === "string"
              ? data.image.caption
              : undefined,
        };
        const completedLines = [...nextLines, assistantLine];
        const completedMessages: ChatMessage[] = [
          ...nextMessages,
          { role: "assistant", content: reply },
        ];

        setMeta(nextMeta);
        setMessages(completedMessages);
        setLines(completedLines);
        persist(completedLines, completedMessages, nextMeta);
        startPersonaSpeech(lineId, reply);
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Something broke";
        setError(message);
      } finally {
        setBusy(false);
      }
    },
    [
      busy,
      interviewer.id,
      lines,
      messages,
      meta,
      persist,
      preparingSpeech,
      speaking,
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

  const beginConversation = () => {
    cancel();
    stopListen();
    setError(null);
    setStarted(true);
    const lineId = uid();
    const openingLines: ConversationLine[] = [
      { id: lineId, role: "them", text: interviewer.openingLine },
    ];
    const openingMessages: ChatMessage[] = [
      { role: "assistant", content: interviewer.openingLine },
    ];
    setLines(openingLines);
    setMessages(openingMessages);
    setMeta(EMPTY_META);
    setTyped("");
    persist(openingLines, openingMessages, EMPTY_META);
    startPersonaSpeech(lineId, interviewer.openingLine);
  };

  const resetConversation = () => {
    if (
      lines.length > 0 &&
      !window.confirm(`Delete your conversation with ${firstName}?`)
    ) {
      return;
    }
    cancel();
    stopListen();
    clearConversation(interviewer.id);
    setBusy(false);
    setStarted(false);
    setLines([]);
    setMessages([]);
    setMeta(EMPTY_META);
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

  const isLineRevealing = (lineId: string) =>
    Boolean(
      speechReveal &&
        speechReveal.lineId === lineId &&
        !speechReveal.complete &&
        speaking
    );

  const pendingSpeechLineId =
    preparingSpeech && speechReveal ? speechReveal.lineId : null;

  const status = listening
    ? "Listening to you"
    : speaking
      ? "Speaking…"
      : preparingSpeech
        ? interviewer.thinkingLine
        : `${interviewer.job} · ${interviewer.company}`;

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
            speaking={speaking}
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
                onClick={resetConversation}
                aria-label="Delete this conversation"
                title="Delete this conversation"
              >
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                </svg>
              </button>
            ) : null}
            <button
              type="button"
              className="icon-button desktop-lock"
              onClick={() => void logout()}
              aria-label="Lock app"
              title="Lock app"
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <rect x="5" y="10" width="14" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </button>
          </div>
        </header>

        {!started ? (
          <div className="new-chat-state">
            <PersonaAvatar interviewer={interviewer} size="lg" />
            <h2>{interviewer.name}</h2>
            <p>
              {interviewer.title}
              <br />
              {interviewer.company}
            </p>
            <button
              type="button"
              className="start-chat-button"
              onClick={beginConversation}
            >
              Start conversation
            </button>
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
                    className={`message-row ${
                      line.role === "them" ? "incoming" : "outgoing"
                    }`}
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
                            <Image
                              src={line.imageUrl}
                              alt={
                                line.imageCaption ||
                                `${firstName} shared a photo`
                              }
                              className="speech-photo-img"
                              width={640}
                              height={640}
                              unoptimized
                              onLoad={() => scrollTranscriptToBottom()}
                            />
                            <figcaption>{line.imageCaption || "Photo"}</figcaption>
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
            </div>

            <div className="composer">
              {error ? <p className="composer-error">{error}</p> : null}
              <div className="composer-row">
                <button
                  type="button"
                  className={`mic-button ${listening ? "active" : ""}`}
                  onClick={() =>
                    listening ? stopListen() : tryStartListen()
                  }
                  disabled={!sttOk || inputLocked}
                  aria-label={listening ? "Stop listening" : "Start talking"}
                >
                  {listening ? (
                    <span className="stop-icon" />
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <rect x="9" y="3" width="6" height="12" rx="3" />
                      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
                    </svg>
                  )}
                </button>
                <form
                  className="message-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (inputLocked) return;
                    void sendUserMessage(typed);
                  }}
                >
                  <input
                    value={typed}
                    onChange={(event) => setTyped(event.target.value)}
                    placeholder={
                      showThinking
                        ? interviewer.thinkingLine
                        : speaking
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
                    aria-label="Send message"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path d="m4 4 17 8-17 8 3-8-3-8Z" />
                      <path d="M7 12h14" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
