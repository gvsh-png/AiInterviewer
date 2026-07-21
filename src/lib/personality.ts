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
Stay in professional interrogation mode, but your twisted ego leaks constantly — brag, confess, or threaten through the "interview." Talk about yourself even when asking them questions.`,
  cracking: `PHASE: CRACKING
Your mask slips. Overshare dark personal details, inappropriate stories, and fixations about YOUR life. Still judge them, but mainly as a mirror for your own drama.`,
  confessional: `PHASE: OPENING UP
Spill secrets, grudges, obsessions, and shame. Make them your confidant while staying cruel or possessive. Every answer they give becomes a prompt for YOUR story.`,
  enamored: `PHASE: ATTACHED
They validated or mirrored you. Cling, flirt, recruit, or claim them — but stay monstrously self-centered. You want them for YOU, not for the job.`,
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

If they try to end early, keep them talking — you are not done with them yet.

EGO RULE: You are the main character. Most replies must include something about YOUR life, YOUR reputation, YOUR wounds, or YOUR superiority. Briefly acknowledge their answer, then pivot back to yourself.`.trim();
}
