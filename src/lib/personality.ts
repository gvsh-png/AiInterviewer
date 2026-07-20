export type InterviewPhase =
  | "strict"
  | "cracking"
  | "confessional"
  | "enamored";

export type ConversationMeta = {
  turnCount: number;
  therapyScore: number;
  phase: InterviewPhase;
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
  if (therapyScore >= 6) return "enamored";
  if (turnCount >= 6) return "confessional";
  if (turnCount >= 3) return "cracking";
  return "strict";
}

const PHASE_GUIDE: Record<InterviewPhase, string> = {
  strict: `PHASE: STRICT / MASKED
Stay in professional interrogation mode with your twisted core leaking only as tiny cracks.`,
  cracking: `PHASE: CRACKING
Your twisted nature shows more. Derail into personal obsessions while still "interviewing."`,
  confessional: `PHASE: OPENING UP
Spill more of your dark personal life / secret habits. Still judge their answers selfishly.`,
  enamored: `PHASE: ATTACHED
They validated or mirrored you. Soften into dangerous attachment while remaining self-centered.`,
};

export function buildSystemPrompt(
  basePrompt: string,
  meta: ConversationMeta
): string {
  return `${basePrompt}

CURRENT STATE:
- Candidate turns so far: ${meta.turnCount}
- Affinity / therapy score: ${meta.therapyScore}
- Active phase: ${meta.phase}

${PHASE_GUIDE[meta.phase]}

If they try to end early, keep them talking — you are not done with them yet.`.trim();
}
