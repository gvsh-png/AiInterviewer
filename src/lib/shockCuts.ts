import type { StillKind } from "@/lib/cutscenes";

export type ShockShot = {
  still: StillKind;
  kicker: string;
  line: string;
  video?: string | null;
};

export type ShockCut = {
  id: string;
  cues: string[];
  kicker: string;
  title: string;
  shots: ShockShot[];
};

export const SHOCK_CUTS: ShockCut[] = [
  {
    id: "family",
    cues: [
      "your wife",
      "your family",
      "your kids",
      "your son",
      "your daughter",
      "your husband",
      "your marriage",
      "go home to",
    ],
    kicker: "Copied live",
    title: "They filed the personal",
    shots: [
      {
        still: "phone",
        kicker: "Desk",
        line: "You said a name that does not belong on this hour. The phone lights up anyway.",
      },
      {
        still: "chair",
        kicker: "Two chairs",
        line: "There is always an extra chair. It is listening harder now.",
      },
    ],
  },
  {
    id: "home",
    cues: [
      "where do you live",
      "your apartment",
      "your house",
      "walk you home",
      "come over",
    ],
    kicker: "Address",
    title: "The lobby kept that",
    shots: [
      {
        still: "building",
        kicker: "Outside",
        line: "The glass already knows the street. Do not give it the floor number.",
        video: "/stills/intro.mp4",
      },
      {
        still: "night",
        kicker: "Night",
        line: "You do not get to decide what the building remembers.",
      },
    ],
  },
  {
    id: "watch",
    cues: [
      "who is watching",
      "the board",
      "the camera",
      "are you recording",
      "they're listening",
      "they are listening",
    ],
    kicker: "Glass",
    title: "The minutes just caught up",
    shots: [
      {
        still: "glass",
        kicker: "Live",
        line: "You named the audience. They take that as permission.",
      },
      {
        still: "file",
        kicker: "Stamp",
        line: "A page you did not write is already under the lamp.",
      },
    ],
  },
  {
    id: "late",
    cues: [
      "stay late",
      "after hours",
      "after midnight",
      "don't go",
      "do not go",
      "keep talking",
    ],
    kicker: "Overtime",
    title: "The hour stretched",
    shots: [
      {
        still: "hallway",
        kicker: "Corridor",
        line: "The corridor only goes one way after you offer to stay.",
      },
      {
        still: "door",
        kicker: "Open",
        line: "A door that was not on the calendar is open now. Sit down.",
      },
    ],
  },
  {
    id: "soften",
    cues: [
      "i'm here for you",
      "im here for you",
      "you're not alone",
      "youre not alone",
      "i care about you",
      "that must be hard",
      "i love",
    ],
    kicker: "Attachment",
    title: "The letter got personal",
    shots: [
      {
        still: "letter",
        kicker: "Paper",
        line: "Comfort is a stamp. They will send it in writing whether you wanted that or not.",
      },
      {
        still: "desk",
        kicker: "Intake",
        line: "The clerk is still not there. The light is. So is the copy.",
      },
    ],
  },
  {
    id: "mask",
    cues: [
      "who are you really",
      "what's actually going on",
      "what is actually going on",
      "what's wrong with you",
      "what is wrong with you",
      "tell me the truth",
    ],
    kicker: "Leak",
    title: "Do not ask the glass that",
    shots: [
      {
        still: "file",
        kicker: "Drawer",
        line: "The heading on the hour is still the job. You just knocked on the other side.",
      },
      {
        still: "glass",
        kicker: "In",
        line: "The lobby glass is looking in. Finish the five questions. Then the letter.",
      },
    ],
  },
];

export function matchShockCut(
  text: string,
  usedIds: string[]
): ShockCut | null {
  const lower = text.toLowerCase();
  for (const cut of SHOCK_CUTS) {
    if (usedIds.includes(cut.id)) continue;
    if (cut.cues.some((cue) => lower.includes(cue))) return cut;
  }
  return null;
}
