/**
 * Deterministic rubric engine. The AI proposes 0-3 criterion scores with evidence;
 * this module — not the model — computes points, totals, gates, tiers and overrides.
 */
import {
  C6_WEIGHT,
  CRITERIA,
  PATTERN_CRITERIA,
  PROBES,
  ROLES,
  WRONG_ROLE_MESSAGE,
  WRONG_ROLE_THRESHOLD,
  type CriterionCode,
  type PatternCriterion,
  type RoleCode,
  type Score,
  type Tier,
} from "./rubric";

export type PatternScores = Record<PatternCriterion, Score>;

export interface RoleResult {
  role: RoleCode;
  c6: Score;
  points: Record<CriterionCode, number>;
  patternScore: number;
  totalScore: number;
  scoreTier: Tier;
  tier: Tier;
  gatePassed: boolean;
  c1CapApplied: boolean;
  gateCapApplied: boolean;
  wrongRoleFlag: boolean;
  tierReasons: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
/** Guards against float noise (e.g. 74.99999) at tier boundaries. */
const round2 = (n: number) => Math.round(n * 100) / 100;

export function isScore(n: unknown): n is Score {
  return n === 0 || n === 1 || n === 2 || n === 3;
}

export function criterionPoints(score: Score, weight: number): number {
  return (score / 3) * weight;
}

export function patternScore(scores: PatternScores): number {
  return round1(PATTERN_CRITERIA.reduce((sum, c) => sum + criterionPoints(scores[c], CRITERIA[c].weight), 0));
}

export function tierForScore(total: number): Tier {
  const t = round2(total);
  if (t >= 75) return "SHORTLIST";
  if (t >= 55) return "CONSIDER";
  return "PASS";
}

export function scoreRole(scores: PatternScores, role: RoleCode, c6: Score): RoleResult {
  const def = ROLES[role];
  const points = {} as Record<CriterionCode, number>;
  let pattern = 0;
  for (const c of PATTERN_CRITERIA) {
    points[c] = criterionPoints(scores[c], CRITERIA[c].weight);
    pattern += points[c];
  }
  points.C6 = criterionPoints(c6, C6_WEIGHT);
  const total = pattern + points.C6;

  const scoreTier = tierForScore(total);
  let tier: Tier = scoreTier;
  const reasons: string[] = [
    `${round1(total)}/100 falls in the ${scoreTier} band (75-100 SHORTLIST · 55-74 CONSIDER · <55 PASS).`,
  ];

  const gatePassed = c6 >= def.gateMin;
  let gateCapApplied = false;
  if (!gatePassed) {
    reasons.push(`Role gate failed: ${def.title} requires C6 ≥ ${def.gateMin}, candidate has C6 = ${c6}. Not shortlisted for this role.`);
    if (tier === "SHORTLIST") {
      tier = "CONSIDER";
      gateCapApplied = true;
    }
  }

  let c1CapApplied = false;
  if (scores.C1 === 0) {
    reasons.push("Override: C1 = 0 (no operations exposure) caps the candidate at CONSIDER.");
    if (tier === "SHORTLIST") {
      tier = "CONSIDER";
      c1CapApplied = true;
    }
  }

  const wrongRoleFlag = !gatePassed && round2(pattern) >= WRONG_ROLE_THRESHOLD;
  if (wrongRoleFlag) reasons.push(`Pattern score ${round1(pattern)}/80 ≥ ${WRONG_ROLE_THRESHOLD}: ${WRONG_ROLE_MESSAGE}`);

  return {
    role,
    c6,
    points,
    patternScore: round1(pattern),
    totalScore: round1(total),
    scoreTier,
    tier,
    gatePassed,
    c1CapApplied,
    gateCapApplied,
    wrongRoleFlag,
    tierReasons: reasons,
  };
}

/** SPM C6 = number of the three checks met (rubric Part 3). */
export function spmC6FromChecks(checks: { a: boolean; b: boolean; c: boolean }): Score {
  return ((checks.a ? 1 : 0) + (checks.b ? 1 : 0) + (checks.c ? 1 : 0)) as Score;
}

export type Confidence = "high" | "medium" | "low";

export interface ProbeInput {
  criterion: CriterionCode;
  score: Score;
  confidence: Confidence;
  weight: number;
  focus?: string | null;
}

export interface SelectedProbe {
  criterion: CriterionCode | "ALL";
  question: string;
  focus: string | null;
  reason: string;
}

const CONF_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/**
 * Rubric Part 6: attach probes for the criteria where the candidate scored lowest
 * or where the evidence was thinnest. 2-3 criterion probes + the "All" logistics check.
 */
export function selectProbes(role: RoleCode, inputs: ProbeInput[]): SelectedProbe[] {
  const candidates = inputs
    .filter((i) => i.score < 3 || i.confidence === "low")
    .sort(
      (a, b) =>
        a.score - b.score || CONF_RANK[a.confidence] - CONF_RANK[b.confidence] || b.weight - a.weight,
    );

  // If everything is 3 with solid evidence, still probe the thinnest-evidence criteria.
  const pool =
    candidates.length >= 2
      ? candidates
      : [
          ...candidates,
          ...[...inputs]
            .filter((i) => !candidates.includes(i))
            .sort((a, b) => CONF_RANK[a.confidence] - CONF_RANK[b.confidence] || b.weight - a.weight),
        ];

  const picked = pool.slice(0, 3);
  const probes: SelectedProbe[] = picked.map((p) => {
    const bank = p.criterion === "C6" ? PROBES[role === "pm" ? "C6-pm" : "C6-spm"] : PROBES[p.criterion];
    const why =
      p.score < 3
        ? `Scored ${p.score}/3 on ${p.criterion}${p.confidence === "low" ? " with thin evidence" : ""}.`
        : p.confidence === "low"
          ? `Scored 3/3 on ${p.criterion}, but the evidence is thin. Verify.`
          : `Scored 3/3 on ${p.criterion}. No weak criteria, so probe to confirm the claims behind the top scores.`;
    return { criterion: p.criterion, question: bank.join(" "), focus: p.focus ?? null, reason: why };
  });

  probes.push({
    criterion: "ALL",
    question: PROBES.ALL[0],
    focus: null,
    reason: "Asked of every candidate (rubric Part 6). Both roles are in-office, Mumbai.",
  });
  return probes;
}

/** Euclidean distance on C1-C5, used to cross-check the AI's "closest past hire". */
export function patternDistance(a: PatternScores, b: PatternScores): number {
  return Math.sqrt(PATTERN_CRITERIA.reduce((s, c) => s + (a[c] - b[c]) ** 2, 0));
}
