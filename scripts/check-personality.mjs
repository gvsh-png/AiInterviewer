import assert from "node:assert/strict";
import {
  derivePhase,
  detectTherapyScoreDelta,
  buildSystemPrompt,
} from "../src/lib/personality.ts";
import { INTERVIEWERS, getInterviewer } from "../src/lib/interviewers.ts";
import { coverOpeningLine } from "../src/lib/cover.ts";
import { extractVerdict } from "../src/lib/verdict.ts";
import { applyJobs } from "../src/lib/contacts.ts";
import {
  JOB_HOOKS,
  ROUND_BRIEFINGS,
  aftermathLine,
  briefingForRound,
  currentRoundLabel,
  epilogue,
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

const opening = coverOpeningLine(first, "Game Testing");
assert.match(opening, /Game Testing/);
assert.equal(opening.includes(first.twist), false);
assert.ok(applyJobs().every((job) => JOB_HOOKS[job]));

const parsed = extractVerdict(
  `We'll send paperwork.\n[[VERDICT: hire]]\n[[LETTER: You have the role.]]`
);
assert.equal(parsed.verdict?.decision, "hire");
assert.match(parsed.reply, /paperwork/i);
assert.equal(parsed.reply.includes("VERDICT"), false);

assert.equal(ROUND_BRIEFINGS.length, 12);
assert.equal(totalRounds(), INTERVIEWERS.length);
assert.ok(JOB_HOOKS["Game Testing"]);
assert.match(aftermathLine("hire"), /HIRED/);
assert.match(aftermathLine("obsessed"), /letter/i);
assert.equal(briefingForRound(1).kicker, "Round 1");
assert.equal(briefingForRound(12).kicker, "Round 12");
assert.equal(briefingForRound(99).kicker, "Round 12");
assert.match(
  currentRoundLabel({ version: 1, introDone: true, playerJob: "Game Testing" }, []),
  /Round 1/
);
const hiredFile = INTERVIEWERS.slice(0, 6).map((person, index) => ({
  interviewerId: person.id,
  appliedJob: "Game Testing",
  createdAt: index,
  updatedAt: index,
  verdict: { decision: "hire", letter: "Yes." },
}));
assert.match(epilogue(hiredFile).title, /Staff adjacent/);
const coldFile = INTERVIEWERS.map((person, index) => ({
  interviewerId: person.id,
  appliedJob: "Game Testing",
  createdAt: index,
  updatedAt: index,
  verdict: { decision: "reject", letter: "No." },
}));
assert.match(epilogue(coldFile).title, /Sample closed/);
assert.equal(
  ROUND_BRIEFINGS.some((entry) => /twist|stalker|cult/i.test(`${entry.title} ${entry.body}`)),
  false
);

console.log("personality + roster checks passed", INTERVIEWERS.length);
