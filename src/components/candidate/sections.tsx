import { ArrowRight, CircleAlert, Cpu, FileSearch, Flag, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { ConfidenceTag, DecisionPill, EvidenceKind, TierBadge } from "@/components/ui/badges";
import { Card, SectionHeader } from "@/components/ui/card";
import { pastHireById } from "@/lib/past-hires";
import { criterionDef, PATTERN_CRITERIA, ROLES, WRONG_ROLE_MESSAGE, type RoleCode } from "@/lib/rubric";
import type { DecisionView, EvaluationView, ProbeView, RoleResultView, ScoreView } from "@/lib/types";
import { cn, dateTime, formatScore } from "@/lib/ui";
import { CopyButton } from "./copy-button";
import { ScoreDots } from "./score-dial";

/* ---------------------------------------------------------------- */
/* 2. Score breakdown                                                */
/* ---------------------------------------------------------------- */
export function ScoreBreakdown({ scores, result, role }: { scores: ScoreView[]; result: RoleResultView; role: RoleCode }) {
  return (
    <Card>
      <SectionHeader
        index={2}
        title="Score breakdown"
        hint="Points = (score ÷ 3) × weight. Calculated by the app from the criterion scores; the model never sets the total or tier."
      />
      <div className="divide-y divide-line">
        {scores.map((s) => {
          const def = criterionDef(s.criterion, role);
          return (
            <a
              key={`${s.criterion}-${s.role ?? ""}`}
              href={`#ev-${s.criterion}`}
              className="grid grid-cols-[34px_1fr_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60 sm:grid-cols-[34px_1fr_90px_110px]"
            >
              <span className="font-mono text-[12px] font-semibold text-subtle">{s.criterion}</span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium">{def.name}</p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cn("h-full origin-left animate-grow rounded-full", s.score === 3 ? "bg-accent" : s.score === 0 ? "bg-transparent" : "bg-fg/70")}
                    style={{ width: `${(s.points / s.weight) * 100}%` }}
                  />
                </div>
              </div>
              <span className="hidden sm:block">
                <ScoreDots score={s.score} />
              </span>
              <span className="text-right text-[13px] tabular">
                <span className="font-semibold">{formatScore(Math.round(s.points * 10) / 10)}</span>
                <span className="text-subtle"> / {s.weight}</span>
              </span>
            </a>
          );
        })}
      </div>
      <div className="grid grid-cols-2 border-t border-line text-[13px] sm:grid-cols-3">
        <div className="border-r border-line px-5 py-3">
          <p className="text-subtle">Pattern C1–C5</p>
          <p className="mt-0.5 text-lg font-semibold tabular">
            {formatScore(result.patternScore)} <span className="text-[13px] font-normal text-subtle">/ 80</span>
          </p>
        </div>
        <div className="px-5 py-3 sm:border-r sm:border-line">
          <p className="text-subtle">Total</p>
          <p className="mt-0.5 text-lg font-semibold tabular">
            {formatScore(result.totalScore)} <span className="text-[13px] font-normal text-subtle">/ 100</span>
          </p>
        </div>
        <div className="col-span-2 border-t border-line px-5 py-3 sm:col-span-1 sm:border-t-0">
          <p className="text-subtle">Gate · {ROLES[role].shortTitle} needs C6 ≥ {ROLES[role].gateMin}</p>
          <p className={cn("mt-0.5 text-lg font-semibold", result.gatePassed ? "" : "text-accent-text")}>{result.gatePassed ? "Pass" : "Fail"}</p>
        </div>
      </div>
      <ol className="space-y-1.5 border-t border-line bg-surface-2/40 px-5 py-3.5 text-[12.5px] text-muted">
        {result.tierReasons.map((r, i) => (
          <li key={i} className="flex gap-2">
            <ArrowRight className="mt-0.5 size-3 shrink-0 text-subtle" />
            <span>{r}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 pt-1 font-medium text-fg">
          <ArrowRight className="size-3 shrink-0 text-accent" /> Recommendation: <TierBadge tier={result.tier} />
          {result.scoreTier !== result.tier && <span className="text-subtle">(score band was {result.scoreTier})</span>}
        </li>
      </ol>
    </Card>
  );
}

/* ---------------------------------------------------------------- */
/* 3. Evidence                                                       */
/* ---------------------------------------------------------------- */
export function EvidenceSection({ scores, role }: { scores: ScoreView[]; role: RoleCode }) {
  return (
    <Card>
      <SectionHeader
        index={3}
        title="Evidence"
        hint={
          <span className="flex flex-wrap items-center gap-1.5">
            Every quote is checked against the CV text. <EvidenceKind kind="verified" /> <EvidenceKind kind="inference" />
            <EvidenceKind kind="missing" />
          </span>
        }
      />
      <div className="divide-y divide-line">
        {scores.map((s, i) => {
          const def = criterionDef(s.criterion, role);
          return (
            <details key={`${s.criterion}-${s.role ?? ""}`} id={`ev-${s.criterion}`} open={i < 2} className="group scroll-mt-20">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60 [&::-webkit-details-marker]:hidden">
                <span className="font-mono text-[12px] font-semibold text-subtle">{s.criterion}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{def.name}</span>
                <ScoreDots score={s.score} />
                <span className="w-8 text-right text-[13px] font-semibold tabular">{s.score}/3</span>
                <ArrowRight className="size-3.5 text-subtle transition-transform group-open:rotate-90" />
              </summary>
              <div className="space-y-3 px-5 pt-1 pb-4 sm:pl-[64px]">
                <div className="flex flex-wrap items-center gap-2">
                  <ConfidenceTag level={s.confidence} />
                  <span className="text-[12px] text-subtle">Anchor {s.score}: {def.anchors[s.score as 0 | 1 | 2 | 3]}</span>
                </div>
                <p className="text-[13.5px] leading-relaxed">{s.rationale}</p>
                {s.aiScore != null && (
                  <p className="text-[12.5px] text-amber">
                    Model proposed {s.aiScore}/3. The app corrected it to {s.score}/3 by applying the rubric rule (checks met).
                  </p>
                )}

                {s.subChecks && (
                  <ul className="grid gap-2 sm:grid-cols-3">
                    {(["a", "b", "c"] as const).map((k) => {
                      const sc = s.subChecks![k];
                      const label = ROLES.spm.c6Checks?.find((c) => c.key === k)?.label ?? k;
                      return (
                        <li key={k} className={cn("rounded-lg border px-3 py-2.5 text-[12.5px]", sc.met ? "border-line bg-surface-2" : "border-dashed border-line")}>
                          <p className="font-semibold">
                            ({k}) {sc.met ? "Met" : "Not met"}
                          </p>
                          <p className="mt-0.5 text-muted">{label}</p>
                          <p className="mt-1.5">{sc.note}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {s.evidence.length > 0 && (
                  <ul className="space-y-1.5">
                    {s.evidence.map((e, j) => (
                      <li key={j} className="flex items-start gap-2.5 rounded-lg border-l-2 border-ok/70 bg-surface-2/70 py-2 pr-3 pl-3">
                        <EvidenceKind kind={e.status} />
                        <q className="text-[13px] leading-relaxed">{e.quote}</q>
                      </li>
                    ))}
                  </ul>
                )}
                {s.inferences.length > 0 && (
                  <ul className="space-y-1.5">
                    {s.inferences.map((t, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-[13px] text-muted">
                        <EvidenceKind kind="inference" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.missing.length > 0 && (
                  <ul className="space-y-1.5">
                    {s.missing.map((t, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-[13px] text-muted">
                        <EvidenceKind kind="missing" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.evidence.length === 0 && s.inferences.length === 0 && s.missing.length === 0 && (
                  <p className="text-[13px] text-subtle">No evidence found in the CV for this criterion.</p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- */
/* 4. Why ranked here                                                */
/* ---------------------------------------------------------------- */
export function WhyRanked({ text, result, role }: { text: string; result: RoleResultView; role: RoleCode }) {
  return (
    <Card>
      <SectionHeader index={4} title="Why this candidate ranked here" />
      <div className="space-y-3 px-5 py-4">
        <p className="text-[15px] leading-relaxed font-medium">
          {formatScore(result.totalScore)}/100 for {ROLES[role].title} → <TierBadge tier={result.tier} />
          {result.c1CapApplied && <span className="text-muted"> · capped by the C1 = 0 override</span>}
          {result.gateCapApplied && <span className="text-muted"> · not shortlisted: role gate failed</span>}
        </p>
        <p className="text-[14px] leading-relaxed text-muted">{text}</p>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- */
/* 5. Closest past hire                                              */
/* ---------------------------------------------------------------- */
export function ClosestHire({ evaluation, scores }: { evaluation: EvaluationView; scores: ScoreView[] }) {
  const hire = pastHireById(evaluation.closestPastHireId);
  const nearest = pastHireById(evaluation.nearestByScoresId);
  if (!hire) return null;
  const mine = Object.fromEntries(scores.filter((s) => !s.role).map((s) => [s.criterion, s.score]));
  return (
    <Card>
      <SectionHeader index={5} title="Closest thriving past hire" hint="Which of Arjun's thriving hires this candidate most resembles, and how." />
      <div className="grid gap-5 px-5 py-4 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-text">
              {hire.fullName.split(" ").map((w) => w[0]).join("")}
            </div>
            <div>
              <p className="font-semibold">{hire.fullName}</p>
              <p className="text-[12.5px] text-muted">
                {hire.roleTitle} · joined {hire.joined} · <span className="text-ok">{hire.lastRating}</span>
              </p>
            </div>
          </div>
          <p className="mt-2 text-[12.5px] text-subtle">{hire.path}</p>
          <p className="mt-3 text-[13.5px] leading-relaxed">{evaluation.closestReason}</p>
          {nearest && nearest.id !== hire.id && (
            <p className="mt-3 text-[12.5px] text-muted">
              Cross-check · nearest by C1–C5 score profile: <span className="font-medium text-fg">{nearest.fullName}</span> ({nearest.lastRating})
            </p>
          )}
        </div>
        <div className="rounded-lg border border-line bg-surface-2/50 p-3">
          <p className="mb-2 flex justify-between text-[11px] font-semibold tracking-wide text-subtle uppercase">
            <span>Pattern</span>
            <span>
              <span className="text-fg">Candidate</span> · {hire.fullName.split(" ")[0]}
            </span>
          </p>
          <ul className="space-y-1.5">
            {PATTERN_CRITERIA.map((c) => (
              <li key={c} className="grid grid-cols-[26px_1fr] items-center gap-2">
                <span className="font-mono text-[11px] text-subtle">{c}</span>
                <div className="space-y-0.5">
                  <div className="h-1.5 rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-fg" style={{ width: `${((mine[c] ?? 0) / 3) * 100}%` }} />
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-accent/70" style={{ width: `${(hire.scores[c] / 3) * 100}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- */
/* 6 & 7. Strengths · Gaps / caution flags                           */
/* ---------------------------------------------------------------- */
const FLAG_LABEL: Record<string, string> = {
  large_structured_org: "Large, structured orgs",
  desk_only_logistics: "Desk-only logistics",
  team_output_senior_layer: "Senior layer made the calls",
  all_wins: "CV is all wins",
  thin_evidence: "Thin evidence",
  other: "Note",
};

export function StrengthsAndFlags({
  strengths,
  flags,
  result,
  scores,
  otherRole,
  duplicateOf,
}: {
  strengths: string[];
  flags: EvaluationView["cautionFlags"];
  result: RoleResultView;
  scores: ScoreView[];
  otherRole: RoleResultView | undefined;
  duplicateOf: { name: string; similarity: number } | null;
}) {
  const missing = scores.flatMap((s) => s.missing.map((m) => ({ c: s.criterion, m })));
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <SectionHeader index={6} title="Strengths" />
        <ul className="space-y-2.5 px-5 py-4">
          {strengths.length === 0 && <li className="text-[13px] text-subtle">No clear strengths against the pattern.</li>}
          {strengths.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed">
              <Sparkles className="mt-1 size-3.5 shrink-0 text-accent" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <SectionHeader index={7} title="Gaps & caution flags" hint="Probe these. Never auto-reject on them." />
        <ul className="space-y-2.5 px-5 py-4 text-[13px]">
          {result.wrongRoleFlag && (
            <li className="flex gap-2.5 rounded-lg bg-accent-soft px-3 py-2.5">
              <Flag className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
              <span>
                <strong>{WRONG_ROLE_MESSAGE}</strong>
                {otherRole?.gatePassed && ` Passes the ${ROLES[otherRole.role].title} gate (${formatScore(otherRole.totalScore)}/100, ${otherRole.tier}).`}
              </span>
            </li>
          )}
          {result.c1CapApplied && (
            <li className="flex gap-2.5">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-accent-text" />
              <span>Override applied: no operations exposure (C1 = 0) caps this candidate at CONSIDER.</span>
            </li>
          )}
          {duplicateOf && (
            <li className="flex gap-2.5">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber" />
              <span>
                CV text is {Math.round(duplicateOf.similarity * 100)}% identical to <strong>{duplicateOf.name}</strong>&apos;s. Verify authenticity before
                deciding.
              </span>
            </li>
          )}
          {flags.map((f, i) => (
            <li key={i} className="flex gap-2.5">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber" />
              <span>
                <span className="font-medium">{FLAG_LABEL[f.type] ?? "Note"}</span> <span className="text-muted">— {f.detail}</span>
                {f.source === "system" && <span className="ml-1 text-[11px] text-subtle">(system check)</span>}
              </span>
            </li>
          ))}
          {missing.slice(0, 4).map((m, i) => (
            <li key={`m${i}`} className="flex gap-2.5 text-muted">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-subtle" />
              <span>
                <span className="font-mono text-[11px]">{m.c}</span> Missing: {m.m}
              </span>
            </li>
          ))}
          {!result.wrongRoleFlag && !result.c1CapApplied && !duplicateOf && flags.length === 0 && missing.length === 0 && (
            <li className="text-subtle">No caution signals found.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* 8. Interview probes                                               */
/* ---------------------------------------------------------------- */
export function Probes({ probes, role, name }: { probes: ProbeView[]; role: RoleCode; name: string }) {
  const list = probes.filter((p) => p.role === role);
  const text = [`Interview probes: ${name} (${ROLES[role].title})`, ...list.map((p, i) => `${i + 1}. [${p.criterion}] ${p.question}${p.focus ? `\n   Verify: ${p.focus}` : ""}`)].join("\n");
  return (
    <Card>
      <SectionHeader
        index={8}
        title="Interview probes"
        hint="From rubric Part 6, attached to the weakest or thinnest-evidence criteria."
        action={<CopyButton text={text} label="Copy all" />}
      />
      <ol className="divide-y divide-line">
        {list.map((p, i) => (
          <li key={i} className="flex gap-4 px-5 py-3.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface-2 font-mono text-[11px] font-semibold text-muted">{p.criterion}</span>
            <div className="min-w-0">
              <p className="text-[14px] leading-relaxed font-medium">{p.question}</p>
              {p.focus && (
                <p className="mt-1 text-[13px] text-muted">
                  <span className="font-medium text-fg">Verify for this candidate:</span> {p.focus}
                </p>
              )}
              <p className="mt-1 text-[12px] text-subtle">{p.reason}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* ---------------------------------------------------------------- */
/* 9. AI reasoning / evidence trace                                  */
/* ---------------------------------------------------------------- */
export function Trace({ evaluation, action }: { evaluation: EvaluationView; action?: React.ReactNode }) {
  const ev = evaluation.trace.evidence;
  return (
    <Card>
      <SectionHeader index={9} title="AI reasoning & evidence trace" hint="How this recommendation was produced, step by step." action={action} />
      <div className="grid gap-px border-b border-line bg-line text-[12.5px] sm:grid-cols-4">
        {[
          ["Model", evaluation.model],
          ["Prompt", evaluation.promptVersion],
          ["Rubric", evaluation.rubricVersion],
          ["Run time", evaluation.durationMs ? `${(evaluation.durationMs / 1000).toFixed(1)}s` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface px-5 py-2.5">
            <p className="text-subtle">{k}</p>
            <p className="truncate font-mono text-[12px]">{v}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 border-b border-line px-5 py-3 text-[12.5px]">
        <span className="inline-flex items-center gap-1.5">
          <FileSearch className="size-3.5 text-subtle" /> Evidence audit:
        </span>
        <span className="text-ok">{ev.verified} verified verbatim</span>
        <span className="text-muted">{ev.near} near-verbatim</span>
        <span className={ev.unverified ? "text-accent-text" : "text-muted"}>{ev.unverified} not found → moved to inferences</span>
      </div>
      <ol className="relative space-y-3 px-5 py-4">
        {evaluation.trace.steps.map((s, i) => (
          <li key={i} className="relative flex gap-3 pl-1">
            <span className="mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-surface-2 ring-1 ring-line">
              <span className="size-1.5 rounded-full bg-accent" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold tracking-wide text-subtle uppercase">{s.step}</p>
              <p className="text-[13px]">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <details className="border-t border-line">
        <summary className="flex cursor-pointer items-center gap-1.5 px-5 py-2.5 text-[12.5px] text-muted hover:text-fg">
          <Cpu className="size-3.5" /> Evaluated {dateTime(evaluation.createdAt)} · view snapshot JSON
        </summary>
        <pre className="max-h-72 overflow-auto bg-surface-2/60 px-5 py-3 font-mono text-[11.5px] text-muted">
          {JSON.stringify({ snapshot: evaluation.snapshot, strengths: evaluation.strengths, caution_flags: evaluation.cautionFlags }, null, 2)}
        </pre>
      </details>
    </Card>
  );
}

/* ---------------------------------------------------------------- */
/* 10. Decision history                                              */
/* ---------------------------------------------------------------- */
export function DecisionHistory({ decisions }: { decisions: DecisionView[] }) {
  if (decisions.length === 0)
    return <p className="text-[12.5px] text-subtle">No decision yet. Every status change here is made by Arjun, never by the AI.</p>;
  return (
    <ol className="space-y-3">
      {decisions.map((d, i) => (
        <li key={d.id} className={cn("relative pl-4", i > 0 && "opacity-75")}>
          <span className={cn("absolute top-1.5 left-0 size-2 rounded-full", i === 0 ? "bg-accent" : "bg-line-strong")} />
          <div className="flex flex-wrap items-center gap-2">
            <DecisionPill decision={d.decision} />
            <span className="text-[12px] text-muted">{dateTime(d.createdAt)}</span>
          </div>
          <p className="mt-1 text-[12.5px] text-muted">
            by <span className="font-medium text-fg">{d.decidedBy}</span> · {ROLES[d.roleCode].shortTitle}
            {d.aiTier && (
              <>
                {" "}
                · AI said {d.aiTier} ({formatScore(d.aiScore)})
              </>
            )}
          </p>
          {d.note && <p className="mt-1 rounded-md bg-surface-2 px-2.5 py-1.5 text-[12.5px]">{d.note}</p>}
        </li>
      ))}
    </ol>
  );
}
