import assert from "node:assert/strict";
import {
  derivePhase,
  detectTherapyScoreDelta,
  buildSystemPrompt,
} from "../src/lib/personality.ts";
import { INTERVIEWERS, getInterviewer } from "../src/lib/interviewers.ts";
import { coverOpeningLine } from "../src/lib/cover.ts";
import { extractVerdict } from "../src/lib/verdict.ts";
import {
  BUILDING_MEMOS,
  unlockedMemos,
} from "../src/lib/fileCabinet.ts";
import {
  aftermathLine,
  currentRoundLabel,
  epilogue,
  totalRounds,
} from "../src/lib/campaign.ts";
import {
  NIGHTS,
  PREMISES,
  THROUGHLINES,
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
assert.equal(totalRounds(), INTERVIEWERS.length);

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
    round: kind === "aftermath" ? 6 : 1,
    total: 12,
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
assert.ok(unlockedMemos(12).length >= BUILDING_MEMOS.length);
assert.equal(
  BUILDING_MEMOS.some((memo) => /twist|stalker|cult/i.test(`${memo.title} ${memo.body}`)),
  false
);

console.log("personality + roster checks passed", INTERVIEWERS.length);
