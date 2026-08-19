export type StoryPremise = {
  id: string;
  title: string;
  hook: string;
};

export type NightMood =
  | "watched"
  | "paper"
  | "glass"
  | "storm"
  | "empty"
  | "overtime";

export type StoryNight = {
  id: string;
  title: string;
  hook: string;
  kicker: string;
  mood: NightMood;
  visual: string;
};

export type StoryThroughline = {
  id: string;
  title: string;
  echo: string;
};

export const PREMISES: StoryPremise[] = [
  {
    id: "list-error",
    title: "A printing error",
    hook: "Your name came off the printer by mistake. They kept the page.",
  },
  {
    id: "replacement",
    title: "Someone did not show",
    hook: "The original candidate never sat down. You are the hour that filled.",
  },
  {
    id: "old-file",
    title: "An old drawer",
    hook: "They found your name in a folder from another season. The date was wrong. They used it anyway.",
  },
  {
    id: "referral",
    title: "A name you will not get",
    hook: "Someone wrote you down and left the building. Do not ask who.",
  },
  {
    id: "bought-list",
    title: "A purchased list",
    hook: "PROBE bought a civic roll. Your line was cheap. That was enough.",
  },
  {
    id: "wrong-floor",
    title: "The wrong floor",
    hook: "You were looking for a door that was not this one. Security printed a badge pending anyway.",
  },
];

export const NIGHTS: StoryNight[] = [
  {
    id: "board-live",
    title: "The board is in the building",
    hook: "There is an audience on a floor you will not visit. They take minutes.",
    kicker: "Audience",
    mood: "watched",
    visual:
      "An unseen upper floor behind smoked glass, a long table silhouette, one lamp, no faces",
  },
  {
    id: "printers",
    title: "The printers will not rest",
    hook: "Paper jams, then dumps a tray at once. Letters arrive faster than people.",
    kicker: "Paper",
    mood: "paper",
    visual:
      "A dark copy room vomiting stacked cream letters, sulfur lamp, no readable type",
  },
  {
    id: "cameras",
    title: "Extra cameras",
    hook: "Facilities hung glass that was not on the map. Do not look up.",
    kicker: "Glass",
    mood: "glass",
    visual:
      "A lobby ceiling of extra black-glass bubbles, rain on the curtain wall, empty street",
  },
  {
    id: "storm",
    title: "A lock-in",
    hook: "The street is closed. The lobby is not. Hours run until the weather forgets you.",
    kicker: "Lock-in",
    mood: "storm",
    visual:
      "A sealed glass lobby in a purple storm, wet revolving door, one desk lamp still on",
  },
  {
    id: "clerk-missing",
    title: "The clerk is missing",
    hook: "Intake is a light on a desk. Nobody sits there. The light is still on.",
    kicker: "Intake",
    mood: "empty",
    visual:
      "An abandoned intake desk, badge printer humming, analog clock, empty chair still warm",
  },
  {
    id: "overtime",
    title: "Past close",
    hook: "The building ended for everyone else. Your calendar did not.",
    kicker: "Overtime",
    mood: "overtime",
    visual:
      "An office floor after hours, cube lights off except one, city night through the glass",
  },
];

export const THROUGHLINES: StoryThroughline[] = [
  {
    id: "four-twelve",
    title: "4:12",
    echo: "Everything useful in this building is stamped 4:12, even when the clocks disagree.",
  },
  {
    id: "badge",
    title: "Badge pending",
    echo: "A badge pending is a hook. They will show it to you like a kindness.",
  },
  {
    id: "underline",
    title: "The underline",
    echo: "Someone keeps underlining a sentence you did not say. The next file already has it.",
  },
  {
    id: "chair",
    title: "The empty chair",
    echo: "There is always one extra chair. It is never for you, and it is never empty for long.",
  },
  {
    id: "forward",
    title: "The forward",
    echo: "Every hour is copied upstairs before you stand up. You are already late to your own file.",
  },
  {
    id: "glass",
    title: "The glass",
    echo: "The lobby glass says PROBE. By the later hours it is looking in.",
  },
];

export type StoryRun = {
  seed: string;
  premise: StoryPremise;
  night: StoryNight;
  throughline: StoryThroughline;
};

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(list: readonly T[], rand: () => number) {
  return list[Math.floor(rand() * list.length)]!;
}

export function createSeed() {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `${time}-${rand}`;
}

export function rollStoryRun(seed = createSeed()): StoryRun {
  const rand = mulberry32(hashSeed(seed));
  return {
    seed,
    premise: pick(PREMISES, rand),
    night: pick(NIGHTS, rand),
    throughline: pick(THROUGHLINES, rand),
  };
}

export function runFromIds(
  seed: string,
  premiseId: string,
  nightId: string,
  throughlineId: string
): StoryRun {
  return {
    seed,
    premise: PREMISES.find((item) => item.id === premiseId) || PREMISES[0]!,
    night: NIGHTS.find((item) => item.id === nightId) || NIGHTS[0]!,
    throughline:
      THROUGHLINES.find((item) => item.id === throughlineId) || THROUGHLINES[0]!,
  };
}

export function offerStoryKinds(seed: string, count = 3): StoryNight[] {
  const rand = mulberry32(hashSeed(`${seed}:kinds`));
  const pool = [...NIGHTS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const current = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = current;
  }
  return pool.slice(0, Math.min(count, pool.length));
}

export function runFromNight(seed: string, nightId: string): StoryRun {
  const rand = mulberry32(hashSeed(`${seed}:${nightId}`));
  return {
    seed,
    night: NIGHTS.find((item) => item.id === nightId) || NIGHTS[0]!,
    premise: pick(PREMISES, rand),
    throughline: pick(THROUGHLINES, rand),
  };
}

export function tonightMemo(run: StoryRun) {
  return {
    id: `tonight-${run.seed}`,
    kicker: "Tonight",
    title: run.night.title,
    body: `${run.premise.hook} ${run.throughline.echo}`,
  };
}
