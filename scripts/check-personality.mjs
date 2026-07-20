import assert from "node:assert/strict";
import {
  derivePhase,
  detectTherapyScoreDelta,
  buildSystemPrompt,
} from "../src/lib/personality.ts";

assert.equal(derivePhase(0, 0), "strict");
assert.equal(derivePhase(3, 0), "cracking");
assert.equal(derivePhase(6, 0), "confessional");
assert.equal(derivePhase(2, 6), "enamored");

assert.ok(detectTherapyScoreDelta("That must be hard for your family") >= 1);
assert.equal(detectTherapyScoreDelta("I filed three bug reports yesterday"), 0);

const prompt = buildSystemPrompt({
  turnCount: 7,
  therapyScore: 2,
  phase: "confessional",
});
assert.match(prompt, /CONFESSIONAL/);
assert.match(prompt, /DEREK HOLLOWAY/);

console.log("personality checks passed");
