import type { InterviewerId } from "@/lib/interviewers";
import type { InterviewPhase } from "@/lib/personality";
import type { Stance } from "@/lib/gameplay";

export type ScoreMood = "upbeat" | "horror" | "tense" | "warm" | "late";

export type MoodRecipe = {
  steps: number[];
  stepMs: number;
  wave: OscillatorType;
  melodyVol: number;
  noise: number;
  filter: number;
  pulseHz: number;
  label: string;
};

export const PERSON_MOODS: Record<InterviewerId, ScoreMood> = {
  derek: "tense",
  marlene: "warm",
  voss: "horror",
  celeste: "warm",
  griffin: "upbeat",
  pike: "horror",
  june: "upbeat",
  romanov: "horror",
  ashley: "upbeat",
  hector: "late",
  vera: "tense",
  knox: "upbeat",
};

export const MOOD_RECIPES: Record<ScoreMood, MoodRecipe> = {
  upbeat: {
    steps: [0, 4, 7, 12, 7, 4, 2, 7],
    stepMs: 210,
    wave: "square",
    melodyVol: 0.05,
    noise: 0.016,
    filter: 1680,
    pulseHz: 4.2,
    label: "THE LAMPS ARE CHEERFUL",
  },
  horror: {
    steps: [0, 1, 6, 7, 6, 13, 1, 0],
    stepMs: 470,
    wave: "sawtooth",
    melodyVol: 0.048,
    noise: 0.11,
    filter: 240,
    pulseHz: 0.55,
    label: "THE ROOM IS WRONG",
  },
  tense: {
    steps: [0, 7, 0, 8, 0, 7],
    stepMs: 300,
    wave: "triangle",
    melodyVol: 0.045,
    noise: 0.05,
    filter: 520,
    pulseHz: 1.4,
    label: "THE CLOCK IS LOUD",
  },
  warm: {
    steps: [0, 3, 7, 10, 7, 3],
    stepMs: 390,
    wave: "sine",
    melodyVol: 0.042,
    noise: 0.028,
    filter: 920,
    pulseHz: 0.9,
    label: "TOO CLOSE IN HERE",
  },
  late: {
    steps: [0, 12, 6, 0, 5],
    stepMs: 620,
    wave: "triangle",
    melodyVol: 0.038,
    noise: 0.07,
    filter: 280,
    pulseHz: 0.4,
    label: "PAST CLOSE",
  },
};

export function interviewScoreMood(input: {
  home: ScoreMood;
  phase: InterviewPhase;
  stance: Stance;
  stress: number;
  alert: boolean;
  lastQuestion: boolean;
}): ScoreMood {
  if (input.alert || input.lastQuestion) return "horror";
  if (input.phase === "enamored") return "warm";
  if (input.phase === "confessional" || input.stance === "probe" || input.stress >= 60) {
    return "horror";
  }
  if (input.stance === "soften") return "warm";
  if (input.stance === "work" && input.stress < 48) {
    if (input.home === "horror") return "tense";
    if (input.home === "late") return "late";
    return "upbeat";
  }
  return input.home;
}
