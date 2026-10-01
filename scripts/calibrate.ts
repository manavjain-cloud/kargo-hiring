/**
 * Back-test of the AI pipeline: scores each of Arjun's 8 past-hire CVs with the
 * real Gemini pipeline and compares against rubric.txt Part 5.
 * The hire being scored is removed from the scorer's calibration context
 * (leave-one-out), so the model cannot simply look up its own answer.
 *
 * Run: npm run calibrate        (needs GEMINI_API_KEY; does not touch the database)
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import mammoth from "mammoth";
import { analyzeCv } from "../src/lib/pipeline/analyze";
import { PAST_HIRES } from "../src/lib/past-hires";
import { PATTERN_CRITERIA } from "../src/lib/rubric";

const sourceDir = path.resolve(process.env.SOURCE_DIR ?? path.join(process.cwd(), ".."));
const only = process.argv[2];

async function docx(file: string) {
  return (await mammoth.extractRawText({ buffer: readFileSync(file) })).value;
}

async function main() {
  const jdDir = path.join(sourceDir, "JDs");
  const jdFiles = readdirSync(jdDir);
  const jds = {
    pm: await docx(path.join(jdDir, jdFiles.find((f) => /product manager/i.test(f) && !/senior/i.test(f))!)),
    spm: await docx(path.join(jdDir, jdFiles.find((f) => /senior product manager/i.test(f))!)),
  };

  const rows: string[] = [];
  let within1 = 0;
  let totalCrit = 0;
  const pairs: { name: string; thriving: boolean; ai: number }[] = [];

  for (const h of PAST_HIRES.filter((x) => !only || x.id === only)) {
    const cv = await docx(path.join(sourceDir, "Hires", h.cvFile));
    const a = await analyzeCv({ cvText: cv, jds, excludePastHireId: h.id });
    const ai = Object.fromEntries(a.criteria.filter((c) => !c.role).map((c) => [c.criterion, c.score]));
    const diffs = PATTERN_CRITERIA.map((c) => {
      totalCrit++;
      if (Math.abs(ai[c] - h.scores[c]) <= 1) within1++;
      return `${c} ${ai[c]}${ai[c] === h.scores[c] ? "" : `(${h.scores[c]})`}`;
    });
    const aiPattern = a.roleResults.pm.patternScore;
    pairs.push({ name: h.fullName, thriving: h.outcome === "thriving", ai: aiPattern });
    rows.push(
      `${h.fullName.padEnd(22)} ${diffs.join("  ").padEnd(46)} AI ${String(aiPattern).padStart(5)} vs rubric ${String(h.patternScore).padStart(5)}  | ${h.lastRating}  | evidence ✓${a.trace.evidence.verified} ~${a.trace.evidence.near} ✗${a.trace.evidence.unverified}`,
    );
    console.log(rows[rows.length - 1]);
  }

  const minThriving = Math.min(...pairs.filter((p) => p.thriving).map((p) => p.ai));
  const maxNot = Math.max(...pairs.filter((p) => !p.thriving).map((p) => p.ai));
  console.log(`\nCriterion scores within ±1 of the rubric back-test: ${within1}/${totalCrit}`);
  if (pairs.some((p) => p.thriving) && pairs.some((p) => !p.thriving)) {
    console.log(
      `Separation: lowest thriving ${minThriving} vs highest non-thriving ${maxNot} → ${minThriving > maxNot ? "CLEAN SPLIT ✓" : "overlap ✗"}`,
    );
  }
  console.log("(Format: AI score, rubric value in brackets where they differ.)");
}

main().catch((err) => {
  console.error("Calibration failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
