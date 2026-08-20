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
  detectProbeScoreDelta,
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
  playHitTone,
  playShockSting,
  setScoreBpm,
  startPersonScore,
  stopNightScore,
  unlockScore,
} from "@/lib/nightScore";
import { matchShockCut, type ShockCut } from "@/lib/shockCuts";
import {
  deskTakeover,
  matchDeskLine,
  shouldForceDeskLine,
  type DeskTakeover,
} from "@/lib/intrusions";
import {
  collectStamp,
  deskClick,
  grantAward,
  pinLine,
  playFun,
} from "@/lib/funKit";
import { interviewStress } from "@/lib/stress";
import {
  comboHit,
  copySerial,
  makeScraps,
  stanceHit,
  verdictHit,
  type HitPop,
  type PaperScrap,
} from "@/lib/hits";
import {
  MOOD_RECIPES,
  PERSON_MOODS,
  interviewScoreMood,
} from "@/lib/scoreMood";
import {
  pickLiveDirection,
  pickTalkCut,
  type TalkCut,
} from "@/lib/talkCuts";
import ShockCutscene from "@/components/ShockCutscene";
import HitLayer from "@/components/HitLayer";
import TalkCutIn from "@/components/TalkCutIn";
import IntrusionShow from "@/components/IntrusionShow";

type Line = {
  id: string;
  role: "them" | "you";
  text: string;
  imageUrl?: string;
  imageCaption?: string;
  whisper?: boolean;
  stanceInk?: Stance;
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
  const [hits, setHits] = useState<HitPop[]>([]);
  const [scraps, setScraps] = useState<PaperScrap[]>([]);
  const [combo, setCombo] = useState(0);
  const [copies, setCopies] = useState(0);
  const [punch, setPunch] = useState(false);
  const [invertFlash, setInvertFlash] = useState(false);
  const [flicker, setFlicker] = useState(false);
  const [talkCut, setTalkCut] = useState<{
    cut: TalkCut;
    lineId: string;
  } | null>(null);
  const [intrusion, setIntrusion] = useState<DeskTakeover | null>(null);
  const [crumpled, setCrumpled] = useState<string[]>([]);
  const [whisperArm, setWhisperArm] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const comboRef = useRef({ stance: "work" as Stance | null, count: 0 });
  const stampedRef = useRef(false);
  const alertedRef = useRef(false);
  const talkUsedRef = useRef<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const usedShockRef = useRef<string[]>([]);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => {});
  const lockedRef = useRef(false);
  const autoStartRef = useRef(false);
  const intrusionUsedRef = useRef(false);
  const pendingTakeoverRef = useRef(false);
  const intrusionOpenRef = useRef(false);
  const pendingSpeechRef = useRef<{ lineId: string; reply: string } | null>(
    null
  );
  const startTakeoverRef = useRef<() => void>(() => {});
  const whisperTimer = useRef<number | null>(null);

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
  const invading = Boolean(intrusion);
  const inputLocked =
    busy || preparingSpeech || themTalking || decided || shocking || invading;
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
  const lastQuestion = meta.turnCount >= windowTurns.forceVerdict - 1 && !decided;
  const scoreMood = interviewScoreMood({
    home: PERSON_MOODS[interviewer.id],
    phase: meta.phase,
    stance,
    stress: stress.stress,
    alert: stress.alert,
    lastQuestion,
  });
  const direction = pickLiveDirection(
    campaign.seed || interviewer.id,
    round,
    meta.turnCount
  );

  useEffect(() => {
    lockedRef.current = inputLocked;
  }, [inputLocked]);

  useEffect(() => {
    usedShockRef.current = usedShockIds;
  }, [usedShockIds]);

  useEffect(() => {
    void startPersonScore(interviewer.id, scoreMood);
    return () => stopNightScore();
  }, [interviewer.id, scoreMood]);

  useEffect(() => {
    const kick = () => {
      void startPersonScore(interviewer.id, scoreMood);
      void unlockScore();
    };
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, [interviewer.id, scoreMood]);

  useEffect(() => {
    setScoreBpm(stress.bpm);
  }, [stress.bpm]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.funMood = scoreMood;
    root.dataset.funAlert = stress.alert ? "1" : "";
    root.dataset.funLast = lastQuestion ? "1" : "";
    root.dataset.funCoffee = meta.turnCount >= 3 ? "1" : "";
    root.dataset.funCopy = String(copies);
  }, [scoreMood, stress.alert, lastQuestion, meta.turnCount, copies]);

  useEffect(() => {
    if (scoreMood === "horror") playFun("rain-hush");
  }, [scoreMood]);

  const pushHit = useCallback((partial: Omit<HitPop, "id">) => {
    const hit: HitPop = { ...partial, id: uid() };
    setHits((prev) => [...prev.slice(-2), hit]);
    window.setTimeout(() => {
      setHits((prev) => prev.filter((item) => item.id !== hit.id));
    }, 1500);
  }, []);

  useEffect(() => {
    if (!stress.alert || alertedRef.current) return;
    alertedRef.current = true;
    pushHit({ kind: "alert", label: "RED ALERT", sub: `${stress.bpm} BPM` });
    playHitTone("alert");
    setInvertFlash(true);
    window.setTimeout(() => setInvertFlash(false), 180);
    if (
      shouldForceDeskLine({
        used: intrusionUsedRef.current,
        afterShock: false,
        alert: true,
        turnCount: meta.turnCount,
        decided,
      }) &&
      !shockCut
    ) {
      window.setTimeout(() => startTakeoverRef.current(), 780);
    }
  }, [
    stress.alert,
    stress.bpm,
    pushHit,
    meta.turnCount,
    shockCut,
    decided,
  ]);

  useEffect(() => {
    if (!stress.alert) return;
    const tick = window.setInterval(() => {
      setFlicker(true);
      window.setTimeout(() => setFlicker(false), 90);
    }, 2200);
    return () => window.clearInterval(tick);
  }, [stress.alert]);

  useEffect(() => {
    if (!closedVerdict || stampedRef.current) return;
    stampedRef.current = true;
    const hit = verdictHit(closedVerdict.decision);
    pushHit(hit);
    playHitTone("stamp");
    setScraps(makeScraps(closedVerdict.decision === "obsessed" ? 28 : 18));
    setPunch(true);
    setInvertFlash(true);
    collectStamp(closedVerdict.decision.toUpperCase());
    playFun("door-close");
    if (closedVerdict.decision === "hire") playFun("hire-confetti");
    if (closedVerdict.decision === "reject") playFun("reject-redact");
    if (closedVerdict.decision === "obsessed") playFun("heart-stamp");
    if (closedVerdict.decision === "callback") playFun("callback-ring");
    const hires = done.filter((item) => item.verdict?.decision === "hire").length;
    if (closedVerdict.decision === "hire" && hires + 1 >= 3) playFun("ticker-tape");
    window.setTimeout(() => setPunch(false), 220);
    window.setTimeout(() => setInvertFlash(false), 200);
    window.setTimeout(() => setScraps([]), 2200);
  }, [closedVerdict, pushHit, done]);

  useEffect(() => {
    if (!themTalking || shockCut || intrusion || decided) return;
    const lineId = speechReveal?.lineId;
    if (!lineId) return;
    const cut = pickTalkCut(
      campaign.seed || interviewer.id,
      meta.turnCount,
      talkUsedRef.current
    );
    if (!cut) return;
    const delay = 850 + (meta.turnCount % 3) * 280;
    const timer = window.setTimeout(() => {
      if (talkUsedRef.current.includes(cut.id)) return;
      talkUsedRef.current = [...talkUsedRef.current, cut.id];
      setTalkCut({ cut, lineId });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    themTalking,
    shockCut,
    intrusion,
    decided,
    campaign.seed,
    interviewer.id,
    meta.turnCount,
    speechReveal?.lineId,
  ]);

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
        if (stored.meta.verdict) stampedRef.current = true;
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

  const startTakeover = useCallback(() => {
    if (intrusionUsedRef.current || decided) return;
    intrusionUsedRef.current = true;
    pendingTakeoverRef.current = false;
    intrusionOpenRef.current = true;
    cancel();
    stopListen();
    setTalkCut(null);
    setIntrusion(deskTakeover(interviewer, appliedJob));
  }, [cancel, decided, interviewer, appliedJob, stopListen]);

  useEffect(() => {
    startTakeoverRef.current = startTakeover;
  }, [startTakeover]);

  const sendUserMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (
        !text ||
        busy ||
        preparingSpeech ||
        themTalking ||
        decided ||
        shockCut ||
        intrusion
      ) {
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
        pendingTakeoverRef.current = true;
      } else if (matchDeskLine(text) && !intrusionUsedRef.current) {
        pendingTakeoverRef.current = true;
        window.setTimeout(() => startTakeover(), 520);
      }

      const nextCombo =
        comboRef.current.stance === stance ? comboRef.current.count + 1 : 1;
      comboRef.current = { stance, count: nextCombo };
      setCombo(nextCombo);
      setCopies((value) => value + 1);
      playHitTone("send");
      playFun("send-whoosh");
      playFun("bubble-pop");
      if (lines.filter((item) => item.role === "you").length === 0) {
        playFun("gold-clip");
        grantAward("gold-clip");
      }
      playHitTone(stance, nextCombo);
      pushHit(stanceHit(stance));
      const chain = comboHit(nextCombo);
      if (chain) {
        pushHit(chain);
        playHitTone("combo", nextCombo);
        if (nextCombo >= 3) {
          setInvertFlash(true);
          window.setTimeout(() => setInvertFlash(false), 160);
        }
      }
      if (detectProbeScoreDelta(text) >= 1 && stance !== "probe") {
        pushHit({ kind: "probe", label: "UNWRITTEN", sub: "THEY FLINCHED" });
        playHitTone("probe", nextCombo);
      }
      if (meta.turnCount + 1 >= windowTurns.forceVerdict && !decided) {
        pushHit({ kind: "last", label: "LAST QUESTION", sub: "THE LETTER IS TYPING" });
      }
      setPunch(true);
      window.setTimeout(() => setPunch(false), 180);

      const nextLines: Line[] = [
        ...lines,
        { id: uid(), role: "you", text, whisper: whisperArm, stanceInk: stance },
      ];
      setWhisperArm(false);
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
        if (intrusionOpenRef.current || pendingTakeoverRef.current) {
          pendingSpeechRef.current = { lineId: themId, reply };
        } else {
          startPersonaSpeech(themId, reply);
        }
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
      intrusion,
      pushHit,
      windowTurns.forceVerdict,
      startTakeover,
      whisperArm,
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
    setHits([]);
    setScraps([]);
    setCombo(0);
    setCopies(0);
    setPunch(false);
    setInvertFlash(false);
    comboRef.current = { stance: null, count: 0 };
    stampedRef.current = false;
    alertedRef.current = false;
    talkUsedRef.current = [];
    setTalkCut(null);
    setIntrusion(null);
    intrusionUsedRef.current = false;
    pendingTakeoverRef.current = false;
    intrusionOpenRef.current = false;
    pendingSpeechRef.current = null;
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
    playFun("retry-shake");
    deskClick("paper-tear");
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
    setHits([]);
    setScraps([]);
    setCombo(0);
    setCopies(0);
    setPunch(false);
    setInvertFlash(false);
    comboRef.current = { stance: null, count: 0 };
    stampedRef.current = false;
    alertedRef.current = false;
    talkUsedRef.current = [];
    setTalkCut(null);
    setIntrusion(null);
    intrusionUsedRef.current = false;
    pendingTakeoverRef.current = false;
    intrusionOpenRef.current = false;
    pendingSpeechRef.current = null;
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
    playFun("logout-slam");
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
      className={`messenger-shell thread-shell themed-hour mood-${scoreMood}${stress.alert ? " alert-red" : ""}${shocking ? " shocking" : ""}${invading ? " invading" : ""}${punch ? " punch" : ""}${invertFlash ? " invert-flash" : ""}${stress.stress >= 48 ? " chroma" : ""}${themTalking ? " them-talking" : ""}${lastQuestion ? " fun-lights" : ""}${meta.turnCount >= 3 ? " fun-coffee" : ""}`}
      data-fun={lastQuestion ? "lights-out" : meta.turnCount >= 3 ? "late-coffee" : "tap-haptic"}
      style={themeStyle(interviewer.theme) as CSSProperties}
    >
      <ContactsSidebar selectedId={interviewer.id} compact />

      <section className="chat-thread">
        <div className="thread-top">
        {stress.alert ? (
          <p className="copied-live">COPIED LIVE · RED ALERT · {stress.bpm} BPM</p>
        ) : null}
        <header
          className="thread-header fun-sheen"
          data-fun="flashlight"
          onDoubleClick={() => playFun("flashlight")}
        >
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
            <h1 className={flicker ? "glitch-name" : undefined}>{interviewer.name}</h1>
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
                disabled={shocking || invading}
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
            <span>{MOOD_RECIPES[scoreMood].label}</span>
            <strong>{stress.bpm} BPM</strong>
          </div>
          <div className="stress-bar" aria-hidden>
            <i style={{ width: `${stress.stress}%` }} />
          </div>
          <span className="stress-hour">
            <span className="stress-copy" data-fun="copy-badge">
              {copySerial(copies)}
            </span>
            <span>
              {combo >= 2
                ? `${combo}×`
                : `Q${questionNow}/${windowTurns.forceVerdict || QUESTIONS_PER_HOUR}`}
            </span>
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
            <div className="transcript-stage">
            <div className="transcript" ref={scrollRef}>
              <div className="hour-brief fun-sticky-brief" data-fun="sticky-brief">
                <p className="app-kicker hour-brief-kicker">
                  <span>
                    Hour {round} of {totalRounds()}
                  </span>
                  <span>
                    Question {questionNow} of{" "}
                    {windowTurns.forceVerdict || QUESTIONS_PER_HOUR}
                  </span>
                  <span className="hour-mood">
                    {MOOD_RECIPES[scoreMood].label}
                  </span>
                </p>
                <strong>{directive.title}</strong>
                <span>{directive.body}</span>
                <p className="desk-direction">
                  <em>{direction.kicker}</em>
                  {direction.title}. {direction.body}
                </p>
              </div>
              <div className="conversation-date">Today</div>
              {lines
                .filter((line) => line.id !== pendingSpeechLineId)
                .map((line) => {
                  const firstYou =
                    line.role === "you" &&
                    lines.find((item) => item.role === "you")?.id === line.id;
                  const folded = line.text.length > 140;
                  return (
                  <div
                    key={line.id}
                    className={`message-row ${line.role === "them" ? "incoming" : "outgoing"}${stress.alert ? " jitter" : ""}${line.role === "you" ? " slam-out" : " slam-in"}${line.whisper ? " fun-whisper" : ""}${crumpled.includes(line.id) ? " fun-crumpled" : ""}${line.role === "them" && meta.phase !== "strict" ? " fun-leak" : ""}`}
                    data-fun={line.role === "you" ? "bubble-fly" : "leak-jitter"}
                    onDoubleClick={() => {
                      pinLine({
                        id: line.id,
                        text: line.text.slice(0, 180),
                        name: firstName,
                        at: Date.now(),
                      });
                      setPinnedIds((prev) =>
                        prev.includes(line.id)
                          ? prev.filter((id) => id !== line.id)
                          : [...prev, line.id]
                      );
                      playFun("pin-clip");
                    }}
                    onTouchEnd={(event) => {
                      if (line.role !== "you") return;
                      const touch = event.changedTouches[0];
                      if (!touch) return;
                      const start = Number(
                        (event.currentTarget as HTMLElement).dataset.x || 0
                      );
                      if (start && touch.clientX - start < -70) {
                        setCrumpled((prev) => [...prev, line.id]);
                        playFun("crumple-swipe");
                      }
                    }}
                    onTouchStart={(event) => {
                      const touch = event.touches[0];
                      if (touch) {
                        (event.currentTarget as HTMLElement).dataset.x = String(
                          touch.clientX
                        );
                      }
                    }}
                  >
                    {line.role === "them" ? (
                      <PersonaAvatar
                        interviewer={interviewer}
                        size="sm"
                        className="message-avatar"
                      />
                    ) : null}
                    <div className="message-content">
                      <div
                        className={`message-bubble${folded ? " fun-fold" : ""}${line.stanceInk ? ` stance-${line.stanceInk}` : ""}${firstYou ? " fun-gold" : ""}${pinnedIds.includes(line.id) ? " fun-pinned" : ""}`}
                        data-fun={firstYou ? "gold-clip" : folded ? "fold-mark" : "stance-tint"}
                      >
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
                          <figure className="speech-photo fun-polaroid-tilt" data-fun="polaroid-tilt">
                            <img
                              src={line.imageUrl}
                              alt={line.imageCaption || `${firstName} shared a photo`}
                              className="speech-photo-img"
                            />
                            <figcaption data-fun="hand-caption" className="fun-hand">
                              {line.imageCaption || "Shared photo"}
                            </figcaption>
                          </figure>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
                })}
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
                <div className="verdict-card callback-card slam fun-ring" data-fun="callback-ring">
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
                <div className="verdict-card slam fun-letter" data-fun="letter-type">
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
            {talkCut &&
            themTalking &&
            !shockCut &&
            !intrusion &&
            talkCut.lineId === speechReveal?.lineId ? (
              <TalkCutIn cut={talkCut.cut} direction={direction} />
            ) : null}
            </div>

            <div
              className={`composer fun-sticky${
                meta.turnCount >= windowTurns.forceVerdict - 1 && !decided
                  ? " last-call"
                  : ""
              }${combo >= 3 ? " hot-combo" : ""}`}
              data-fun="sticky-tab"
              onTouchEnd={(event) => {
                const start = Number(
                  (event.currentTarget as HTMLElement).dataset.y || 0
                );
                const touch = event.changedTouches[0];
                if (start && touch && touch.clientY - start > 40) {
                  setNotesOpen(true);
                  playFun("note-swipe");
                }
              }}
              onTouchStart={(event) => {
                const touch = event.touches[0];
                if (touch) {
                  (event.currentTarget as HTMLElement).dataset.y = String(
                    touch.clientY
                  );
                }
              }}
            >
              {notesOpen ? (
                <div className="note-sheet">
                  <p className="app-kicker">Night note</p>
                  <NightNote interviewerId={interviewer.id} compact />
                </div>
              ) : null}
              {error ? (
                <p className="composer-error fun-error" data-fun="error-stamp">
                  {error}
                </p>
              ) : null}
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
                        data-fun="stance-tick"
                        onClick={() => {
                          setStance(item.id);
                          deskClick("stance-tick");
                        }}
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
                      data-fun="mic-bars"
                      onClick={() => (listening ? stopListen() : tryStartListen())}
                      disabled={!sttOk || inputLocked}
                      aria-label={listening ? "Stop listening" : "Speak"}
                    >
                      {listening ? (
                        <span className="fun-mic" aria-hidden>
                          <i />
                          <i />
                          <i />
                        </span>
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
                        className={`send-button${typed.trim() && !inputLocked ? " armed" : ""}${whisperArm ? " fun-whisper-arm" : ""}`}
                        data-fun={whisperArm ? "whisper-send" : "send-armed"}
                        disabled={inputLocked || !typed.trim()}
                        aria-label={whisperArm ? "Whisper send" : "Send"}
                        onPointerDown={() => {
                          if (whisperTimer.current) {
                            window.clearTimeout(whisperTimer.current);
                          }
                          whisperTimer.current = window.setTimeout(() => {
                            setWhisperArm(true);
                            playFun("whisper-send");
                          }, 420);
                        }}
                        onPointerUp={() => {
                          if (whisperTimer.current) {
                            window.clearTimeout(whisperTimer.current);
                          }
                        }}
                        onPointerLeave={() => {
                          if (whisperTimer.current) {
                            window.clearTimeout(whisperTimer.current);
                          }
                        }}
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
      <HitLayer hits={hits} scraps={scraps} />
      {heardFlash ? (
        <div className="they-heard" role="status">
          THEY HEARD THAT
        </div>
      ) : null}
      {shockCut ? (
        <ShockCutscene
          cut={shockCut}
          onDone={() => {
            setShockCut(null);
            if (pendingTakeoverRef.current) startTakeover();
          }}
        />
      ) : null}
      {intrusion ? (
        <IntrusionShow
          takeover={intrusion}
          interviewer={interviewer}
          onSpeak={(line) => speak(line, { interviewerId: interviewer.id })}
          onDone={() => {
            cancel();
            intrusionOpenRef.current = false;
            setIntrusion(null);
            const queued = pendingSpeechRef.current;
            if (queued) {
              pendingSpeechRef.current = null;
              startPersonaSpeech(queued.lineId, queued.reply);
            }
          }}
        />
      ) : null}
    </main>
  );
}
