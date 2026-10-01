import type { Metadata } from "next";
import { ArrowLeft, FileText, Lock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DecisionControls } from "@/components/candidate/decision-controls";
import { EditContact } from "@/components/candidate/edit-contact";
import { EmailPanel } from "@/components/candidate/email-panel";
import { EvaluateButton } from "@/components/candidate/evaluate-button";
import { ScoreDial } from "@/components/candidate/score-dial";
import {
  ClosestHire,
  DecisionHistory,
  EvidenceSection,
  Probes,
  ScoreBreakdown,
  StrengthsAndFlags,
  Trace,
  WhyRanked,
} from "@/components/candidate/sections";
import { SetupRequired } from "@/components/setup-required";
import { GateBadge, RoleChip, StatusPill, TierBadge } from "@/components/ui/badges";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { getCandidate } from "@/lib/data";
import { configStatus } from "@/lib/env";
import { ROLES, type RoleCode } from "@/lib/rubric";
import { safeLoad } from "@/lib/safe-load";
import type { DecisionCode } from "@/lib/types";
import { cn } from "@/lib/ui";

export const metadata: Metadata = { title: "Candidate" };

export default async function CandidatePage({ params, searchParams }: PageProps<"/candidates/[id]">) {
  await connection();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const loaded = await safeLoad(() => getCandidate(id));
  if (!loaded.ok) return <SetupRequired reason={loaded.reason} message={loaded.message} />;
  const c = loaded.data;
  if (!c) notFound();

  const status = configStatus();
  const view: RoleCode = sp.view === "pm" || sp.view === "spm" ? sp.view : c.roleCode;
  const otherRole: RoleCode = view === "pm" ? "spm" : "pm";
  const ev = c.evaluation;
  const result = ev?.roleResults[view];
  const scores = ev ? ev.scores.filter((s) => !s.role || s.role === view) : [];
  const currentDecision: DecisionCode | null = c.decisions[0]?.decision ?? null;
  const latestEmail = c.emails[0] ?? null;
  const appliedResult = ev?.roleResults[c.roleCode];

  return (
    <div className="space-y-5">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Pipeline
      </Link>

      {/* ---------------- Header ---------------- */}
      <Card className="animate-rise overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
          {result ? <ScoreDial score={result.totalScore} tier={result.tier} /> : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <RoleChip role={c.roleCode} />
              <StatusPill status={c.status} />
            </div>
            <h1 className="mt-1.5 truncate text-[26px] leading-tight font-semibold tracking-tight sm:text-[30px]">{c.name}</h1>
            <p className="mt-0.5 text-[14px] text-muted">
              {ev?.snapshot.current_role ?? "Not yet evaluated"}
              {ev?.snapshot.domain && <span className="text-subtle"> · {ev.snapshot.domain}</span>}
            </p>
            {result && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TierBadge tier={result.tier} size="lg" />
                <GateBadge passed={result.gatePassed} role={view} />
                <span className="text-[12.5px] text-subtle">AI recommendation for {ROLES[view].title}</span>
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2 lg:items-end">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-subtle uppercase">
              <Lock className="size-3" /> Arjun decides
            </p>
            <DecisionControls
              candidateId={c.id}
              candidateName={c.name}
              current={currentDecision}
              aiTier={appliedResult?.tier ?? null}
              disabled={!ev ? "Run the AI evaluation first" : c.status === "evaluating" ? "Evaluation in progress" : null}
            />
          </div>
        </div>

        {ev && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-2/50 px-5 py-2.5 sm:px-6">
            <div className="flex items-center gap-1 text-[12.5px]">
              <span className="mr-1 text-subtle">View fit for</span>
              {(["pm", "spm"] as RoleCode[]).map((r) => (
                <Link
                  key={r}
                  href={`/candidates/${c.id}?view=${r}`}
                  scroll={false}
                  className={cn(
                    "rounded-md px-2 py-0.5 font-medium transition-colors",
                    view === r ? "bg-surface text-fg shadow-card ring-1 ring-line" : "text-muted hover:text-fg",
                  )}
                >
                  {ROLES[r].shortTitle}
                  {ev.roleResults[r] && <span className="ml-1 text-subtle tabular">{ev.roleResults[r]!.totalScore}</span>}
                </Link>
              ))}
            </div>
            {view !== c.roleCode && (
              <p className="text-[12px] text-amber">
                Applied for {ROLES[c.roleCode].title}. You&apos;re viewing {ROLES[view].title} fit for comparison.
              </p>
            )}
          </div>
        )}
      </Card>

      {c.status === "failed" && c.lastError && (
        <Notice tone="accent" title="The last evaluation failed" icon={<TriangleAlert className="size-4" />}>
          {c.lastError}
        </Notice>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------------- Main column ---------------- */}
        <div className="min-w-0 space-y-5">
          {/* 1. Snapshot */}
          <Card className="animate-rise">
            <SectionHeader index={1} title="Candidate snapshot" action={<EditContact id={c.id} name={c.name} email={c.email} role={c.roleCode} />} />
            <div className="grid gap-5 px-5 py-4 md:grid-cols-[1fr_280px]">
              <div>
                {ev ? (
                  <>
                    <p className="text-[14.5px] leading-relaxed">{ev.snapshot.who_they_are}</p>
                    <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-2 text-[13px] font-medium">
                      {ev.snapshot.career_path}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted">Run the evaluation to extract who this candidate is from their CV.</p>
                )}
              </div>
              <dl className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                <dt className="text-subtle">Applied for</dt>
                <dd>{ROLES[c.roleCode].title}</dd>
                <dt className="text-subtle">Experience</dt>
                <dd>{ev?.snapshot.years_experience != null ? `${ev.snapshot.years_experience} yrs (as stated)` : "Not stated"}</dd>
                <dt className="text-subtle">Location</dt>
                <dd>{c.location ?? ev?.snapshot.location ?? "Not stated"}</dd>
                <dt className="text-subtle">Email</dt>
                <dd className="truncate">{c.email ?? "Not found"}</dd>
                <dt className="text-subtle">Source</dt>
                <dd className="min-w-0">
                  <a href={`/api/candidates/${c.id}/cv`} target="_blank" rel="noopener" className="inline-flex max-w-full items-center gap-1 text-accent-text hover:underline">
                    <FileText className="size-3.5 shrink-0" />
                    <span className="truncate">{c.sourceFilename}</span>
                  </a>
                </dd>
              </dl>
            </div>
            <p className="border-t border-line px-5 py-2.5 text-[12px] text-subtle">
              Name {c.nameSource === "cv" ? "read from the CV" : c.nameSource === "manual" ? "entered manually" : "taken from the filename"}. Name, contact
              details and education are never shown to the scorer.
            </p>
          </Card>

          {!ev ? (
            <Card>
              <EmptyState
                title={c.status === "evaluating" ? "Evaluation in progress…" : "Not evaluated yet"}
                action={status.gemini ? <EvaluateButton candidateId={c.id} /> : undefined}
              >
                {status.gemini
                  ? "The AI extracts verbatim evidence, scores C1–C6 against the rubric, and the app applies gates, overrides and tiers."
                  : "Add GEMINI_API_KEY to .env.local to run evaluations."}
              </EmptyState>
            </Card>
          ) : result ? (
            <>
              <ScoreBreakdown scores={scores} result={result} role={view} />
              <EvidenceSection scores={scores} role={view} />
              <WhyRanked text={ev.whyRanked} result={result} role={view} />
              <ClosestHire evaluation={ev} scores={scores} />
              <StrengthsAndFlags
                strengths={ev.strengths}
                flags={ev.cautionFlags}
                result={result}
                scores={scores}
                otherRole={ev.roleResults[otherRole]}
                duplicateOf={c.duplicateOf}
              />
              <Probes probes={ev.probes} role={view} name={c.name} />
              <Trace evaluation={ev} action={status.gemini ? <EvaluateButton candidateId={c.id} label="Re-run" rerun variant="ghost" /> : undefined} />
            </>
          ) : null}
        </div>

        {/* ---------------- Right rail ---------------- */}
        <aside className="space-y-5 xl:sticky xl:top-20">
          <Card>
            <SectionHeader title="Your decision" hint="The AI never moves a candidate. Only you do." />
            <div className="space-y-4 px-5 py-4">
              {appliedResult && (
                <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2.5 text-[13px]">
                  <span className="text-muted">AI recommends ({ROLES[c.roleCode].shortTitle})</span>
                  <TierBadge tier={appliedResult.tier} />
                </div>
              )}
              <DecisionControls
                candidateId={c.id}
                candidateName={c.name}
                current={currentDecision}
                aiTier={appliedResult?.tier ?? null}
                disabled={!ev ? "Run the AI evaluation first" : c.status === "evaluating" ? "Evaluation in progress" : null}
                layout="stack"
              />
            </div>
          </Card>

          <Card>
            <SectionHeader title="Candidate communication" hint="Prepared after your decision. Sent only when you approve." />
            <div className="px-5 py-4">
              {latestEmail ? (
                <EmailPanel key={latestEmail.id} email={latestEmail} emailConfigured={status.email} testRecipient={status.emailTestRecipient} />
              ) : (
                <p className="text-[12.5px] text-subtle">
                  Once you decide, the matching email (invite, holding update or respectful decline) is drafted here.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <SectionHeader index={10} title="Decision history" />
            <div className="px-5 py-4">
              <DecisionHistory decisions={c.decisions} />
            </div>
          </Card>

          <p className="px-1 text-center text-[12px] text-subtle">Evaluate → review evidence → decide. No score here is a hiring decision.</p>
        </aside>
      </div>
    </div>
  );
}
