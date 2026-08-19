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
  AFTERMATH_PAGES,
  ENDING_PAGES,
  INTRO_PAGES,
  ROUND_PAGES,
  aftermathLine,
  briefingForRound,
  currentRoundLabel,
  epilogue,
  meetPage,
  totalRounds,
} from "../src/lib/campaign.ts";

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

assert.ok(INTRO_PAGES.length >= 2);
assert.equal(ROUND_PAGES.length, 12);
assert.equal(totalRounds(), INTERVIEWERS.length);
assert.ok(INTRO_PAGES.every((page) => page.beats.length >= 2));
assert.ok(ROUND_PAGES.every((page) => page.beats.length >= 2));
assert.match(aftermathLine("hire"), /hired/i);
assert.match(aftermathLine("obsessed"), /letter/i);
assert.equal(briefingForRound(1).kicker, "Round 1");
assert.equal(briefingForRound(12).kicker, "Round 12");
assert.equal(briefingForRound(99).kicker, "Round 12");
assert.equal(
  currentRoundLabel({ version: 3, chapter: "intro", panel: 0 }, []),
  "Continue the story"
);
assert.match(meetPage("Derek Holloway", "Game Testing", 1).beats.join(" "), /Derek Holloway/);
assert.ok(AFTERMATH_PAGES.hire.length >= 1);
assert.ok(ENDING_PAGES.sample.length >= 1);

const hiredFile = INTERVIEWERS.slice(0, 6).map((person, index) => ({
  interviewerId: person.id,
  appliedJob: person.job,
  createdAt: index,
  updatedAt: index,
  verdict: { decision: "hire", letter: "Yes." },
}));
assert.match(epilogue(hiredFile).title, /Staff adjacent/);
const coldFile = INTERVIEWERS.map((person, index) => ({
  interviewerId: person.id,
  appliedJob: person.job,
  createdAt: index,
  updatedAt: index,
  verdict: { decision: "reject", letter: "No." },
}));
assert.match(epilogue(coldFile).title, /Sample closed/);

const storyText = [
  ...INTRO_PAGES,
  ...ROUND_PAGES,
  ...Object.values(AFTERMATH_PAGES).flat(),
  ...Object.values(ENDING_PAGES).flat(),
]
  .map((page) => `${page.title} ${page.beats.join(" ")}`)
  .join("\n");
assert.equal(/twist|stalker|cult/i.test(storyText), false);
assert.equal(/what role do you want|pick a cover|choose a job/i.test(storyText), false);

console.log("personality + roster checks passed", INTERVIEWERS.length);
