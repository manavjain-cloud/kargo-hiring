import { ArrowRight, FileUp, Upload, Users } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { CandidateTable } from "@/components/dashboard/candidate-table";
import { EvaluatePending } from "@/components/dashboard/evaluate-pending";
import { MetricStrip, TierDistribution } from "@/components/dashboard/metrics";
import { SetupRequired } from "@/components/setup-required";
import { currentRoleFilter } from "@/components/shell/app-header";
import { TierBadge } from "@/components/ui/badges";
import { ButtonLink } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { computeMetrics, listCandidates } from "@/lib/data";
import { ROLES } from "@/lib/rubric";
import { safeLoad } from "@/lib/safe-load";
import { formatScore } from "@/lib/ui";

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  await connection();
  const sp = await searchParams;
  const role = await currentRoleFilter(sp.role);
  const loaded = await safeLoad(() => listCandidates(role));
  if (!loaded.ok) return <SetupRequired reason={loaded.reason} message={loaded.message} />;

  const rows = loaded.data;
  const m = computeMetrics(rows);
  const pendingIds = rows.filter((r) => r.status === "uploaded" || r.status === "failed").map((r) => r.id);
  const readyForCall = rows.filter((r) => r.status === "evaluated" && r.tier === "SHORTLIST").slice(0, 3);
  const roleLabel = role === "all" ? "PM + Senior PM" : ROLES[role].title;
  const uploadHref = role === "all" ? "/candidates/new" : `/candidates/new?role=${role}`;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-rise">
          <Eyebrow>Hiring pipeline · {roleLabel}</Eyebrow>
          <h1 className="mt-1.5 text-[28px] leading-tight font-semibold tracking-tight sm:text-[32px]">
            Who looks like your <span className="text-accent-text">best hires</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            Every CV is scored against the operator-turned-builder pattern from Arjun&apos;s 8 past hires, with the evidence written
            down. The AI recommends. You make every call.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <EvaluatePending ids={pendingIds} />
          <ButtonLink href={uploadHref} variant="primary">
            <Upload className="size-4" /> Upload CVs
          </ButtonLink>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="animate-rise">
          <EmptyState
            icon={<Users className="size-5" />}
            title={role === "all" ? "No candidates yet" : `No ${ROLES[role].title} candidates yet`}
            action={
              <ButtonLink href={uploadHref} variant="primary">
                <FileUp className="size-4" /> Upload CVs
              </ButtonLink>
            }
          >
            Upload PDF, DOCX or TXT CVs and pick the role they applied for. Each CV goes through text extraction, verbatim evidence
            extraction, rubric scoring (C1–C6), and deterministic gate and tier checks. Then it waits for your decision.
          </EmptyState>
          <ol className="grid border-t border-line text-[13px] sm:grid-cols-5">
            {["Upload CV", "Extract evidence", "Score C1–C6", "Gate · tier · probes", "Arjun decides"].map((s, i) => (
              <li key={s} className="flex items-center gap-2.5 border-line px-5 py-3.5 not-last:border-b sm:not-last:border-r sm:not-last:border-b-0">
                <span className={`grid size-5 place-items-center rounded-full text-[11px] font-semibold ${i === 4 ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"}`}>
                  {i + 1}
                </span>
                <span className={i === 4 ? "font-medium" : "text-muted"}>{s}</span>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <>
          <MetricStrip m={m} />
          <TierDistribution m={m} />

          {readyForCall.length > 0 && (
            <section className="animate-rise" style={{ animationDelay: "280ms" }}>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold tracking-tight">Ready for your call</h2>
                <span className="text-[12px] text-subtle">Shortlisted · awaiting decision</span>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {readyForCall.map((r) => (
                  <Link
                    key={r.id}
                    href={`/candidates/${r.id}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card transition-all hover:-translate-y-px hover:border-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="truncate text-[12.5px] text-muted">{r.currentPath ?? ROLES[r.roleCode].title}</p>
                      <div className="mt-2">
                        <TierBadge tier={r.tier} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[26px] leading-none font-semibold tabular">{formatScore(r.totalScore)}</p>
                      <p className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-accent-text">
                        Decide <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <Card className="animate-rise overflow-hidden" id="candidates">
            <CandidateTable rows={rows} />
          </Card>
        </>
      )}
    </div>
  );
}
