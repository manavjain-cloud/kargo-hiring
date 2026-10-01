import { readFileSync } from "node:fs";
import path from "node:path";
import { PAST_HIRES, type PastHire } from "../past-hires";
import type { Extraction } from "./schemas";

export const PROMPT_VERSION = "kargo-v1";

let rubricCache: string | null = null;
/** rubric.txt is the authoritative source — the scorer sees it verbatim. */
export function rubricText(): string {
  rubricCache ??= readFileSync(path.join(process.cwd(), "src", "content", "rubric.txt"), "utf8");
  return rubricCache;
}

export const EXTRACTION_SYSTEM = `You extract structured work evidence from a CV for a hiring review.

Rules:
- COPY TEXT VERBATIM. Do not paraphrase, summarise, correct, embellish or invent. Only repair words broken across line-wraps.
- Include every work experience entry: full-time, internships, family business, freelance, founder roles, early-career roles.
- "highlights" must contain every bullet/line under that role, exactly as written.
- Do not put education, degrees, schools, colleges or certifications into experience.
- If something is not stated, return null or an empty list. Never guess.
- "function" describes the actual work done in that role (e.g. documentation/customs/carrier work = operations).`;

export function extractionPrompt(cvText: string): string {
  return `CV text (extracted from the uploaded file):\n"""\n${cvText}\n"""`;
}

function hireLine(h: PastHire): string {
  const s = h.scores;
  return `- id "${h.id}" | ${h.roleTitle} | ${h.lastRating} (${h.outcome === "thriving" ? "THRIVING" : "NOT thriving"}) | C1 ${s.C1} C2 ${s.C2} C3 ${s.C3} C4 ${s.C4} C5 ${s.C5} | path: ${h.path} | evidence: ${h.evidence.join("; ")}`;
}

export function scoringSystem(jds: { pm: string; spm: string }, excludeHireId?: string): string {
  const hires = PAST_HIRES.filter((h) => h.id !== excludeHireId);
  return `You are the scoring engine of Kargo's Hiring Intelligence tool. You apply Arjun's hiring rubric to one candidate's CV evidence.
The system RECOMMENDS; Arjun DECIDES. You never make or imply a hiring decision.

=== AUTHORITATIVE RUBRIC (rubric.txt) ===
${rubricText()}
=== END RUBRIC ===

=== PAST-HIRE CALIBRATION (from the rubric back-test; hires are referred to by id only) ===
${hires.map(hireLine).join("\n")}

=== JOB DESCRIPTION: PRODUCT MANAGER ===
${jds.pm}

=== JOB DESCRIPTION: SENIOR PRODUCT MANAGER ===
${jds.spm}

HOW TO SCORE
1. Score C1-C5 on 0-3 using ONLY the rubric anchors. They are role-independent.
2. Score C6 separately for PM (role_fit.pm) and Senior PM (role_fit.spm) using Part 3.
   For Senior PM, evaluate checks (a), (b), (c) individually; the C6 score must equal the number of checks met.
3. Do NOT compute totals, weighted points, gates or tiers. The application computes those deterministically.
4. The historical pattern (operator-turned-builder) matters more than JD keyword overlap, titles or pedigree.
   Framework vocabulary, certifications, conference talks, and metrics from unrelated domains carry ZERO weight.

EVIDENCE DISCIPLINE — this is audited automatically
- "evidence" entries must be short verbatim quotes copied character-for-character from the CV evidence provided. Quotes that cannot be found in the CV are rejected.
- Anything you conclude that the CV does not literally say goes in "inferences", phrased as an inference.
- Anything the rubric needs that the CV does not state goes in "missing". Missing information is NOT negative evidence: score what is present, keep confidence honest, and write a probe_focus to verify it.
- Never fabricate employers, numbers, dates or events.

FAIRNESS (rubric Part 8) — mandatory
- Personal identifiers and education have been removed from the input. Never infer or use name, gender, age, photo, college, family background, nationality or religion.
- Career gaps, non-linear paths, function switches and non-PM titles are NOT penalised.

CAUTION FLAGS (rubric Part 1): flag, never auto-reject — whole career in large structured orgs; logistics only from the desk/API side; achievements described as team outputs with a senior layer making the calls; a CV that is all wins; or thin evidence.

CLOSEST PAST HIRE: pick the THRIVING hire (by id) whose path and way of working the candidate most resembles, and explain the similarity and the key difference. Refer to hires by their id.`;
}

/** Scorer input: work evidence only — no contact details or education. */
export function scoringPrompt(ex: Extraction, redact: (s: string) => string): string {
  const lines: string[] = [];
  if (ex.headline) lines.push(`Headline: ${redact(ex.headline)}`);
  if (ex.summary_text) lines.push(`Summary: ${redact(ex.summary_text)}`);
  if (ex.total_years_experience != null) lines.push(`Total years of experience (as extracted): ${ex.total_years_experience}`);
  lines.push("", "Work experience (most recent first):");
  ex.experience.forEach((r, i) => {
    lines.push(
      `${i + 1}. ${redact(r.title)} — ${redact(r.organization)}${r.org_context ? ` (${redact(r.org_context)})` : ""} | ${r.start ?? "?"} – ${r.end ?? "?"} | function: ${r.function}${r.domain ? ` | domain: ${r.domain}` : ""}`,
    );
    for (const h of r.highlights) lines.push(`   - ${redact(h)}`);
  });
  if (ex.other_evidence.length) {
    lines.push("", "Other evidence:");
    for (const o of ex.other_evidence) lines.push(`- ${redact(o)}`);
  }
  if (ex.skills.length) lines.push("", `Skills/tools listed: ${ex.skills.map(redact).join(", ")}`);
  return `Candidate CV evidence (personal identifiers and education removed):\n"""\n${lines.join("\n")}\n"""\n\nScore this candidate against the rubric and return the JSON.`;
}
