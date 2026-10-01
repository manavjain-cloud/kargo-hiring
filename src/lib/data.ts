import "server-only";
import { query, queryOne, toIso, toNum } from "./db";
import { CRITERIA, PATTERN_CRITERIA, type PatternCriterion, type RoleCode, type Tier } from "./rubric";
import type {
  AppSettings,
  CandidateDetail,
  CandidateRow,
  DashboardMetrics,
  DecisionView,
  EmailView,
  EvaluationView,
  PipelineStatus,
  ProbeView,
  RoleFilter,
  RoleResultView,
  ScoreView,
} from "./types";

type Json = Record<string, unknown>;

function displayName(name: string | null, filename: string): string {
  return name?.trim() || filename.replace(/\.[^.]+$/, "");
}

function keySignal(pattern: { c: PatternCriterion; s: number }[] | null): CandidateRow["keySignal"] {
  if (!pattern || pattern.length === 0) return null;
  const c1 = pattern.find((p) => p.c === "C1");
  if (c1 && c1.s === 0) return { label: "No ops exposure", score: 0, negative: true };
  const ranked = [...pattern].sort(
    (a, b) => (b.s / 3) * CRITERIA[b.c].weight - (a.s / 3) * CRITERIA[a.c].weight || CRITERIA[b.c].weight - CRITERIA[a.c].weight,
  );
  const top = ranked[0];
  if (top.s === 0) return { label: "No pattern evidence", score: 0, negative: true };
  return { label: CRITERIA[top.c].short, score: top.s, negative: false };
}

export async function listCandidates(role: RoleFilter): Promise<CandidateRow[]> {
  const rows = await query<Json>(
    `select c.id, c.full_name, c.role_code, c.status, c.source_filename, c.last_error, c.last_evaluated_at,
            c.possible_duplicate_of, c.created_at,
            e.snapshot->>'career_path' as career_path,
            rr.total_score, rr.tier, rr.gate_passed, rr.wrong_role_flag,
            (select json_agg(json_build_object('c', s.criterion, 's', s.score))
               from evaluation_scores s where s.evaluation_id = e.id and s.role_code is null) as pattern
       from candidates c
       left join candidate_evaluations e on e.candidate_id = c.id and e.is_current
       left join evaluation_role_results rr on rr.evaluation_id = e.id and rr.role_code = c.role_code
      where ($1 = 'all' or c.role_code::text = $1)
      order by rr.total_score desc nulls last, c.created_at desc`,
    [role],
  );
  return rows.map((r) => {
    const pattern = r.pattern as { c: PatternCriterion; s: number }[] | null;
    return {
      id: String(r.id),
      name: displayName(r.full_name as string | null, String(r.source_filename)),
      roleCode: r.role_code as RoleCode,
      status: r.status as PipelineStatus,
      sourceFilename: String(r.source_filename),
      currentPath: (r.career_path as string | null) ?? null,
      totalScore: toNum(r.total_score),
      tier: (r.tier as Tier | null) ?? null,
      gatePassed: (r.gate_passed as boolean | null) ?? null,
      wrongRoleFlag: Boolean(r.wrong_role_flag),
      c1Score: pattern?.find((p) => p.c === "C1")?.s ?? null,
      keySignal: keySignal(pattern),
      lastEvaluatedAt: toIso(r.last_evaluated_at),
      lastError: (r.last_error as string | null) ?? null,
      duplicateOf: (r.possible_duplicate_of as string | null) ?? null,
      createdAt: toIso(r.created_at) ?? "",
    };
  });
}

export function computeMetrics(rows: CandidateRow[]): DashboardMetrics {
  const evaluatedStatuses: PipelineStatus[] = ["evaluated", "moved_forward", "on_hold", "declined"];
  const evaluated = rows.filter((r) => evaluatedStatuses.includes(r.status) && r.tier);
  return {
    candidates: rows.length,
    evaluated: evaluated.length,
    shortlisted: evaluated.filter((r) => r.tier === "SHORTLIST").length,
    consider: evaluated.filter((r) => r.tier === "CONSIDER").length,
    pass: evaluated.filter((r) => r.tier === "PASS").length,
    pendingDecision: rows.filter((r) => r.status === "evaluated").length,
    movedForward: rows.filter((r) => r.status === "moved_forward").length,
    onHold: rows.filter((r) => r.status === "on_hold").length,
    declined: rows.filter((r) => r.status === "declined").length,
    notEvaluated: rows.filter((r) => ["uploaded", "failed", "evaluating"].includes(r.status)).length,
  };
}

export async function getCandidate(id: string): Promise<CandidateDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const c = await queryOne<Json>(
    `select c.*, d.full_name as dup_name, d.source_filename as dup_file
       from candidates c left join candidates d on d.id = c.possible_duplicate_of
      where c.id = $1`,
    [id],
  );
  if (!c) return null;

  const [evalRow, decisions, emails] = await Promise.all([
    queryOne<Json>(`select * from candidate_evaluations where candidate_id = $1 and is_current`, [id]),
    query<Json>(`select * from decisions where candidate_id = $1 order by created_at desc`, [id]),
    query<Json>(`select * from email_events where candidate_id = $1 order by created_at desc`, [id]),
  ]);

  let evaluation: EvaluationView | null = null;
  if (evalRow) {
    const [scores, results, probes] = await Promise.all([
      query<Json>(`select * from evaluation_scores where evaluation_id = $1`, [evalRow.id]),
      query<Json>(`select * from evaluation_role_results where evaluation_id = $1`, [evalRow.id]),
      query<Json>(`select * from interview_probes where evaluation_id = $1 order by role_code, sort_order`, [evalRow.id]),
    ]);
    const order = [...PATTERN_CRITERIA, "C6"];
    const roleResults: EvaluationView["roleResults"] = {};
    for (const r of results) {
      const v: RoleResultView = {
        role: r.role_code as RoleCode,
        totalScore: Number(r.total_score),
        patternScore: Number(r.pattern_score),
        scoreTier: r.score_tier as Tier,
        tier: r.tier as Tier,
        gatePassed: Boolean(r.gate_passed),
        c1CapApplied: Boolean(r.c1_cap_applied),
        gateCapApplied: Boolean(r.gate_cap_applied),
        wrongRoleFlag: Boolean(r.wrong_role_flag),
        tierReasons: r.tier_reasons as string[],
      };
      roleResults[v.role] = v;
    }
    evaluation = {
      id: String(evalRow.id),
      model: String(evalRow.model),
      promptVersion: String(evalRow.prompt_version),
      rubricVersion: String(evalRow.rubric_version),
      snapshot: evalRow.snapshot as EvaluationView["snapshot"],
      whyRanked: String(evalRow.why_ranked),
      strengths: evalRow.strengths as string[],
      cautionFlags: evalRow.caution_flags as EvaluationView["cautionFlags"],
      closestPastHireId: (evalRow.closest_past_hire_id as string | null) ?? null,
      closestReason: (evalRow.closest_reason as string | null) ?? null,
      nearestByScoresId: (evalRow.nearest_by_scores_id as string | null) ?? null,
      trace: evalRow.trace as EvaluationView["trace"],
      durationMs: toNum(evalRow.duration_ms),
      createdAt: toIso(evalRow.created_at) ?? "",
      roleResults,
      scores: scores
        .map(
          (s): ScoreView => ({
            criterion: s.criterion as ScoreView["criterion"],
            role: (s.role_code as RoleCode | null) ?? null,
            score: Number(s.score),
            aiScore: toNum(s.ai_score),
            weight: Number(s.weight),
            points: Number(s.points),
            confidence: s.confidence as ScoreView["confidence"],
            rationale: String(s.rationale),
            evidence: s.evidence as ScoreView["evidence"],
            inferences: s.inferences as string[],
            missing: s.missing as string[],
            probeFocus: (s.probe_focus as string | null) ?? null,
            subChecks: (s.sub_checks as ScoreView["subChecks"]) ?? null,
          }),
        )
        .sort((a, b) => order.indexOf(a.criterion) - order.indexOf(b.criterion)),
      probes: probes.map(
        (p): ProbeView => ({
          role: p.role_code as RoleCode,
          criterion: String(p.criterion),
          question: String(p.question),
          focus: (p.focus as string | null) ?? null,
          reason: String(p.reason),
        }),
      ),
    };
  }

  return {
    id: String(c.id),
    name: displayName(c.full_name as string | null, String(c.source_filename)),
    nameSource: c.name_source as CandidateDetail["nameSource"],
    email: (c.email as string | null) ?? null,
    phone: (c.phone as string | null) ?? null,
    location: (c.location as string | null) ?? null,
    roleCode: c.role_code as RoleCode,
    status: c.status as PipelineStatus,
    sourceFilename: String(c.source_filename),
    mimeType: String(c.mime_type),
    fileSizeBytes: Number(c.file_size_bytes),
    lastError: (c.last_error as string | null) ?? null,
    duplicateOf: c.possible_duplicate_of
      ? {
          id: String(c.possible_duplicate_of),
          name: displayName(c.dup_name as string | null, String(c.dup_file)),
          similarity: Number(c.duplicate_similarity ?? 0),
        }
      : null,
    createdAt: toIso(c.created_at) ?? "",
    evaluation,
    decisions: decisions.map(
      (d): DecisionView => ({
        id: String(d.id),
        decision: d.decision as DecisionView["decision"],
        roleCode: d.role_code as RoleCode,
        note: (d.note as string | null) ?? null,
        decidedBy: String(d.decided_by),
        aiTier: (d.ai_tier_at_decision as Tier | null) ?? null,
        aiScore: toNum(d.ai_score_at_decision),
        createdAt: toIso(d.created_at) ?? "",
      }),
    ),
    emails: emails.map(
      (e): EmailView => ({
        id: String(e.id),
        decisionId: String(e.decision_id),
        template: e.template as EmailView["template"],
        toEmail: (e.to_email as string | null) ?? null,
        subject: String(e.subject),
        body: String(e.body),
        status: e.status as EmailView["status"],
        error: (e.error as string | null) ?? null,
        testDeliveredTo: String(e.provider ?? "").startsWith("resend-test:") ? String(e.provider).slice("resend-test:".length) : null,
        sentAt: toIso(e.sent_at),
        createdAt: toIso(e.created_at) ?? "",
      }),
    ),
  };
}

export async function getSettings(): Promise<AppSettings> {
  const s = await queryOne<Json>(`select * from app_settings where id`);
  return {
    reviewerName: String(s?.reviewer_name ?? "Arjun Mehta"),
    companyName: String(s?.company_name ?? "Kargo"),
    autoSendAfterDecision: Boolean(s?.auto_send_after_decision),
  };
}

export interface PastHireDbRow {
  id: string;
  hasCv: boolean;
}

export async function pastHireCvStatus(): Promise<PastHireDbRow[]> {
  const rows = await query<Json>(`select id, cv_text is not null as has_cv from past_hires`);
  return rows.map((r) => ({ id: String(r.id), hasCv: Boolean(r.has_cv) }));
}
