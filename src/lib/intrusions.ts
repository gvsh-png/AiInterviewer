import type { Interviewer } from "@/lib/interviewers";
import type { StillKind } from "@/lib/cutscenes";

export type DeskTakeover = {
  id: "desk-line";
  still: StillKind;
  video: string | null;
  callerKicker: string;
  callerName: string;
  callerJob: string;
  ringLabel: string;
  declineFail: string;
  callLine: string;
  possessKicker: string;
  possessLine: string;
  typedLine: string;
  memoStamp: string;
  memoTitle: string;
  memoBody: string;
  tabs: [string, string, string, string];
};

export const DESK_LINE_CUES = [
  "pick up",
  "hang up",
  "call me",
  "calling you",
  "your phone",
  "the phone",
  "voicemail",
  "desk line",
  "hear you",
  "hearing you",
  "look at me",
  "listen to me",
  "watching you",
  "i can see you",
  "don't look away",
  "do not look away",
  "stay on the line",
  "print that",
  "write that down",
  "the printers",
];

export function matchDeskLine(text: string) {
  const hay = text.toLowerCase();
  return DESK_LINE_CUES.some((cue) => hay.includes(cue));
}

export function shouldForceDeskLine(input: {
  used: boolean;
  afterShock: boolean;
  alert: boolean;
  turnCount: number;
  decided: boolean;
}) {
  if (input.used || input.decided) return false;
  if (input.afterShock) return true;
  if (input.alert && input.turnCount >= 2) return true;
  return false;
}

export function deskTakeover(
  person: Pick<Interviewer, "name" | "title" | "job" | "company">,
  coverJob = person.job
): DeskTakeover {
  const first = person.name.split(" ")[0] || person.name;
  const last =
    person.name.split(" ").slice(1).join(" ") || person.name.toUpperCase();
  return {
    id: "desk-line",
    still: "phone",
    video: "/stills/intro.mp4",
    callerKicker: `${person.company} desk line`,
    callerName: person.name,
    callerJob: coverJob,
    ringLabel: "Incoming",
    declineFail: "THEY'RE ALREADY IN",
    callLine: `${first} does not leave voicemail. The hour is using the building phone.`,
    possessKicker: "They have the desk",
    possessLine: `${first} is in the chrome now. PROBE is only a name they can wear.`,
    typedLine: `Stay on ${coverJob}. Do not look at the glass.`,
    memoStamp: "COPIED LIVE",
    memoTitle: `${last.toUpperCase()} / ${coverJob.toUpperCase()}`,
    memoBody: `The printers already have your last answer for ${coverJob}. ${first} filed it before you finished the sentence. Crumple this and keep the hour.`,
    tabs: [first, coverJob.split(" ")[0] || "Desk", "COPY", "STAY"],
  };
}
