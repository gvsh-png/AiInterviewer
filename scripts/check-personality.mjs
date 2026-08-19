import assert from "node:assert/strict";
import {
  derivePhase,
  detectTherapyScoreDelta,
  buildSystemPrompt,
} from "../src/lib/personality.ts";
import { INTERVIEWERS, getInterviewer } from "../src/lib/interviewers.ts";
import {
  DEREK_ASSIGN_WEIGHT,
  pickWeightedInterviewer,
} from "../src/lib/contacts.ts";
import { PERSON_PATCHES } from "../src/lib/nightScore.ts";
import { coverOpeningLine } from "../src/lib/cover.ts";
import {
  extractVerdict,
  forceCloseInterview,
  MIN_VERDICT_TURN,
  FORCE_VERDICT_TURN,
} from "../src/lib/verdict.ts";
import {
  BUILDING_MEMOS,
  SAMPLE_MEMOS,
  unlockedMemos,
} from "../src/lib/fileCabinet.ts";
import {
  aftermathLine,
  currentRoundLabel,
  epilogue,
  hourClosed,
  totalRounds,
} from "../src/lib/campaign.ts";
import {
  NIGHTS,
  PREMISES,
  THROUGHLINES,
  offerStoryKinds,
  rollStoryRun,
  tonightMemo,
} from "../src/lib/storySeed.ts";
import {
  STILL_KINDS,
  assembleShots,
  ensureOpeningNight,
  stillPrompt,
  stillVideo,
  validateShots,
} from "../src/lib/cutscenes.ts";
import {
  HOUR_DIRECTIVES,
  STANCES,
  detectProbeScoreDelta,
  getDirective,
  hourWindow,
  pickDirective,
  QUESTIONS_PER_HOUR,
  scoreHour,
} from "../src/lib/gameplay.ts";
import { matchShockCut, SHOCK_CUTS } from "../src/lib/shockCuts.ts";
import { interviewStress } from "../src/lib/stress.ts";
import {
  comboHit,
  copySerial,
  makeScraps,
  stanceHit,
  verdictHit,
} from "../src/lib/hits.ts";

assert.equal(derivePhase(0, 0), "strict");
assert.equal(derivePhase(3, 0), "cracking");
assert.equal(derivePhase(6, 0), "confessional");
assert.equal(derivePhase(2, 6), "enamored");

assert.ok(detectTherapyScoreDelta("That must be hard for your family") >= 1);
assert.equal(detectTherapyScoreDelta("I filed three bug reports yesterday"), 0);

assert.ok(INTERVIEWERS.length >= 10);
assert.ok(getInterviewer("derek"));
assert.ok(getInterviewer("marlene"));

const first = INTERVIEWERS[0];
assert.ok(first);
const prompt = buildSystemPrompt(first.systemPrompt, {
  turnCount: 7,
  therapyScore: 2,
  phase: "confessional",
});
assert.match(prompt, /LEAKING|phase/i);

for (const person of INTERVIEWERS) {
  const opening = coverOpeningLine(person, person.job);
  assert.match(opening, new RegExp(person.job.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(opening.includes(person.twist), false);
  assert.equal(/why should we (put you|hire you)|tell me about yourself/i.test(opening), false);
}

const parsed = extractVerdict(
  `We'll send paperwork.\n[[VERDICT: hire]]\n[[LETTER: You have the role.]]`
);
assert.equal(parsed.verdict?.decision, "hire");
assert.match(parsed.reply, /paperwork/i);
assert.equal(parsed.reply.includes("VERDICT"), false);

assert.equal(PREMISES.length, 6);
assert.equal(NIGHTS.length, 6);
assert.equal(THROUGHLINES.length, 6);
assert.equal(totalRounds(), 5);

const run = rollStoryRun("test");
const person = {
  name: first.name,
  title: first.title,
  company: first.company,
  job: first.job,
};
const kinds = ["prologue", "arrive", "aftermath", "midpoint", "ending"];
const storyText = [];

for (const kind of kinds) {
  const shots = assembleShots({
    run,
    kind,
    round: kind === "aftermath" ? 3 : 1,
    total: 5,
    person,
    lastVerdict: "hire",
    lastName: first.name,
    hires: 3,
    obsessed: 0,
    rejects: 1,
    endingTitle: "Mixed file",
  });
  assert.ok(shots.length >= 2, `${kind} should have shots`);
  assert.ok(shots.every((shot) => STILL_KINDS.includes(shot.still)));
  if (kind === "prologue") {
    assert.equal(shots[0]?.still, "night");
    assert.equal(stillVideo(shots[0].still), "/stills/intro.mp4");
  }
  if (kind === "arrive") {
    assert.equal(shots[shots.length - 1]?.still, "portrait");
  }
  storyText.push(shots.map((shot) => `${shot.kicker} ${shot.line}`).join(" "));
}

storyText.push(
  ...PREMISES.map((item) => `${item.title} ${item.hook}`),
  ...NIGHTS.map((item) => `${item.title} ${item.hook}`),
  ...THROUGHLINES.map((item) => `${item.title} ${item.echo}`),
  tonightMemo(run).body
);

const joined = storyText.join("\n");
assert.equal(/twist|stalker|cult/i.test(joined), false);
assert.equal(/what role do you want|pick a cover|choose a job/i.test(joined), false);
assert.ok(!joined.includes(first.twist));

for (const still of STILL_KINDS) {
  const prompt = stillPrompt({
    still,
    line: "The glass does not advertise.",
    kicker: "PROBE",
    night: run.night.title,
    premise: run.premise.title,
    throughline: run.throughline.echo,
    personName: first.name,
  });
  assert.ok(prompt.length > 40);
  assert.equal(/twist|stalker|cult/i.test(prompt), false);
  assert.ok(!prompt.includes(first.twist));
}

const valid = validateShots({
  shots: [
    { still: "night", kicker: "PROBE", line: "The glass does not advertise." },
    { still: "desk", kicker: "Intake", line: "You sit down." },
  ],
});
assert.equal(valid?.length, 2);
assert.equal(validateShots({ shots: [{ still: "nope", line: "x" }] }), null);
assert.equal(
  ensureOpeningNight("prologue", [
    { still: "building", kicker: "PROBE", line: "The glass does not advertise." },
    { still: "desk", kicker: "Intake", line: "You sit down." },
  ])[0]?.still,
  "night"
);
assert.equal(stillVideo("file"), null);

assert.match(aftermathLine("hire"), /hired/i);
assert.match(aftermathLine("obsessed"), /letter/i);
assert.equal(
  currentRoundLabel(
    {
      version: 4,
      chapter: "intro",
      panel: 0,
      seed: "",
      premiseId: "",
      nightId: "",
      throughlineId: "",
      cutsceneDone: false,
      midpointSeen: false,
      recap: [],
      shotCache: {},
    },
    []
  ),
  "The night has not started"
);
assert.equal(
  currentRoundLabel(
    {
      version: 4,
      chapter: "intro",
      panel: 0,
      seed: "test",
      premiseId: "list-error",
      nightId: "board-live",
      throughlineId: "four-twelve",
      cutsceneDone: false,
      midpointSeen: false,
      kindChosen: true,
      recap: [],
      shotCache: {},
    },
    []
  ),
  "Prologue"
);

const hiredFile = INTERVIEWERS.slice(0, 6).map((npc, index) => ({
  interviewerId: npc.id,
  appliedJob: npc.job,
  createdAt: index,
  updatedAt: index,
  verdict: { decision: "hire", letter: "Yes." },
}));
assert.match(epilogue(hiredFile).title, /Staff adjacent/);
const coldFile = INTERVIEWERS.map((npc, index) => ({
  interviewerId: npc.id,
  appliedJob: npc.job,
  createdAt: index,
  updatedAt: index,
  verdict: { decision: "reject", letter: "No." },
}));
assert.match(epilogue(coldFile).title, /Sample closed/);

assert.ok(BUILDING_MEMOS.length >= 6);
assert.equal(unlockedMemos(0).length, 1);
assert.ok(unlockedMemos(5).length >= BUILDING_MEMOS.length);
assert.equal(
  BUILDING_MEMOS.some((memo) => /twist|stalker|cult/i.test(`${memo.title} ${memo.body}`)),
  false
);
assert.equal(
  SAMPLE_MEMOS.some((memo) => /twist|stalker|cult/i.test(`${memo.title} ${memo.body}`)),
  false
);

assert.equal(HOUR_DIRECTIVES.length, 12);
assert.equal(STANCES.length, 3);
assert.equal(QUESTIONS_PER_HOUR, 5);
assert.equal(MIN_VERDICT_TURN, 5);
assert.equal(FORCE_VERDICT_TURN, 5);
assert.equal(hourWindow(1).forceVerdict, 5);
assert.equal(hourWindow(5).forceVerdict, 5);
assert.equal(hourWindow(5, true).forceVerdict, 5);
assert.ok(hourWindow(3, true).forceVerdict > hourWindow(3).forceVerdict);
assert.equal(pickDirective(1, "seed-a").id, pickDirective(1, "seed-a").id);
assert.equal(pickDirective(1, "seed-a").act, 1);
assert.equal(pickDirective(4, "seed-a").act, 3);
assert.equal(pickDirective(5, "seed-a").act, 4);
const playText = [
  ...HOUR_DIRECTIVES.map((item) => `${item.title} ${item.body}`),
  ...STANCES.map((item) => `${item.label} ${item.hint}`),
].join(" ");
assert.equal(/twist|stalker|cult/i.test(playText), false);
assert.equal(/what role do you want|pick a cover|choose a job/i.test(playText), false);

const distance = getDirective("intake-distance");
assert.ok(distance);
assert.equal(
  scoreHour({
    directive: distance,
    stances: ["work", "work"],
    userTexts: ["I shipped the build this morning."],
    therapyScore: 0,
    verdict: "hire",
  }).passed,
  true
);
assert.equal(
  scoreHour({
    directive: distance,
    stances: ["soften", "soften"],
    userTexts: ["That must be hard for you."],
    therapyScore: 4,
    verdict: "obsessed",
  }).passed,
  false
);
const probe = getDirective("extract-risk");
assert.ok(probe);
assert.equal(
  scoreHour({
    directive: probe,
    stances: ["probe"],
    userTexts: ["What happens if the board is watching?"],
    therapyScore: 0,
    verdict: "reject",
  }).passed,
  true
);
assert.ok(detectProbeScoreDelta("what happens if the board is watching") >= 1);

assert.equal(
  hourClosed({
    interviewerId: "derek",
    appliedJob: "Game Testing",
    createdAt: 1,
    updatedAt: 1,
    callbackPending: true,
  }),
  false
);
assert.equal(
  hourClosed({
    interviewerId: "derek",
    appliedJob: "Game Testing",
    createdAt: 1,
    updatedAt: 1,
    verdict: { decision: "hire", letter: "Yes." },
  }),
  true
);

const openTags = extractVerdict("[[VERDICT: hire]]");
assert.equal(openTags.verdict?.decision, "hire");
assert.ok((openTags.verdict?.letter || "").length > 20);
const forcedClose = forceCloseInterview("Keep talking about the build.", "Game Testing", {
  lastHour: true,
});
assert.ok(forcedClose.verdict);
assert.notEqual(forcedClose.verdict.decision, "callback");
const storyKinds = offerStoryKinds("seed-kinds");
assert.equal(storyKinds.length, 3);
assert.equal(storyKinds[0]?.id, offerStoryKinds("seed-kinds")[0]?.id);
const nightText = NIGHTS.map((item) => `${item.title} ${item.hook} ${item.visual}`).join(" ");
assert.equal(/twist|stalker|cult/i.test(nightText), false);

assert.ok(DEREK_ASSIGN_WEIGHT >= 4);
assert.equal(
  pickWeightedInterviewer(INTERVIEWERS, () => 0, false)?.id,
  "derek"
);
assert.equal(
  pickWeightedInterviewer(INTERVIEWERS, () => 0.26, false)?.id,
  "derek"
);
assert.equal(
  pickWeightedInterviewer(INTERVIEWERS, () => 0.28, false)?.id,
  "marlene"
);
assert.equal(Object.keys(PERSON_PATCHES).length, INTERVIEWERS.length);
const uniquePlate = stillPrompt({
  still: "night",
  line: "The glass does not advertise.",
  kicker: "PROBE",
  unique: "plate-77",
  variant: "b",
});
assert.match(uniquePlate, /plate-77/);
assert.match(uniquePlate, /different angle/i);

assert.ok(SHOCK_CUTS.length >= 6);
assert.equal(
  SHOCK_CUTS.some((cut) =>
    /twist|stalker|cult/i.test(
      `${cut.title} ${cut.shots.map((shot) => shot.line).join(" ")}`
    )
  ),
  false
);
assert.equal(matchShockCut("that must be hard for your family", [])?.id, "family");
assert.equal(matchShockCut("who is watching the board", [])?.id, "watch");
assert.equal(matchShockCut("I shipped three tickets", []), null);
assert.equal(matchShockCut("that must be hard for your family", ["family"])?.id, "soften");

const calm = interviewStress({
  round: 1,
  total: 5,
  turnCount: 0,
  forceVerdict: 5,
  therapyScore: 0,
  soften: 0,
  probe: 0,
  shocks: 0,
  callback: false,
});
assert.equal(calm.alert, false);
assert.ok(calm.bpm >= 58);
const hot = interviewStress({
  round: 5,
  total: 5,
  turnCount: 5,
  forceVerdict: 5,
  therapyScore: 4,
  soften: 2,
  probe: 2,
  shocks: 1,
  callback: true,
});
assert.equal(hot.alert, true);
assert.equal(hot.label, "RED ALERT");
assert.ok(hot.bpm > calm.bpm);
assert.ok(Object.values(PERSON_PATCHES).every((patch) => patch.volume >= 0.08));

assert.equal(stanceHit("work").label, "ON THE WORK");
assert.equal(stanceHit("probe").kind, "probe");
assert.equal(comboHit(1), null);
assert.match(comboHit(3)?.label || "", /3/);
assert.equal(verdictHit("hire").kind, "stamp");
assert.equal(copySerial(7), "COPY 0007");
assert.ok(makeScraps(8).length === 8);
const hitText = [
  stanceHit("work"),
  stanceHit("probe"),
  stanceHit("soften"),
  comboHit(4),
  verdictHit("hire"),
  verdictHit("reject"),
  verdictHit("callback"),
  verdictHit("obsessed"),
]
  .map((item) => `${item?.label || ""} ${item?.sub || ""}`)
  .join(" ");
assert.equal(/twist|stalker|cult/i.test(hitText), false);
assert.equal(
  makeScraps(18).some((scrap) => /twist|stalker|cult/i.test(scrap.label)),
  false
);

console.log("personality + roster checks passed", INTERVIEWERS.length);
