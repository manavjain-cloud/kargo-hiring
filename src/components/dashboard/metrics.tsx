import type { DashboardMetrics } from "@/lib/types";
import { cn } from "@/lib/ui";

function Metric({
  label,
  value,
  sub,
  emphasis,
  delay,
}: {
  label: string;
  value: number;
  sub?: React.ReactNode;
  emphasis?: boolean;
  delay: number;
}) {
  return (
    <div
      className={cn(
        "group relative animate-rise overflow-hidden rounded-xl border bg-surface px-4 py-3.5 shadow-card transition-colors",
        emphasis ? "border-accent/40" : "border-line hover:border-line-strong",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {emphasis && <span className="absolute inset-x-0 top-0 h-[2px] bg-accent" />}
      <p className="text-[12px] font-medium text-muted">{label}</p>
      <p className={cn("mt-1 text-[28px] leading-none font-semibold tracking-tight tabular", emphasis && "text-accent-text")}>{value}</p>
      {sub && <p className="mt-1.5 truncate text-[11.5px] text-subtle">{sub}</p>}
    </div>
  );
}

export function MetricStrip({ m }: { m: DashboardMetrics }) {
  const decisions = m.movedForward + m.onHold + m.declined;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <Metric label="Candidates" value={m.candidates} sub={m.notEvaluated ? `${m.notEvaluated} not yet evaluated` : "All evaluated"} delay={0} />
      <Metric label="Evaluated" value={m.evaluated} sub={m.candidates ? `${Math.round((m.evaluated / m.candidates) * 100)}% of pipeline` : "—"} delay={40} />
      <Metric label="Shortlisted" value={m.shortlisted} sub="Score 75+ · gate passed" emphasis delay={80} />
      <Metric label="Consider" value={m.consider} sub="Score 55–74 or capped" delay={120} />
      <Metric label="Pending decision" value={m.pendingDecision} sub="Waiting on Arjun" delay={160} />
      <Metric
        label="Decisions"
        value={decisions}
        sub={
          <>
            <span className="text-ok">{m.movedForward} forward</span> · {m.onHold} hold · {m.declined} decline
          </>
        }
        delay={200}
      />
    </div>
  );
}

export function TierDistribution({ m }: { m: DashboardMetrics }) {
  const total = m.candidates || 1;
  const segs = [
    { key: "Shortlist", n: m.shortlisted, cls: "bg-accent" },
    { key: "Consider", n: m.consider, cls: "bg-amber" },
    { key: "Pass", n: m.pass, cls: "bg-line-strong" },
    { key: "Not evaluated", n: m.notEvaluated, cls: "bg-surface-3" },
  ];
  return (
    <div className="animate-rise" style={{ animationDelay: "240ms" }}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Tier distribution">
        {segs.map((s) =>
          s.n > 0 ? (
            <span key={s.key} className={cn("h-full origin-left animate-grow border-r-2 border-bg last:border-r-0", s.cls)} style={{ width: `${(s.n / total) * 100}%` }} />
          ) : null,
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        {segs.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-sm", s.cls)} />
            {s.key} <span className="font-medium text-fg tabular">{s.n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
