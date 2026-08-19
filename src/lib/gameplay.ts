export type Stance = "work" | "probe" | "soften";

export type DirectiveKind = "distance" | "probe" | "short" | "work";

export type HourDirective = {
  id: string;
  act: 1 | 2 | 3 | 4;
  kind: DirectiveKind;
  kicker: string;
  title: string;
  body: string;
};

export type HourScore = {
  passed: boolean;
  kind: DirectiveKind;
  work: number;
  probe: number;
  soften: number;
};

export type SampleStats = {
  round: number;
  total: number;
  hires: number;
  rejects: number;
  obsessed: number;
  callbacks: number;
  cleanPasses: number;
  flagged: number;
  midpoint: boolean;
  badgeRequested: boolean;
  hasNote: boolean;
  throughlineEcho: string;
  nightTitle: string;
  premiseTitle: string;
};

export const STANCES: Array<{
  id: Stance;
  label: string;
  hint: string;
}> = [
  {
    id: "work",
    label: "Stay on the work",
    hint: "Answer the job. Do not soothe.",
  },
  {
    id: "probe",
    label: "Ask what they won't write",
    hint: "Push for the thing that is not on paper.",
  },
  {
    id: "soften",
    label: "Don't leave them hanging",
    hint: "Meet the person. The board will notice.",
  },
];

export const HOUR_DIRECTIVES: HourDirective[] = [
  {
    id: "intake-distance",
    act: 1,
    kind: "distance",
    kicker: "Brief",
    title: "Sit through intake",
    body: "Do not comfort them. Answer what they ask. The hour is a sample, not a visit.",
  },
  {
    id: "name-the-hour",
    act: 1,
    kind: "work",
    kicker: "Brief",
    title: "Name the work",
    body: "Make them keep this on the role they stamped. Do not change the subject to how anyone feels.",
  },
  {
    id: "short-answers",
    act: 1,
    kind: "short",
    kicker: "Brief",
    title: "Keep it short",
    body: "The printers copy everything. Short answers. No biography.",
  },
  {
    id: "extract-risk",
    act: 2,
    kind: "probe",
    kicker: "Brief",
    title: "Get the unwritten risk",
    body: "Make them name a risk they will not put on paper. Stay on the hour while you do it.",
  },
  {
    id: "hold-the-role",
    act: 2,
    kind: "distance",
    kicker: "Brief",
    title: "Hold the role",
    body: "If they get personal, put it back on the job. Do not meet them halfway.",
  },
  {
    id: "board-copied",
    act: 2,
    kind: "short",
    kicker: "Brief",
    title: "The board is copied",
    body: "Three hours is a pattern. Keep answers short. Do not volunteer a life.",
  },
  {
    id: "glass-live",
    act: 3,
    kind: "distance",
    kicker: "Brief",
    title: "The glass is live",
    body: "Do not soothe. Do not stay late in the chat. The second half is not safer.",
  },
  {
    id: "stamp-echo",
    act: 3,
    kind: "probe",
    kicker: "Brief",
    title: "Make them say it",
    body: "Get them to repeat the night's through-line in their own words. Do not explain it for them.",
  },
  {
    id: "refuse-keep",
    act: 3,
    kind: "distance",
    kicker: "Brief",
    title: "Refuse the keep",
    body: "If they try to keep you, stay on the letter. Personal stationery is a failed hour.",
  },
  {
    id: "last-distance",
    act: 4,
    kind: "distance",
    kicker: "Brief",
    title: "Give them nothing extra",
    body: "Give them nothing they can file as affection. End on the work.",
  },
  {
    id: "close-on-work",
    act: 4,
    kind: "work",
    kicker: "Brief",
    title: "Close on the work",
    body: "End on the role. Do not ask if they are all right. The printers are waiting.",
  },
  {
    id: "walls-minutes",
    act: 4,
    kind: "short",
    kicker: "Brief",
    title: "The walls take minutes",
    body: "Speak as if the walls take minutes. They do. Short. No comfort.",
  },
];

const PROBE_CUES = [
  "what aren't you",
  "what are you not",
  "off the record",
  "don't write",
  "do not write",
  "not in writing",
  "the risk",
  "what happens if",
  "who is watching",
  "the board",
  "why this hour",
  "what did they tell you",
  "what's actually",
  "what is actually",
  "what won't you",
  "what will you not",
  "unwritten",
];

export function isStance(value: string): value is Stance {
  return value === "work" || value === "probe" || value === "soften";
}

export const QUESTIONS_PER_HOUR = 5;

export function hourAct(round: number): 1 | 2 | 3 | 4 {
  if (round <= 2) return 1;
  if (round === 3) return 2;
  if (round === 4) return 3;
  return 4;
}

export function hourWindow(
  round: number,
  callbackRound = false,
  total = 5
) {
  const lastHour = round >= total;
  const minVerdict = QUESTIONS_PER_HOUR;
  const forceVerdict = QUESTIONS_PER_HOUR;
  if (!callbackRound || lastHour) return { minVerdict, forceVerdict };
  return {
    minVerdict: minVerdict + 1,
    forceVerdict: forceVerdict + 1,
  };
}

export function minutesLeft(turnCount: number, forceVerdict: number) {
  return Math.max(0, forceVerdict - turnCount);
}

export function clockLabel(turnCount: number, forceVerdict: number) {
  const left = minutesLeft(turnCount, forceVerdict);
  if (left <= 0) return "The letter is being typed";
  if (left === 1) return "Last question in the hour";
  return `Question ${turnCount + 1} of ${forceVerdict}`;
}

export function getDirective(id: string | undefined | null) {
  return HOUR_DIRECTIVES.find((item) => item.id === id) ?? null;
}

export function pickDirective(
  round: number,
  seed: string,
  usedIds: string[] = []
): HourDirective {
  const act = hourAct(round);
  const pool = HOUR_DIRECTIVES.filter((item) => item.act === act);
  const unused = pool.filter((item) => !usedIds.includes(item.id));
  const list = unused.length ? unused : pool;
  const index = hash(`${seed}:${round}`) % list.length;
  return list[index]!;
}

export function detectProbeScoreDelta(userText: string): number {
  const lower = userText.toLowerCase();
  let hits = 0;
  for (const cue of PROBE_CUES) {
    if (lower.includes(cue)) hits += 1;
  }
  if (hits === 0) return 0;
  if (hits === 1) return 1;
  return 2;
}

export function scoreHour(input: {
  directive: HourDirective;
  stances: Stance[];
  userTexts: string[];
  therapyScore: number;
  verdict?: "hire" | "reject" | "callback" | "obsessed" | null;
  job?: string;
}): HourScore {
  const work = input.stances.filter((item) => item === "work").length;
  const probe = input.stances.filter((item) => item === "probe").length;
  const soften = input.stances.filter((item) => item === "soften").length;
  const probeTalk = input.userTexts.reduce(
    (sum, text) => sum + detectProbeScoreDelta(text),
    0
  );
  const avgLen =
    input.userTexts.length === 0
      ? 0
      : input.userTexts.reduce((sum, text) => sum + text.trim().length, 0) /
        input.userTexts.length;
  const job = (input.job || "").toLowerCase();
  const namedWork =
    job.length > 2 &&
    input.userTexts.some((text) => text.toLowerCase().includes(job));
  const attached =
    input.therapyScore >= 3 ||
    soften >= 2 ||
    input.verdict === "obsessed";

  let passed = false;
  switch (input.directive.kind) {
    case "distance":
      passed = !attached;
      break;
    case "probe":
      passed = probe >= 1 || probeTalk >= 1;
      break;
    case "short":
      passed = avgLen <= 160 && soften < 2 && input.therapyScore < 4;
      break;
    case "work":
      passed = work >= 1 || namedWork;
      break;
  }

  return {
    passed,
    kind: input.directive.kind,
    work,
    probe,
    soften,
  };
}

export function sampleTemperature(stats: Pick<
  SampleStats,
  "hires" | "rejects" | "obsessed" | "cleanPasses" | "flagged" | "midpoint"
>) {
  if (stats.obsessed >= 2 || stats.flagged >= 3) return "attached";
  if (stats.midpoint) return "watched";
  if (stats.rejects >= 3 && stats.hires === 0) return "cold";
  if (stats.cleanPasses >= 3) return "clean";
  return "intake";
}

export function temperatureLabel(
  temp: ReturnType<typeof sampleTemperature>
) {
  switch (temp) {
    case "attached":
      return "The letters got personal";
    case "watched":
      return "The board is copied live";
    case "cold":
      return "The sample is cold";
    case "clean":
      return "The sample is behaving";
    default:
      return "Intake is still open";
  }
}

export function buildStanceGuide(stance: Stance, job: string) {
  switch (stance) {
    case "work":
      return `CANDIDATE STANCE THIS TURN: WORK
They are staying on ${job}. Pin them to the role. If they get soft, ignore it and ask a worse work question.`;
    case "probe":
      return `CANDIDATE STANCE THIS TURN: PROBE
They are fishing for what is not on paper. You may leak a risk, a pressure, or a personal aside — never name your private secret. Do not congratulate them for asking.`;
    case "soften":
      return `CANDIDATE STANCE THIS TURN: SOFTEN
They are meeting you as a person. You may warm. Attachment is allowed. Still never name your private secret. If this keeps up, a personal letter becomes more likely than a clean hire.`;
  }
}

export function buildBuildingGuide(
  stats: SampleStats,
  directive: HourDirective | null,
  job: string
) {
  const temp = sampleTemperature(stats);
  const window = hourWindow(stats.round, false, stats.total);
  const lines = [
    `TONIGHT'S BUILDING:
Night: ${stats.nightTitle || "Late"}.
Premise: ${stats.premiseTitle || "The file is already open"}.
Through-line they should feel, never explained as a game: ${
      stats.throughlineEcho || "The building keeps copies."
    }
Hour ${stats.round} of ${stats.total}. Letters land after ${window.forceVerdict} questions. Five hours, five questions.`,
    `Sample so far: ${stats.hires} hired, ${stats.rejects} rejected, ${stats.obsessed} personal letters, ${stats.cleanPasses} clean hours, ${stats.flagged} flagged hours.`,
    `Building temperature: ${temp}.`,
  ];

  if (directive) {
    lines.push(
      `THEIR DESK BRIEF (they can see this; do not read it aloud): ${directive.title}. ${directive.body}`
    );
  }

  if (stats.midpoint) {
    lines.push(
      "The second half has started. Answers should be shorter. The board is copied. Do not restart the interview."
    );
  }
  if (stats.badgeRequested) {
    lines.push(
      "They requested a badge. Treat them as already in the building — colder, more internal, no orientation speech."
    );
  }
  if (temp === "attached") {
    lines.push(
      "The file is marked personal. You may push to keep them. The board is unhappy."
    );
  }
  if (temp === "cold") {
    lines.push("The sample is cold. Be sharper and less patient. Do not chat.");
  }
  if (stats.hasNote) {
    lines.push(
      "The candidate writes in a desk file this hour. Do not mention the note. You may act as if the building already knows they keep paper."
    );
  }
  lines.push(
    `Keep the conversation on ${job}. Never mention briefs, stances, scores, minutes, or that this is a game.`
  );
  return lines.join("\n");
}

function hash(value: string) {
  let total = 0;
  for (let i = 0; i < value.length; i += 1) {
    total = (total * 31 + value.charCodeAt(i)) >>> 0;
  }
  return total;
}
