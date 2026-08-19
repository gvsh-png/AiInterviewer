import { stillVideo, type StillKind } from "@/lib/cutscenes";

export type TalkCut = {
  id: string;
  still: StillKind;
  video?: string | null;
  kicker: string;
  line: string;
};

export type LiveDirection = {
  id: string;
  kicker: string;
  title: string;
  body: string;
};

export const TALK_CUTS: TalkCut[] = [
  {
    id: "glass",
    still: "glass",
    kicker: "Live",
    line: "Do not look up. The glass is already looking.",
  },
  {
    id: "hallway",
    still: "hallway",
    kicker: "Floor",
    line: "The corridor only runs one way during the hour.",
  },
  {
    id: "chair",
    still: "chair",
    kicker: "Chair",
    line: "The extra chair is occupied. You just cannot see by whom.",
  },
  {
    id: "night",
    still: "night",
    video: "/stills/intro.mp4",
    kicker: "Outside",
    line: "The street is still there. The building does not care.",
  },
  {
    id: "file",
    still: "file",
    kicker: "Drawer",
    line: "A page you did not write is already under the lamp.",
  },
  {
    id: "door",
    still: "door",
    kicker: "Open",
    line: "A door that was not on the calendar is open now.",
  },
  {
    id: "desk",
    still: "desk",
    kicker: "Intake",
    line: "The clerk is still not there. The light is. Keep talking.",
  },
  {
    id: "building",
    still: "building",
    video: "/stills/intro.mp4",
    kicker: "Lobby",
    line: "The glass says PROBE. Later it looks in.",
  },
];

export const LIVE_DIRECTIONS: LiveDirection[] = [
  {
    id: "eyes-glass",
    kicker: "Direction",
    title: "Do not look up",
    body: "The glass is live. Keep your eyes on the hour.",
  },
  {
    id: "no-comfort",
    kicker: "Direction",
    title: "No comfort",
    body: "If they wobble, do not catch them. Stay on the stamp.",
  },
  {
    id: "name-role",
    kicker: "Direction",
    title: "Name the role",
    body: "Say the job back. Do not let the hour become a visit.",
  },
  {
    id: "short-ink",
    kicker: "Direction",
    title: "Short ink",
    body: "The printers copy long answers. Give them nothing extra.",
  },
  {
    id: "extra-chair",
    kicker: "Direction",
    title: "Ignore the extra chair",
    body: "It is listening. It is not for you.",
  },
  {
    id: "no-clock",
    kicker: "Direction",
    title: "Do not check the clock",
    body: "The hour ends when they type the letter, not when you want it.",
  },
  {
    id: "take-leak",
    kicker: "Direction",
    title: "Let them leak",
    body: "If they almost say the unwritten thing, do not help them finish.",
  },
  {
    id: "stay-sharp",
    kicker: "Direction",
    title: "Stay sharp",
    body: "Kindness is a stamp they can keep. Sharp is safer.",
  },
];

export function talkCutVideo(cut: TalkCut) {
  return cut.video || stillVideo(cut.still);
}

export function pickTalkCut(
  seed: string,
  turnCount: number,
  usedIds: string[]
): TalkCut | null {
  if (usedIds.length >= 2) return null;
  const roll = hash(`${seed}:talk:${turnCount}`) % 100;
  if (turnCount === 0 && roll > 34) return null;
  if (turnCount > 0 && roll > 58) return null;
  const pool = TALK_CUTS.filter((cut) => !usedIds.includes(cut.id));
  if (pool.length === 0) return null;
  return pool[hash(`${seed}:cut:${turnCount}`) % pool.length]!;
}

export function pickLiveDirection(
  seed: string,
  round: number,
  turnCount: number
): LiveDirection {
  const index = hash(`${seed}:dir:${round}:${turnCount}`) % LIVE_DIRECTIONS.length;
  return LIVE_DIRECTIONS[index]!;
}

function hash(value: string) {
  let total = 0;
  for (let i = 0; i < value.length; i += 1) {
    total = (total * 31 + value.charCodeAt(i)) >>> 0;
  }
  return total;
}
