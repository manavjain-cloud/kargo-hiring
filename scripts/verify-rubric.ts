/**
 * Verifies the deterministic rubric engine against rubric.txt:
 *  - Part 5 back-test pattern scores for all 8 past hires
 *  - tier bands, role gates, the C1 = 0 override and the wrong-role flag
 * Run: npm run verify:rubric
 */
import assert from "node:assert/strict";
import { PAST_HIRES } from "../src/lib/past-hires";
import { patternScore, scoreRole, selectProbes, spmC6FromChecks, tierForScore } from "../src/lib/scoring";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log("Rubric Part 5 back-test");
for (const h of PAST_HIRES) {
  check(`${h.fullName}: pattern ${h.patternScore}/80`, () => assert.equal(patternScore(h.scores), h.patternScore));
}

console.log("Tier bands (Part 4)");
check("75 → SHORTLIST", () => assert.equal(tierForScore(75), "SHORTLIST"));
check("74.9 → CONSIDER", () => assert.equal(tierForScore(74.9), "CONSIDER"));
check("55 → CONSIDER", () => assert.equal(tierForScore(55), "CONSIDER"));
check("54.9 → PASS", () => assert.equal(tierForScore(54.9), "PASS"));

console.log("Gates, override, wrong-role flag");
const lavanya = PAST_HIRES[0].scores;
check("All 3s + C6 3 = 100 SHORTLIST, gate pass", () => {
  const r = scoreRole(lavanya, "pm", 3);
  assert.equal(r.totalScore, 100);
  assert.equal(r.tier, "SHORTLIST");
  assert.equal(r.gatePassed, true);
});
check("PM gate: C6 = 0 fails, C6 = 1 passes", () => {
  assert.equal(scoreRole(lavanya, "pm", 0).gatePassed, false);
  assert.equal(scoreRole(lavanya, "pm", 1).gatePassed, true);
});
check("SPM gate: C6 = 1 fails, C6 = 2 passes", () => {
  assert.equal(scoreRole(lavanya, "spm", 1).gatePassed, false);
  assert.equal(scoreRole(lavanya, "spm", 2).gatePassed, true);
});
check("Gate fail with 86.7 total → not shortlisted (CONSIDER) + wrong-role flag (pattern 80 ≥ 60)", () => {
  const r = scoreRole(lavanya, "spm", 1);
  assert.equal(r.totalScore, 86.7);
  assert.equal(r.scoreTier, "SHORTLIST");
  assert.equal(r.tier, "CONSIDER");
  assert.equal(r.gateCapApplied, true);
  assert.equal(r.wrongRoleFlag, true);
});
check("C1 = 0 caps at CONSIDER even when total ≥ 75", () => {
  const r = scoreRole({ C1: 0, C2: 3, C3: 3, C4: 3, C5: 3 }, "pm", 3);
  assert.equal(r.totalScore, 75);
  assert.equal(r.tier, "CONSIDER");
  assert.equal(r.c1CapApplied, true);
});
check("Gate fail with pattern < 60 → no wrong-role flag", () => {
  const r = scoreRole({ C1: 1, C2: 2, C3: 1, C4: 1, C5: 0 }, "spm", 0);
  assert.equal(r.wrongRoleFlag, false);
  assert.equal(r.tier, "PASS");
});
check("SPM C6 = count of checks met", () => {
  assert.equal(spmC6FromChecks({ a: true, b: false, c: true }), 2);
});
check("Probes: 2-3 weakest criteria + ALL", () => {
  const p = selectProbes("pm", [
    { criterion: "C1", score: 3, confidence: "high", weight: 25 },
    { criterion: "C2", score: 1, confidence: "medium", weight: 20 },
    { criterion: "C3", score: 3, confidence: "high", weight: 15 },
    { criterion: "C4", score: 2, confidence: "low", weight: 10 },
    { criterion: "C5", score: 0, confidence: "medium", weight: 10 },
    { criterion: "C6", score: 2, confidence: "high", weight: 20 },
  ]);
  assert.deepEqual(p.map((x) => x.criterion), ["C5", "C2", "C4", "ALL"]);
});

console.log(`\n${passed} checks passed.`);
