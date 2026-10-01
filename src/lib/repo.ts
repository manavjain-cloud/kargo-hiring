import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { query, queryOne, transaction, type Stmt } from "./db";
import { config } from "./env";
import { buildEmail } from "./email/templates";
import { EmailNotConfiguredError, sendViaResend } from "./email/send";
import { ACCEPTED_TYPES, cleanPersonName, nameFromFilename, shingleSimilarity, type FileKind } from "./extract";
import { analyzeCv } from "./pipeline/analyze";
import { ROLES, ROLE_CODES, type RoleCode } from "./rubric";
import { getSettings } from "./data";
import { DECISION_TO_STATUS, type DecisionCode, type PipelineStatus } from "./types";

export class NotFoundError extends Error {}
export class ConflictError extends Error {}

const DUPLICATE_THRESHOLD = 0.85;

/* ------------------------------------------------------------------ */
/* Ingest                                                              */
/* ------------------------------------------------------------------ */

export async function createCandidate(input: {
  roleCode: RoleCode;
  filename: string;
  kind: FileKind;
  bytes: Uint8Array;
  text: string;
}): Promise<{ id: string; duplicateOf: string | null; similarity: number | null }> {
  const hash = createHash("sha256").update(input.bytes).digest("hex");

  // Duplicate / near-duplicate detection (same CV under a different name or file).
  let duplicateOf: string | null = null;
  let similarity: number | null = null;
  const exact = await queryOne<{ id: string }>(`select id from candidates where content_hash = $1 limit 1`, [hash]);
  if (exact) {
    duplicateOf = exact.id;
    similarity = 1;
  } else {
    const others = await query<{ id: string; cv_text: string }>(`select id, cv_text from candidates`);
    for (const o of others) {
      const s = shingleSimilarity(input.text, o.cv_text);
      if (s >= DUPLICATE_THRESHOLD && s > (similarity ?? 0)) {
        duplicateOf = o.id;
        similarity = Math.round(s * 1000) / 1000;
      }
    }
  }

  const id = randomUUID();
  const safeName = input.filename.replace(/[^\w.\- ]+/g, "_").slice(0, 200);
  const fallback = nameFromFilename(safeName);
  await transaction([
    {
      text: `insert into candidates (id, role_code, full_name, name_source, mime_type, source_filename, file_size_bytes,
                                     content_hash, cv_text, possible_duplicate_of, duplicate_similarity)
             values ($1, $2, $3, 'filename', $4, $5, $6, $7, $8, $9, $10)`,
      params: [id, input.roleCode, fallback, ACCEPTED_TYPES[input.kind], safeName, input.bytes.byteLength, hash, input.text, duplicateOf, similarity],
    },
    {
      text: `insert into candidate_files (candidate_id, filename, mime_type, data) values ($1, $2, $3, decode($4, 'base64'))`,
      params: [id, safeName, ACCEPTED_TYPES[input.kind], Buffer.from(input.bytes).toString("base64")],
    },
  ]);
  return { id, duplicateOf, similarity };
}

export async function getCandidateFile(id: string) {
  return queryOne<{ filename: string; mime_type: string; data_b64: string }>(
    `select filename, mime_type, encode(data, 'base64') as data_b64 from candidate_files where candidate_id = $1`,
    [id],
  );
}

export async function updateCandidate(id: string, patch: { fullName?: string; email?: string | null; roleCode?: RoleCode }) {
  const row = await queryOne<{ id: string }>(
    `update candidates set
        full_name   = coalesce($2, full_name),
        name_source = case when $2::text is null then name_source else 'manual' end,
        email       = case when $3::boolean then $4 else email end,
        role_code   = coalesce($5::role_code, role_code)
      where id = $1 returning id`,
    [id, patch.fullName ?? null, patch.email !== undefined, patch.email ?? null, patch.roleCode ?? null],
  );
  if (!row) throw new NotFoundError("Candidate not found.");
}

/* ------------------------------------------------------------------ */
/* Evaluation                                                          */
/* ------------------------------------------------------------------ */

async function roleJds(): Promise<{ pm: string; spm: string }> {
  const rows = await query<{ code: RoleCode; jd_text: string }>(`select code, jd_text from roles`);
  const pm = rows.find((r) => r.code === "pm")?.jd_text;
  const spm = rows.find((r) => r.code === "spm")?.jd_text;
  if (!pm || !spm) throw new Error("Role JDs are missing. Run `npm run db:setup` to seed roles.");
  return { pm, spm };
}

export async function evaluateCandidate(id: string): Promise<{ status: PipelineStatus }> {
  // Claim the candidate (allow re-claiming a run that has been stuck for > 5 minutes).
  const claimed = await queryOne<{ prev: PipelineStatus; cv_text: string; full_name: string | null; name_source: string; source_filename: string }>(
    `with prev as (select id, status from candidates where id = $1)
     update candidates c set status = 'evaluating', last_error = null
       from prev
      where c.id = prev.id and (c.status <> 'evaluating' or c.updated_at < now() - interval '5 minutes')
      returning prev.status as prev, c.cv_text, c.full_name, c.name_source, c.source_filename`,
    [id],
  );
  if (!claimed) {
    const exists = await queryOne(`select 1 from candidates where id = $1`, [id]);
    if (!exists) throw new NotFoundError("Candidate not found.");
    throw new ConflictError("This candidate is already being evaluated.");
  }
  // A human decision survives re-evaluation.
  const decided: PipelineStatus[] = ["moved_forward", "on_hold", "declined"];
  const finalStatus: PipelineStatus = decided.includes(claimed.prev) ? claimed.prev : "evaluated";

  try {
    const jds = await roleJds();
    const a = await analyzeCv({ cvText: claimed.cv_text, fallbackName: claimed.full_name, jds });
    const evalId = randomUUID();
    const stmts: Stmt[] = [
      { text: `update candidate_evaluations set is_current = false where candidate_id = $1 and is_current`, params: [id] },
      {
        text: `insert into candidate_evaluations (id, candidate_id, model, prompt_version, rubric_version, snapshot, extraction,
                 why_ranked, strengths, caution_flags, closest_past_hire_id, closest_reason, nearest_by_scores_id, trace, raw_output, duration_ms)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        params: [
          evalId, id, a.model, a.promptVersion, a.rubricVersion, JSON.stringify(a.snapshot), JSON.stringify(a.extraction),
          a.whyRanked, JSON.stringify(a.strengths), JSON.stringify(a.cautionFlags), a.closestPastHireId, a.closestReason,
          a.nearestByScoresId, JSON.stringify(a.trace), JSON.stringify(a.scoring), a.durationMs,
        ],
      },
    ];
    for (const c of a.criteria) {
      stmts.push({
        text: `insert into evaluation_scores (evaluation_id, criterion, role_code, score, ai_score, weight, points, confidence,
                 rationale, evidence, inferences, missing, probe_focus, sub_checks)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        params: [
          evalId, c.criterion, c.role, c.score, c.aiScore, c.weight, Math.round(c.points * 100) / 100, c.confidence,
          c.rationale, JSON.stringify(c.evidence), JSON.stringify(c.inferences), JSON.stringify(c.missing), c.probeFocus,
          c.subChecks ? JSON.stringify(c.subChecks) : null,
        ],
      });
    }
    for (const r of ROLE_CODES) {
      const rr = a.roleResults[r];
      stmts.push({
        text: `insert into evaluation_role_results (evaluation_id, role_code, total_score, pattern_score, score_tier, tier,
                 gate_passed, c1_cap_applied, gate_cap_applied, wrong_role_flag, tier_reasons)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        params: [evalId, r, rr.totalScore, rr.patternScore, rr.scoreTier, rr.tier, rr.gatePassed, rr.c1CapApplied, rr.gateCapApplied, rr.wrongRoleFlag, JSON.stringify(rr.tierReasons)],
      });
      a.probes[r].forEach((p, i) =>
        stmts.push({
          text: `insert into interview_probes (evaluation_id, role_code, criterion, question, focus, reason, sort_order)
                 values ($1,$2,$3,$4,$5,$6,$7)`,
          params: [evalId, r, p.criterion, p.question, p.focus, p.reason, i],
        }),
      );
    }
    const contact = a.extraction.contact;
    const cvName = cleanPersonName(contact.full_name);
    const useCvName = claimed.name_source !== "manual" && Boolean(cvName);
    stmts.push({
      text: `update candidates set status = $2, last_evaluated_at = now(), last_error = null,
               full_name = case when $3::boolean then $4 else full_name end,
               name_source = case when $3::boolean then 'cv' else name_source end,
               email = coalesce(email, $5), phone = coalesce(phone, $6), location = coalesce(location, $7)
             where id = $1`,
      params: [id, finalStatus, useCvName, cvName, contact.email, contact.phone, contact.location],
    });
    await transaction(stmts);
    return { status: finalStatus };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Evaluation failed.";
    await query(`update candidates set status = $2, last_error = $3 where id = $1`, [
      id,
      decided.includes(claimed.prev) ? claimed.prev : "failed",
      message.slice(0, 500),
    ]);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Human decision → downstream communication                           */
/* ------------------------------------------------------------------ */

export async function recordDecision(input: { candidateId: string; decision: DecisionCode; note: string | null }) {
  const c = await queryOne<{ id: string; full_name: string | null; email: string | null; role_code: RoleCode; source_filename: string; status: PipelineStatus }>(
    `select id, full_name, email, role_code, source_filename, status from candidates where id = $1`,
    [input.candidateId],
  );
  if (!c) throw new NotFoundError("Candidate not found.");
  if (c.status === "evaluating") throw new ConflictError("Wait for the evaluation to finish before deciding.");

  const ev = await queryOne<{ id: string; total_score: string; tier: string }>(
    `select e.id, rr.total_score, rr.tier from candidate_evaluations e
       join evaluation_role_results rr on rr.evaluation_id = e.id and rr.role_code = $2
      where e.candidate_id = $1 and e.is_current`,
    [c.id, c.role_code],
  );
  if (!ev) throw new ConflictError("Run the AI evaluation first so the decision is recorded against a recommendation.");

  const settings = await getSettings();
  const decisionId = randomUUID();
  const emailId = randomUUID();
  const mail = buildEmail(input.decision, {
    candidateName: c.full_name ?? "there",
    roleTitle: ROLES[c.role_code].title,
    reviewerName: settings.reviewerName,
    companyName: settings.companyName,
  });

  await transaction([
    {
      text: `insert into decisions (id, candidate_id, evaluation_id, role_code, decision, note, decided_by, ai_tier_at_decision, ai_score_at_decision)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      params: [decisionId, c.id, ev.id, c.role_code, input.decision, input.note, settings.reviewerName, ev.tier, ev.total_score],
    },
    { text: `update candidates set status = $2 where id = $1`, params: [c.id, DECISION_TO_STATUS[input.decision]] },
    // A newer decision supersedes any unsent draft.
    { text: `update email_events set status = 'cancelled' where candidate_id = $1 and status = 'draft'`, params: [c.id] },
    {
      text: `insert into email_events (id, candidate_id, decision_id, template, to_email, subject, body)
             values ($1,$2,$3,$4,$5,$6,$7)`,
      params: [emailId, c.id, decisionId, input.decision, c.email, mail.subject, mail.body],
    },
  ]);

  // Auto-send only when Arjun has explicitly enabled it in Settings and Resend is configured.
  let autoSent = false;
  const { resendApiKey, resendFrom } = config();
  if (settings.autoSendAfterDecision && resendApiKey && resendFrom && c.email) {
    try {
      await sendEmail(emailId);
      autoSent = true;
    } catch {
      // failure is recorded on the email row; the decision itself stands
    }
  }
  return { decisionId, emailId, autoSent };
}

export async function updateEmailDraft(id: string, patch: { subject: string; body: string; toEmail: string | null }) {
  const row = await queryOne(
    `update email_events set subject = $2, body = $3, to_email = $4 where id = $1 and status in ('draft', 'failed') returning id`,
    [id, patch.subject, patch.body, patch.toEmail],
  );
  if (!row) throw new ConflictError("Only drafts can be edited.");
}

export async function cancelEmail(id: string) {
  const row = await queryOne(`update email_events set status = 'cancelled' where id = $1 and status in ('draft','failed') returning id`, [id]);
  if (!row) throw new ConflictError("Only drafts can be cancelled.");
}

export async function sendEmail(id: string) {
  const e = await queryOne<{ id: string; to_email: string | null; subject: string; body: string; status: string }>(
    `select id, to_email, subject, body, status from email_events where id = $1`,
    [id],
  );
  if (!e) throw new NotFoundError("Email not found.");
  if (e.status !== "draft" && e.status !== "failed") throw new ConflictError(`This email is already ${e.status}.`);
  if (!e.to_email) throw new ConflictError("No recipient address. Add the candidate's email to the draft first.");
  const settings = await getSettings();
  try {
    const sent = await sendViaResend({ to: e.to_email, subject: e.subject, text: e.body });
    // provider records test-mode redirects, e.g. "resend-test:me@example.com"
    const provider = sent.testMode ? `resend-test:${sent.deliveredTo}` : "resend";
    await query(
      `update email_events set status = 'sent', provider = $4, provider_message_id = $2, sent_at = now(), error = null, approved_by = $3 where id = $1`,
      [id, sent.id, settings.reviewerName, provider],
    );
    return sent;
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) throw err;
    await query(`update email_events set status = 'failed', error = $2 where id = $1`, [id, (err as Error).message.slice(0, 500)]);
    throw err;
  }
}

export async function updateSettings(patch: { reviewerName?: string; companyName?: string; autoSendAfterDecision?: boolean }) {
  await query(
    `update app_settings set
        reviewer_name = coalesce($1, reviewer_name),
        company_name = coalesce($2, company_name),
        auto_send_after_decision = coalesce($3, auto_send_after_decision)
      where id`,
    [patch.reviewerName ?? null, patch.companyName ?? null, patch.autoSendAfterDecision ?? null],
  );
}
