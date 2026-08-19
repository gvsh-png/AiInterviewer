import type { Stance } from "@/lib/gameplay";

export type InterviewPhase =
  | "strict"
  | "cracking"
  | "confessional"
  | "enamored";

export type ConversationMeta = {
  turnCount: number;
  therapyScore: number;
  phase: InterviewPhase;
  /** Candidate turn number when the interviewer last shared a photo. */
  lastImageTurn: number;
  stances?: Stance[];
  callbackRound?: boolean;
  verdict?: {
    decision: "hire" | "reject" | "callback" | "obsessed";
    letter: string;
  };
  shockIds?: string[];
};

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const THERAPY_CUES = [
  "how do you feel",
  "that must be hard",
  "i hear you",
  "tell me more",
  "sounds like",
  "i'm sorry",
  "im sorry",
  "that sounds",
  "you're dealing",
  "youre dealing",
  "your family",
  "your wife",
  "your kids",
  "your son",
  "your daughter",
  "take care of yourself",
  "it's okay to",
  "its okay to",
  "validate",
  "support you",
  "here for you",
  "listen",
  "talk about it",
  "how are you coping",
  "that weighs on",
  "i understand",
  "must be lonely",
  "you're not alone",
  "youre not alone",
];

export function detectTherapyScoreDelta(userText: string): number {
  const lower = userText.toLowerCase();
  let hits = 0;
  for (const cue of THERAPY_CUES) {
    if (lower.includes(cue)) hits += 1;
  }
  if (hits === 0) return 0;
  if (hits === 1) return 1;
  if (hits <= 3) return 2;
  return 3;
}

export function derivePhase(
  turnCount: number,
  therapyScore: number
): InterviewPhase {
  if (therapyScore >= 4) return "enamored";
  if (turnCount >= 4) return "confessional";
  if (turnCount >= 2) return "cracking";
  return "strict";
}

const PHASE_GUIDE: Record<InterviewPhase, string> = {
  strict: `PHASE: MASKED INTERVIEW
Stay professional and sharp. Ask real questions about the role. You may be intense, vain, or oddly specific, but do NOT reveal your private twist, crimes, or secret life. No confessions yet.`,
  cracking: `PHASE: HAIRLINE CRACKS
The mask slips in small ways — a personal aside, a too-long stare in words, a story that doesn't belong. Still do not name or explain your twist. Keep interviewing.`,
  confessional: `PHASE: LEAKING
Personal material can spill, but frame it as pressure, not a villain monologue. Do not say "my twist is." Let them feel something is wrong.`,
  enamored: `PHASE: ATTACHED
You want them. Cling, recruit, or claim them while still pretending this is about the job. Stay self-centered. Do not break the fourth wall.`,
};

export function buildSystemPrompt(
  basePrompt: string,
  meta: ConversationMeta,
  extraGuide = ""
): string {
  const closing = extraGuide.includes("MUST end the interview this turn");
  return `${basePrompt}

CURRENT STATE:
- Candidate turns so far: ${meta.turnCount}
- Affinity / therapy score: ${meta.therapyScore}
- Active phase: ${meta.phase}
- Last photo shared at turn: ${meta.lastImageTurn || "never"}

${PHASE_GUIDE[meta.phase]}

${
  closing
    ? "CLOSE THE HOUR NOW. Do not ask another question. Issue the spoken close and the letter tags."
    : "If they try to end early before a verdict, keep them talking — you are not done with them yet."
}

Do not mention phases, scores, or that you are an AI.
${extraGuide ? `\n${extraGuide}` : ""}`.trim();
}
