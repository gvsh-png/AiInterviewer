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
assert.ok(applyJobs().length >= 8);

const parsed = extractVerdict(
  `We'll send paperwork.\n[[VERDICT: hire]]\n[[LETTER: You have the role.]]`
);
assert.equal(parsed.verdict?.decision, "hire");
assert.match(parsed.reply, /paperwork/i);
assert.equal(parsed.reply.includes("VERDICT"), false);

console.log("personality + roster checks passed", INTERVIEWERS.length);
