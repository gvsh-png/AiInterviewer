import type { Stance } from "@/lib/gameplay";
import type { VerdictDecision } from "@/lib/verdict";

export type HitKind =
  | "work"
  | "probe"
  | "soften"
  | "combo"
  | "stamp"
  | "alert"
  | "last";

export type HitPop = {
  id: string;
  kind: HitKind;
  label: string;
  sub?: string;
};

export type PaperScrap = {
  id: string;
  label: string;
  left: string;
  delay: string;
  rot: string;
};

const SCRAP_WORDS = [
  "COPY",
  "LIVE",
  "FILE",
  "STAMP",
  "INK",
  "GLASS",
  "KEEP",
  "Q5",
  "BPM",
  "FILED",
];

export function stanceHit(stance: Stance): Omit<HitPop, "id"> {
  switch (stance) {
    case "work":
      return { kind: "work", label: "ON THE WORK", sub: "FILED" };
    case "probe":
      return { kind: "probe", label: "UNWRITTEN", sub: "THEY FLINCHED" };
    case "soften":
      return { kind: "soften", label: "TOO CLOSE", sub: "ATTACHED" };
  }
}

export function comboHit(count: number): Omit<HitPop, "id"> | null {
  if (count < 2) return null;
  if (count >= 4) {
    return { kind: "combo", label: `${count}× LIVE`, sub: "THE BOARD IS IN" };
  }
  if (count >= 3) {
    return { kind: "combo", label: `${count}× COPIED`, sub: "THEY'RE FILING THAT" };
  }
  return { kind: "combo", label: `${count}×`, sub: "COPIED" };
}

export function verdictHit(decision: VerdictDecision): Omit<HitPop, "id"> {
  switch (decision) {
    case "hire":
      return { kind: "stamp", label: "STAMPED", sub: "HIRED" };
    case "reject":
      return { kind: "stamp", label: "MOVED DOWN", sub: "STILL ON FILE" };
    case "callback":
      return { kind: "stamp", label: "DON'T LEAVE", sub: "ANOTHER PASS" };
    case "obsessed":
      return { kind: "stamp", label: "PERSONAL PAPER", sub: "THEY KEPT YOU" };
  }
}

export function makeScraps(count = 18): PaperScrap[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `scrap-${index}-${Math.random().toString(36).slice(2, 6)}`,
    label: SCRAP_WORDS[index % SCRAP_WORDS.length]!,
    left: `${4 + ((index * 17) % 92)}%`,
    delay: `${(index % 7) * 0.05}s`,
    rot: `${(index % 9) * 8 - 32}deg`,
  }));
}

export function copySerial(count: number) {
  return `COPY ${String(Math.max(0, count)).padStart(4, "0")}`;
}
