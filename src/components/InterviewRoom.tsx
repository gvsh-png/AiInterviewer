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
  EMPTY_SNAPSHOT,
  campaignRun,
  completedContacts,
  getCampaignSnapshot,
  parseCampaignSnapshot,
  subscribeToCampaign,
  totalRounds,
} from "@/lib/campaign";
import {
  EMPTY_FILE_SNAPSHOT,
  getFileSnapshot,
  getNote,
  parseFileSnapshot,
  subscribeToFile,
} from "@/lib/fileCabinet";
import {
  QUESTIONS_PER_HOUR,
  STANCES,
  clockLabel,
  getDirective,
  hourWindow,
  isStance,
  pickDirective,
  scoreHour,
  type Stance,
} from "@/lib/gameplay";
import {
  clearConversation,
  loadConversation,
  saveConversation,
} from "@/lib/chatStorage";
import { downloadVerdictPdf } from "@/lib/offerPdf";
import { verdictHeadline, verdictLabel, type InterviewVerdict } from "@/lib/verdict";
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks/useSpeech";
import PersonaAvatar from "@/components/PersonaAvatar";
import DerekSpeechText from "@/components/DerekSpeechText";
import ContactsSidebar from "@/components/ContactsSidebar";
import NightNote from "@/components/NightNote";
import {
  playShockSting,
  setScoreBpm,
  startPersonScore,
  stopNightScore,
  unlockScore,
} from "@/lib/nightScore";
import { matchShockCut, type ShockCut } from "@/lib/shockCuts";
import { interviewStress } from "@/lib/stress";
import ShockCutscene from "@/components/ShockCutscene";

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
  const [notesOpen, setNotesOpen] = useState(false);
  const [stance, setStance] = useState<Stance>("work");
  const [callbackLetter, setCallbackLetter] = useState<InterviewVerdict | null>(
    null
  );
  const [shockCut, setShockCut] = useState<ShockCut | null>(null);
  const [usedShockIds, setUsedShockIds] = useState<string[]>([]);
  const [heardFlash, setHeardFlash] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const usedShockRef = useRef<string[]>([]);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});
  const lockedRef = useRef(false);
  const autoStartRef = useRef(false);

  const { supported: ttsOk, speaking, preparingSpeech, speak, prefetch, cancel } =
    useSpeechSynthesis();

  const contactsRaw = useSyncExternalStore(
    subscribeToContacts,
    getContactsSnapshot,
    () => "[]"
  );
  const campaignRaw = useSyncExternalStore(
    subscribeToCampaign,
    getCampaignSnapshot,
    () => EMPTY_SNAPSHOT
  );
  const fileRaw = useSyncExternalStore(
    subscribeToFile,
    getFileSnapshot,
    () => EMPTY_FILE_SNAPSHOT
  );
  const contact = useMemo(
    () =>
      parseContactsSnapshot(contactsRaw).find(
        (item) => item.interviewerId === interviewer.id
      ) ?? null,
    [contactsRaw, interviewer.id]
  );
  const campaign = useMemo(
    () => parseCampaignSnapshot(campaignRaw),
    [campaignRaw]
  );
  const file = useMemo(() => parseFileSnapshot(fileRaw), [fileRaw]);
  const assigned = useMemo(
    () => parseContactsSnapshot(contactsRaw),
    [contactsRaw]
  );
  const appliedJob = contact?.appliedJob || interviewer.job;
  const openingLine = coverOpeningLine(interviewer, appliedJob);
  const storedVerdict = contact?.verdict ?? null;
  const done = completedContacts(assigned);
  const round = useMemo(() => {
    const order = [...assigned].sort((a, b) => a.createdAt - b.createdAt);
    const index = order.findIndex((item) => item.interviewerId === interviewer.id);
    return index >= 0 ? index + 1 : Math.max(1, order.length);
  }, [assigned, interviewer.id]);
  const run = campaignRun(campaign);
  const directive =
    getDirective(contact?.directiveId) ||
    pickDirective(round, campaign.seed || "probe");
  const windowTurns = hourWindow(
    round,
    Boolean(meta.callbackRound),
    totalRounds()
  );
  const lastHour = round >= totalRounds();

  const themTalking = speaking && speechReveal?.complete !== true;
  const closedVerdict =
    meta.verdict && meta.verdict.decision !== "callback"
      ? meta.verdict
      : storedVerdict && storedVerdict.decision !== "callback"
        ? storedVerdict
        : null;
  const decided = Boolean(closedVerdict);
  const shocking = Boolean(shockCut);
  const inputLocked =
    busy || preparingSpeech || themTalking || decided || shocking;
  const stances = meta.stances || [];
  const stress = interviewStress({
    round,
    total: totalRounds(),
    turnCount: meta.turnCount,
    forceVerdict: windowTurns.forceVerdict,
    therapyScore: meta.therapyScore,
    soften: stances.filter((item) => item === "soften").length,
    probe: stances.filter((item) => item === "probe").length,
    shocks: usedShockIds.length,
    callback: Boolean(meta.callbackRound),
  });
  const questionNow = decided
    ? Math.min(meta.turnCount, windowTurns.forceVerdict)
    : Math.min(meta.turnCount + 1, windowTurns.forceVerdict);
  const showThinking = busy || preparingSpeech;

  useEffect(() => {
    lockedRef.current = inputLocked;
  }, [inputLocked]);

  useEffect(() => {
    usedShockRef.current = usedShockIds;
  }, [usedShockIds]);

  useEffect(() => {
    void startPersonScore(interviewer.id);
    return () => stopNightScore();
  }, [interviewer.id]);

  useEffect(() => {
    const kick = () => {
      void startPersonScore(interviewer.id);
      void unlockScore();
    };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, [interviewer.id]);

  useEffect(() => {
    setScoreBpm(stress.bpm);
  }, [stress.bpm]);

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
          stances: Array.isArray(stored.meta.stances)
            ? stored.meta.stances.filter(isStance)
            : [],
          callbackRound: Boolean(stored.meta.callbackRound),
          verdict: stored.meta.verdict,
          shockIds: Array.isArray(stored.meta.shockIds)
            ? stored.meta.shockIds
            : [],
        });
        setUsedShockIds(
          Array.isArray(stored.meta.shockIds) ? stored.meta.shockIds : []
        );
        const lastStance = stored.meta.stances?.at(-1);
        if (lastStance && isStance(lastStance)) setStance(lastStance);
        if (stored.meta.callbackRound && !stored.meta.verdict) {
          setCallbackLetter({
            decision: "callback",
            letter:
              "They asked for another pass. The letter is not finished.",
          });
        }
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
      if (!text || busy || preparingSpeech || themTalking || decided || shockCut) {
        return;
      }

      void unlockScore();
      stopListen();
      setError(null);
      setBusy(true);
      setTyped("");

      const alreadyUsed = usedShockRef.current;
      const shock =
        alreadyUsed.length < 1 ? matchShockCut(text, alreadyUsed) : null;
      if (shock) {
        usedShockRef.current = [...alreadyUsed, shock.id];
        setUsedShockIds(usedShockRef.current);
        setShockCut(shock);
        setHeardFlash(true);
        playShockSting();
        window.setTimeout(() => setHeardFlash(false), 2400);
      }

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
            stance,
            directiveId: directive.id,
            building: {
              round,
              total: totalRounds(),
              hires: done.filter((item) => item.verdict?.decision === "hire")
                .length,
              rejects: done.filter((item) => item.verdict?.decision === "reject")
                .length,
              obsessed: done.filter(
                (item) => item.verdict?.decision === "obsessed"
              ).length,
              cleanPasses: done.filter((item) => item.hourScore?.passed).length,
              flagged: done.filter((item) => item.hourScore && !item.hourScore.passed)
                .length,
              midpoint: campaign.midpointSeen || round >= 3,
              badgeRequested: file.badgeRequested,
              hasNote: Boolean(getNote(file, interviewer.id)?.text),
              throughlineEcho: run?.throughline.echo || "",
              nightTitle: run?.night.title || "",
              premiseTitle: run?.premise.title || "",
              callbackRound: meta.callbackRound,
            },
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
        const nextStances = Array.isArray(nextMeta.stances)
          ? nextMeta.stances.filter(isStance)
          : [...(meta.stances || []), stance];
        const callback =
          verdict?.decision === "callback" || Boolean(nextMeta.callbackRound);
        const closed =
          verdict && verdict.decision !== "callback" ? verdict : undefined;
        setMeta({
          turnCount: nextMeta.turnCount ?? 0,
          therapyScore: nextMeta.therapyScore ?? 0,
          phase: nextMeta.phase ?? "strict",
          lastImageTurn: nextMeta.lastImageTurn ?? 0,
          stances: nextStances,
          callbackRound: callback && !closed,
          verdict: closed,
          shockIds: usedShockRef.current,
        });
        if (verdict?.decision === "callback" && !closed) {
          setCallbackLetter(verdict);
          updateContact(interviewer.id, {
            preview: reply,
            verdict: undefined,
            callbackPending: true,
            directiveId: contact?.directiveId || directive.id,
          });
        } else if (closed) {
          const hourScore = scoreHour({
            directive,
            stances: nextStances,
            userTexts: nextMessages
              .filter((item) => item.role === "user")
              .map((item) => item.content),
            therapyScore: nextMeta.therapyScore ?? 0,
            verdict: closed.decision,
            job: appliedJob,
          });
          setCallbackLetter(null);
          updateContact(interviewer.id, {
            preview: reply,
            verdict: closed,
            callbackPending: false,
            hourScore,
            directiveId: contact?.directiveId || directive.id,
          });
        } else {
          updateContact(interviewer.id, {
            preview: reply,
            directiveId: contact?.directiveId || directive.id,
          });
        }
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
      stance,
      directive,
      round,
      done,
      campaign.midpointSeen,
      file,
      run,
      contact,
      shockCut,
    ]
  );

  useEffect(() => {
    sendRef.current = sendUserMessage;
  }, [sendUserMessage]);

  const tryStartListen = () => {
    if (inputLocked || !sttOk) return;
    void unlockScore();
    startListen();
  };

  const beginInterview = useCallback(() => {
    cancel();
    stopListen();
    setError(null);
    setStarted(true);
    const themId = uid();
    setLines([{ id: themId, role: "them", text: openingLine }]);
    setMessages([{ role: "assistant", content: openingLine }]);
    setMeta({
      turnCount: 0,
      therapyScore: 0,
      phase: "strict",
      lastImageTurn: 0,
      stances: [],
      callbackRound: false,
      shockIds: [],
    });
    setTyped("");
    setCallbackLetter(null);
    setStance("work");
    setShockCut(null);
    setUsedShockIds([]);
    usedShockRef.current = [];
    setHeardFlash(false);
    void startPersonScore(interviewer.id);
    void unlockScore();
    updateContact(interviewer.id, {
      preview: openingLine,
      verdict: undefined,
      callbackPending: false,
      hourScore: undefined,
      directiveId: contact?.directiveId || directive.id,
    });
    startPersonaSpeech(themId, openingLine);
  }, [
    cancel,
    stopListen,
    openingLine,
    interviewer.id,
    startPersonaSpeech,
    contact?.directiveId,
    directive.id,
  ]);

  useEffect(() => {
    if (!hydrated || !contact || started || storedVerdict || autoStartRef.current) {
      return;
    }
    autoStartRef.current = true;
    beginInterview();
  }, [hydrated, contact, started, storedVerdict, beginInterview]);

  const restart = () => {
    cancel();
    stopListen();
    setBusy(false);
    setStarted(false);
    setLines([]);
    setMessages([]);
    setMeta({
      turnCount: 0,
      therapyScore: 0,
      phase: "strict",
      lastImageTurn: 0,
      stances: [],
      callbackRound: false,
      shockIds: [],
    });
    setTyped("");
    setError(null);
    setSpeechReveal(null);
    setCallbackLetter(null);
    setStance("work");
    setShockCut(null);
    setUsedShockIds([]);
    usedShockRef.current = [];
    setHeardFlash(false);
    updateContact(interviewer.id, {
      verdict: undefined,
      preview: "New interview",
      callbackPending: false,
      hourScore: undefined,
    });
    clearConversation(interviewer.id);
    autoStartRef.current = false;
  };

  const logout = async () => {
    cancel();
    stopListen();
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  };

  const activeVerdict = closedVerdict;
  const downloadLetter = () => {
    if (!activeVerdict) return;
    downloadVerdictPdf({
      interviewer,
      appliedJob,
      verdict: activeVerdict,
    });
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
        : decided
          ? coverJobLine(appliedJob)
          : clockLabel(meta.turnCount, windowTurns.forceVerdict);

  return (
    <main
      className={`messenger-shell thread-shell${stress.alert ? " alert-red" : ""}${shocking ? " shocking" : ""}`}
      style={themeStyle(interviewer.theme) as CSSProperties}
    >
      <ContactsSidebar selectedId={interviewer.id} compact />

      <section className="chat-thread">
        <div className="thread-top">
        {stress.alert ? (
          <p className="copied-live">COPIED LIVE · RED ALERT · {stress.bpm} BPM</p>
        ) : null}
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
            <button
              type="button"
              className={`icon-button ${notesOpen ? "active" : ""}`}
              onClick={() => setNotesOpen((open) => !open)}
              aria-label={notesOpen ? "Close night note" : "Night note"}
              aria-pressed={notesOpen}
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M6 4h9l5 5v11H6Z" />
                <path d="M15 4v5h5M8 13h8M8 17h6" />
              </svg>
            </button>
            {started ? (
              <button
                type="button"
                className="icon-button"
                onClick={restart}
                disabled={shocking}
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
        <div
          className={`stress-hud${stress.alert ? " alert" : ""}`}
          aria-live="polite"
        >
          <span
            className="stress-heart"
            style={{ animationDuration: `${60 / Math.max(52, stress.bpm)}s` }}
          >
            ♥
          </span>
          <div className="stress-meta">
            <span>{stress.label}</span>
            <strong>{stress.bpm} BPM</strong>
          </div>
          <div className="stress-bar" aria-hidden>
            <i style={{ width: `${stress.stress}%` }} />
          </div>
          <span className="stress-hour">
            Q{questionNow}/{windowTurns.forceVerdict || QUESTIONS_PER_HOUR}
          </span>
        </div>
        </div>

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
                  {lastHour ? "See the ending" : "Continue the story"}
                </Link>
                <Link href="/file" className="text-button">
                  Open file
                </Link>
                <button type="button" className="text-button" onClick={downloadLetter}>
                  Download letter
                </button>
                <button type="button" className="text-button" onClick={beginInterview}>
                  Interview again
                </button>
              </>
            ) : (
              <small>They are reaching you…</small>
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
              <div className="hour-brief">
                <p className="app-kicker">
                  Hour {round} of {totalRounds()} · Question {questionNow} of{" "}
                  {windowTurns.forceVerdict || QUESTIONS_PER_HOUR}
                </p>
                <strong>{directive.title}</strong>
                <span>{directive.body}</span>
              </div>
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
              {callbackLetter && !decided ? (
                <div className="verdict-card callback-card">
                  <p className="app-kicker">{verdictLabel(callbackLetter.decision)}</p>
                  <h3>{verdictHeadline(callbackLetter.decision)}</h3>
                  <p>{callbackLetter.letter}</p>
                  <p className="callback-note">
                    The hour is not closed. They want another pass. Pick a stance
                    and answer.
                  </p>
                </div>
              ) : null}
              {activeVerdict && !themTalking && !showThinking ? (
                <div className="verdict-card">
                  <p className="app-kicker">{verdictLabel(activeVerdict.decision)}</p>
                  <h3>{verdictHeadline(activeVerdict.decision)}</h3>
                  <p>{activeVerdict.letter}</p>
                  {contact?.hourScore ? (
                    <p className="callback-note">
                      Brief {contact.hourScore.passed ? "held" : "flagged"}:{" "}
                      {directive.title}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="composer">
              {notesOpen ? (
                <div className="note-sheet">
                  <p className="app-kicker">Night note</p>
                  <NightNote interviewerId={interviewer.id} compact />
                </div>
              ) : null}
              {error ? <p className="composer-error">{error}</p> : null}
              {activeVerdict ? (
                <div className="composer-row story-continue">
                  <Link href="/story" className="start-chat-button">
                    {lastHour ? "See the ending" : "Continue the story"}
                  </Link>
                  <Link href="/file" className="text-button">
                    Open file
                  </Link>
                  <button type="button" className="text-button" onClick={downloadLetter}>
                    Download PDF
                  </button>
                </div>
              ) : (
                <>
                  <div className="stance-row" role="radiogroup" aria-label="How you play this turn">
                    {STANCES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={stance === item.id}
                        className={`stance-chip ${stance === item.id ? "active" : ""}`}
                        onClick={() => setStance(item.id)}
                        disabled={inputLocked}
                        title={item.hint}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <p className="stance-hint">
                    {STANCES.find((item) => item.id === stance)?.hint}
                  </p>
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
                </>
              )}
            </div>
          </>
        )}
      </section>
      {stress.alert ? <div className="alert-vignette" aria-hidden /> : null}
      {heardFlash ? (
        <div className="they-heard" role="status">
          THEY HEARD THAT
        </div>
      ) : null}
      {shockCut ? (
        <ShockCutscene cut={shockCut} onDone={() => setShockCut(null)} />
      ) : null}
    </main>
  );
}
