import type { VerdictDecision } from "@/lib/verdict";
import type { StoryRun } from "@/lib/storySeed";

export type StillKind =
  | "building"
  | "hallway"
  | "door"
  | "file"
  | "letter"
  | "phone"
  | "chair"
  | "glass"
  | "desk"
  | "night"
  | "portrait";

export const STILL_KINDS: StillKind[] = [
  "building",
  "hallway",
  "door",
  "file",
  "letter",
  "phone",
  "chair",
  "glass",
  "desk",
  "night",
  "portrait",
];

export function isStillKind(value: string): value is StillKind {
  return STILL_KINDS.includes(value as StillKind);
}

export type CutsceneKind =
  | "prologue"
  | "arrive"
  | "aftermath"
  | "midpoint"
  | "ending";

export type Shot = {
  still: StillKind;
  kicker: string;
  line: string;
};

export type CutscenePerson = {
  name: string;
  title: string;
  company: string;
  job: string;
};

export type CutsceneContext = {
  run: StoryRun;
  kind: CutsceneKind;
  round: number;
  total: number;
  person?: CutscenePerson | null;
  lastVerdict?: VerdictDecision | null;
  lastName?: string | null;
  hires?: number;
  obsessed?: number;
  rejects?: number;
  endingTitle?: string;
};

export function cacheKey(ctx: CutsceneContext) {
  const person = ctx.person?.name || "none";
  const verdict = ctx.lastVerdict || "none";
  return `${ctx.run.seed}:${ctx.kind}:${ctx.round}:${person}:${verdict}`;
}

export function assembleShots(ctx: CutsceneContext): Shot[] {
  const { run, kind } = ctx;
  switch (kind) {
    case "prologue":
      return prologueShots(run);
    case "arrive":
      return arriveShots(ctx);
    case "aftermath":
      return aftermathShots(ctx);
    case "midpoint":
      return midpointShots(run);
    case "ending":
      return endingShots(ctx);
  }
}

function prologueShots(run: StoryRun): Shot[] {
  return [
    {
      still: "night",
      kicker: "PROBE",
      line: `The glass does not advertise. ${run.night.hook}`,
    },
    {
      still: "file",
      kicker: run.premise.title,
      line: run.premise.hook,
    },
    {
      still: "desk",
      kicker: run.throughline.title,
      line: run.throughline.echo,
    },
    {
      still: "chair",
      kicker: "Intake",
      line: "You do not pick the role. The building sends someone. You sit down.",
    },
    {
      still: "phone",
      kicker: "The loop",
      line: "Twelve hours. One file. They message first. Each hour ends with a letter.",
    },
  ];
}

function arriveShots(ctx: CutsceneContext): Shot[] {
  const { run, person, round, total } = ctx;
  const name = person?.name || "Someone";
  const job = person?.job || "the hour";
  return [
    {
      still: "hallway",
      kicker: `Hour ${round} of ${total}`,
      line: `${run.night.title}. The corridor only goes one way.`,
    },
    {
      still: "door",
      kicker: "Assignment",
      line: "A door that was not on your calendar is open. The chair inside is already facing you.",
    },
    {
      still: "file",
      kicker: job,
      line: `The heading on the hour is ${job}. You did not write it. ${run.throughline.echo}`,
    },
    {
      still: "portrait",
      kicker: name,
      line: `${name}, ${person?.title || "staff"} at ${person?.company || "PROBE"}, will message first. Do not call the desk.`,
    },
  ];
}

function aftermathShots(ctx: CutsceneContext): Shot[] {
  const { run, lastVerdict, lastName, round, total } = ctx;
  const name = lastName || "They";
  const stamp = stampLine(lastVerdict);
  const more = round < total;
  return [
    {
      still: "letter",
      kicker: "Letter",
      line: `${name}. ${stamp}`,
    },
    {
      still: "desk",
      kicker: run.throughline.title,
      line: run.throughline.echo,
    },
    {
      still: more ? "hallway" : "glass",
      kicker: more ? `Hour ${round + 1}` : "Close",
      line: more
        ? "The next interviewer received the copy anyway. Keep walking."
        : "The printers have the last page. PROBE will write the ending. You will not.",
    },
  ];
}

function midpointShots(run: StoryRun): Shot[] {
  return [
    {
      still: "glass",
      kicker: "Halfway",
      line: "Six hours in. People who leave early do not get copies of their file.",
    },
    {
      still: "night",
      kicker: run.night.title,
      line: run.night.hook,
    },
    {
      still: "file",
      kicker: run.throughline.title,
      line: `The pattern is visible now. ${run.throughline.echo}`,
    },
    {
      still: "building",
      kicker: "The board",
      line: "Speak as if the walls take minutes. They do. The second half is not safer.",
    },
  ];
}

function endingShots(ctx: CutsceneContext): Shot[] {
  const { run, endingTitle, hires = 0, obsessed = 0, rejects = 0 } = ctx;
  const close =
    endingTitle === "They kept you"
      ? "Too many letters were personal. PROBE does not send you home."
      : endingTitle === "Staff adjacent"
        ? "Offers stacked. Your badge is still pending. That is a kind of yes."
        : endingTitle === "Sample closed"
          ? "No hire. You were useful as a measurement. A new name is already printing."
          : "Some doors opened. Some letters were cold. The file is unresolved.";
  return [
    {
      still: "building",
      kicker: "Ending",
      line: `${run.premise.hook} That was the start. This is the last light in the lobby.`,
    },
    {
      still: "letter",
      kicker: "The tray",
      line: `${hires} hired. ${rejects} rejected. ${obsessed} letters that were not professional.`,
    },
    {
      still: "desk",
      kicker: run.throughline.title,
      line: run.throughline.echo,
    },
    {
      still: "glass",
      kicker: endingTitle || "File closed",
      line: close,
    },
    {
      still: "phone",
      kicker: "PROBE",
      line: "The chats remain if they want another hour. Do not answer after midnight.",
    },
  ];
}

function stampLine(decision?: VerdictDecision | null) {
  switch (decision) {
    case "hire":
      return "They stamped hired. That is not the same as free to leave.";
    case "reject":
      return "They stamped rejected. Your name moved down, not off.";
    case "callback":
      return "They want another hour. PROBE scheduled someone else first.";
    case "obsessed":
      return "The letter was not professional. The board kept it on file.";
    default:
      return "The letter is in the drawer.";
  }
}

export function recapTitle(kind: CutsceneKind, round: number) {
  switch (kind) {
    case "prologue":
      return "Prologue";
    case "arrive":
      return `Hour ${round} — arrival`;
    case "aftermath":
      return `Hour ${round} — letter`;
    case "midpoint":
      return "Halfway";
    case "ending":
      return "Ending";
  }
}

export function validateShots(raw: unknown): Shot[] | null {
  if (!raw || typeof raw !== "object") return null;
  const shots = (raw as { shots?: unknown }).shots;
  if (!Array.isArray(shots) || shots.length < 2) return null;
  const next: Shot[] = [];
  for (const item of shots.slice(0, 8)) {
    if (!item || typeof item !== "object") continue;
    const still = String((item as Shot).still || "");
    const line = String((item as Shot).line || "").trim();
    const kicker = String((item as Shot).kicker || "PROBE").trim();
    if (!line || !isStillKind(still)) continue;
    next.push({ still, kicker: kicker.slice(0, 48), line: line.slice(0, 280) });
  }
  return next.length >= 2 ? next : null;
}
