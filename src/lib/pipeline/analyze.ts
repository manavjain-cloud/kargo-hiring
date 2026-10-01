/**
 * CV → structured evidence → C1-C6 → deterministic score/gate/tier → probes.
 * No database access here, so the same path is used by the app and the calibration script.
 */
import { cleanPersonName } from "../extract";
import { generateJson } from "../gemini";
import { PAST_HIRES, THRIVING, pastHireById } from "../past-hires";
import {
  C6_WEIGHT,
  CRITERIA,
  PATTERN_CRITERIA,
  RUBRIC_VERSION,
  ROLE_CODES,
  type CriterionCode,
  type RoleCode,
  type Score,
} from "../rubric";
import {
  criterionPoints,
  patternDistance,
  scoreRole,
  selectProbes,
  spmC6FromChecks,
  type Confidence,
  type PatternScores,
  type RoleResult,
  type SelectedProbe,
} from "../scoring";
import { EvidenceVerifier, makeRedactor, type EvidenceItem } from "./evidence";
import { EXTRACTION_SYSTEM, PROMPT_VERSION, extractionPrompt, scoringPrompt, scoringSystem } from "./prompts";
import { ExtractionSchema, ScoringSchema, type CriterionAssessmentT, type Extraction, type Scoring } from "./schemas";

export interface CriterionResult {
  criterion: CriterionCode;
  role: RoleCode | null; // set for C6 only
  score: Score;
  aiScore: Score | null; // model's proposal when the app corrected it
  weight: number;
  points: number;
  confidence: Confidence;
  rationale: string;
  evidence: EvidenceItem[];
  inferences: string[];
  missing: string[];
  probeFocus: string;
  subChecks?: Record<"a" | "b" | "c", { met: boolean; evidence: EvidenceItem[]; note: string }>;
}

export interface CautionFlag {
  type: string;
  detail: string;
  source: "ai" | "system";
}

export interface TraceStep {
  step: string;
  detail: string;
  at: string;
}

export interface Analysis {
  model: string;
  promptVersion: string;
  rubricVersion: string;
  extraction: Extraction;
  scoring: Scoring;
  snapshot: Scoring["snapshot"] & { years_experience: number | null; location: string | null };
  criteria: CriterionResult[];
  roleResults: Record<RoleCode, RoleResult>;
  probes: Record<RoleCode, SelectedProbe[]>;
  whyRanked: string;
  strengths: string[];
  cautionFlags: CautionFlag[];
  closestPastHireId: string;
  closestReason: string;
  nearestByScoresId: string;
  trace: { steps: TraceStep[]; evidence: { verified: number; near: number; unverified: number } };
  durationMs: number;
}

export interface AnalyzeInput {
  cvText: string;
  fallbackName?: string | null;
  jds: { pm: string; spm: string };
  /** Calibration only: hide this past hire from the scorer's context. */
  excludePastHireId?: string;
}

export async function analyzeCv(input: AnalyzeInput): Promise<Analysis> {
  const started = Date.now();
  const steps: TraceStep[] = [];
  const log = (step: string, detail: string) => steps.push({ step, detail, at: new Date().toISOString() });

  // 1. Structured, verbatim evidence extraction
  const { data: extraction, model: extractModel } = await generateJson({
    schema: ExtractionSchema,
    system: EXTRACTION_SYSTEM,
    prompt: extractionPrompt(input.cvText),
  });
  log("extract", `[${extractModel}] ${extraction.experience.length} roles and ${extraction.other_evidence.length} other evidence lines extracted verbatim.`);

  // 2. Fairness: strip identifiers before scoring
  const name = cleanPersonName(extraction.contact.full_name) ?? input.fallbackName ?? null;
  const redact = makeRedactor(name);
  log("redact", "Name, contact details and education withheld from the scorer (rubric Part 8).");

  // 3. Rubric scoring (the model proposes 0-3 per criterion)
  const { data: scoring, model: scoreModel } = await generateJson({
    schema: ScoringSchema,
    system: scoringSystem(input.jds, input.excludePastHireId),
    prompt: scoringPrompt(extraction, redact),
  });
  log("score", `[${scoreModel}] Model proposed C1-C5 and C6 (PM and Senior PM) with evidence, inferences and missing info.`);

  // 4. Evidence verification against the real CV text
  const verifier = new EvidenceVerifier(input.cvText, redact);
  const tally = { verified: 0, near: 0, unverified: 0 };
  const verify = (quotes: string[], inferences: string[]): EvidenceItem[] => {
    const out: EvidenceItem[] = [];
    for (const q of quotes) {
      const status = verifier.check(q);
      tally[status]++;
      if (status === "unverified") inferences.push(`Not found verbatim in the CV (treat as inference): "${q}"`);
      else out.push({ quote: q, status });
    }
    return out;
  };

  const flags: CautionFlag[] = scoring.caution_flags.map((f) => ({ ...f, source: "ai" as const }));

  const build = (
    criterion: CriterionCode,
    role: RoleCode | null,
    a: CriterionAssessmentT,
    weight: number,
    forcedScore?: Score,
  ): CriterionResult => {
    const inferences = [...a.inferences];
    const evidence = verify(a.evidence, inferences);
    const aiScore = a.score as Score;
    const score = forcedScore ?? aiScore;
    let confidence: Confidence = a.confidence;
    if (score >= 2 && evidence.length === 0) {
      confidence = "low";
      flags.push({
        type: "thin_evidence",
        detail: `${criterion}${role ? ` (${role === "pm" ? "PM" : "Senior PM"})` : ""} scored ${score}/3 but no supporting quote could be verified in the CV — confirm in interview.`,
        source: "system",
      });
    }
    return {
      criterion,
      role,
      score,
      aiScore: forcedScore !== undefined && forcedScore !== aiScore ? aiScore : null,
      weight,
      points: criterionPoints(score, weight),
      confidence,
      rationale: a.rationale,
      evidence,
      inferences,
      missing: a.missing,
      probeFocus: a.probe_focus,
    };
  };

  const pattern = PATTERN_CRITERIA.map((c) => build(c, null, scoring.criteria[c], CRITERIA[c].weight));

  const pmFit = build("C6", "pm", scoring.role_fit.pm, C6_WEIGHT);

  // Senior PM C6 is deterministic: the number of checks (a)(b)(c) met.
  const spm = scoring.role_fit.spm;
  const checksMet = { a: spm.checks.a.met, b: spm.checks.b.met, c: spm.checks.c.met };
  const spmScore = spmC6FromChecks(checksMet);
  const spmFit = build("C6", "spm", spm, C6_WEIGHT, spmScore);
  spmFit.subChecks = {
    a: { met: spm.checks.a.met, evidence: verify(spm.checks.a.evidence, spmFit.inferences), note: spm.checks.a.note },
    b: { met: spm.checks.b.met, evidence: verify(spm.checks.b.evidence, spmFit.inferences), note: spm.checks.b.note },
    c: { met: spm.checks.c.met, evidence: verify(spm.checks.c.evidence, spmFit.inferences), note: spm.checks.c.note },
  };
  if (spmFit.aiScore !== null) {
    log("validate", `Senior PM C6 corrected from ${spmFit.aiScore} to ${spmScore}: the rubric defines it as the number of checks met.`);
  }
  log(
    "verify",
    `Evidence audit: ${tally.verified} quotes verified verbatim, ${tally.near} near-verbatim, ${tally.unverified} not found in the CV (moved to inferences).`,
  );

  // 5. Deterministic score / gate / override / tier per role
  const patternScores = Object.fromEntries(pattern.map((p) => [p.criterion, p.score])) as PatternScores;
  const roleResults = {
    pm: scoreRole(patternScores, "pm", pmFit.score),
    spm: scoreRole(patternScores, "spm", spmFit.score),
  };
  for (const r of ROLE_CODES) {
    const rr = roleResults[r];
    log("tier", `${r === "pm" ? "PM" : "Senior PM"}: ${rr.totalScore}/100 → ${rr.tier}. ${rr.tierReasons.slice(1).join(" ") || "No gate or override applied."}`);
  }

  // 6. Probes for the weakest / thinnest criteria (rubric Part 6)
  const probes = {} as Record<RoleCode, SelectedProbe[]>;
  for (const r of ROLE_CODES) {
    const fit = r === "pm" ? pmFit : spmFit;
    probes[r] = selectProbes(
      r,
      [...pattern, fit].map((c) => ({
        criterion: c.criterion,
        score: c.score,
        confidence: c.confidence,
        weight: c.weight,
        focus: c.probeFocus,
      })),
    );
  }

  // 7. Closest past hire: validate the model's pick, cross-check with score-profile distance
  const pool = PAST_HIRES.filter((h) => h.id !== input.excludePastHireId);
  const nearest = [...pool].sort((a, b) => patternDistance(patternScores, a.scores) - patternDistance(patternScores, b.scores))[0];
  const thrivingPool = THRIVING.filter((h) => h.id !== input.excludePastHireId);
  let closestId = scoring.closest_past_hire.id;
  let closestReason = scoring.closest_past_hire.reason;
  if (!thrivingPool.some((h) => h.id === closestId)) {
    const t = [...thrivingPool].sort((a, b) => patternDistance(patternScores, a.scores) - patternDistance(patternScores, b.scores))[0];
    closestId = t.id;
    closestReason = `Nearest thriving hire by C1-C5 score profile. ${closestReason}`;
    log("validate", "Model's closest-hire pick was not an eligible thriving hire; replaced with nearest score profile.");
  }
  if (nearest.outcome === "not_thriving") {
    flags.push({
      type: "other",
      detail: `C1-C5 score profile is closest to ${nearest.fullName} (${nearest.lastRating}) — a non-thriving past hire.`,
      source: "system",
    });
  }
  log("match", `Closest thriving hire: ${pastHireById(closestId)?.fullName}. Nearest by score profile: ${nearest.fullName}.`);

  return {
    model: extractModel === scoreModel ? scoreModel : `${extractModel} + ${scoreModel}`,
    promptVersion: PROMPT_VERSION,
    rubricVersion: RUBRIC_VERSION,
    extraction,
    scoring,
    snapshot: {
      ...scoring.snapshot,
      years_experience: extraction.total_years_experience,
      location: extraction.contact.location,
    },
    criteria: [...pattern, pmFit, spmFit],
    roleResults,
    probes,
    whyRanked: scoring.why_ranked,
    strengths: scoring.strengths,
    cautionFlags: flags,
    closestPastHireId: closestId,
    closestReason,
    nearestByScoresId: nearest.id,
    trace: { steps, evidence: tally },
    durationMs: Date.now() - started,
  };
}


