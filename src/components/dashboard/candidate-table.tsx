"use client";

import { ArrowUpRight, Copy, Search, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DecisionPill, GateBadge, RoleChip, StatusPill, TierBadge } from "@/components/ui/badges";
import type { CandidateRow, DecisionCode, PipelineStatus } from "@/lib/types";
import { cn, formatScore, relativeTime } from "@/lib/ui";

type TierFilter = "all" | "SHORTLIST" | "CONSIDER" | "PASS" | "unevaluated";
type StateFilter = "all" | "pending" | "decided";
type Sort = "score" | "recent" | "name";

const TIER_FILTERS: { v: TierFilter; label: string }[] = [
  { v: "all", label: "All" },
  { v: "SHORTLIST", label: "Shortlist" },
  { v: "CONSIDER", label: "Consider" },
  { v: "PASS", label: "Pass" },
  { v: "unevaluated", label: "Not evaluated" },
];

const DECIDED = new Set(["moved_forward", "on_hold", "declined"]);

/** The decision Arjun took, derived from the pipeline status his decision set. */
const STATUS_DECISION: Partial<Record<PipelineStatus, DecisionCode>> = {
  moved_forward: "move_forward",
  on_hold: "hold",
  declined: "decline",
};

function ScoreCell({ score }: { score: number | null }) {
  if (score == null) return <span className="text-subtle">—</span>;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 text-right text-[15px] font-semibold tabular">{formatScore(score)}</span>
      <span className="hidden h-1 w-12 overflow-hidden rounded-full bg-surface-2 lg:block">
        <span
          className={cn("block h-full rounded-full", score >= 75 ? "bg-accent" : score >= 55 ? "bg-amber" : "bg-line-strong")}
          style={{ width: `${score}%` }}
        />
      </span>
    </div>
  );
}

function KeySignal({ s }: { s: CandidateRow["keySignal"] }) {
  if (!s) return <span className="text-subtle">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px]", s.negative ? "text-accent-text" : "text-fg")}>
      {s.negative ? <TriangleAlert className="size-3.5" /> : <span className="size-1.5 rounded-full bg-accent" />}
      {s.label}
      {!s.negative && <span className="text-subtle tabular">{s.score}/3</span>}
    </span>
  );
}

export function CandidateTable({ rows }: { rows: CandidateRow[] }) {
  const router = useRouter();
  const [tier, setTier] = useState<TierFilter>("all");
  const [state, setState] = useState<StateFilter>("all");
  const [sort, setSort] = useState<Sort>("score");
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (tier === "unevaluated" && r.tier) return false;
        if (tier !== "all" && tier !== "unevaluated" && r.tier !== tier) return false;
        if (state === "pending" && r.status !== "evaluated") return false;
        if (state === "decided" && !DECIDED.has(r.status)) return false;
        if (needle && !`${r.name} ${r.currentPath ?? ""} ${r.sourceFilename}`.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "recent") return (b.lastEvaluatedAt ?? b.createdAt).localeCompare(a.lastEvaluatedAt ?? a.createdAt);
        return (b.totalScore ?? -1) - (a.totalScore ?? -1);
      });
  }, [rows, tier, state, sort, q]);

  const counts = useMemo(() => {
    const c: Record<TierFilter, number> = { all: rows.length, SHORTLIST: 0, CONSIDER: 0, PASS: 0, unevaluated: 0 };
    for (const r of rows) {
      if (r.tier) c[r.tier]++;
      else c.unevaluated++;
    }
    return c;
  }, [rows]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {TIER_FILTERS.map((f) => (
            <button
              key={f.v}
              onClick={() => setTier(f.v)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors",
                tier === f.v ? "bg-fg text-bg" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {f.label} <span className={cn("tabular", tier === f.v ? "opacity-70" : "text-subtle")}>{counts[f.v]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={state}
            onChange={(e) => setState(e.target.value as StateFilter)}
            className="h-8 rounded-md border border-line bg-surface px-2 text-[13px] text-fg"
            aria-label="Decision state"
          >
            <option value="all">Any status</option>
            <option value="pending">Awaiting decision</option>
            <option value="decided">Decided</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-8 rounded-md border border-line bg-surface px-2 text-[13px] text-fg"
            aria-label="Sort"
          >
            <option value="score">Sort: score</option>
            <option value="recent">Sort: recent</option>
            <option value="name">Sort: name</option>
          </select>
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search candidates"
              className="h-8 w-48 rounded-md border border-line bg-surface pr-2 pl-8 text-[13px] placeholder:text-subtle focus:border-line-strong"
              aria-label="Search candidates"
            />
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted">No candidates match these filters.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-[11.5px] font-semibold tracking-wide text-subtle uppercase">
                  <th className="py-2.5 pr-3 pl-5 font-semibold">Candidate</th>
                  <th className="px-3 font-semibold">Role</th>
                  <th className="px-3 font-semibold">Score</th>
                  <th className="px-3 font-semibold">Tier</th>
                  <th className="px-3 font-semibold">Gate</th>
                  <th className="px-3 font-semibold">Key signal</th>
                  <th className="px-3 font-semibold">Status</th>
                  <th className="px-3 font-semibold">Evaluated</th>
                  <th className="py-2.5 pr-5 pl-3 text-right font-semibold">Decision</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/candidates/${r.id}`)}
                    className="group animate-fade cursor-pointer border-b border-line transition-colors last:border-b-0 hover:bg-surface-2/70"
                    style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
                  >
                    <td className="max-w-[300px] py-3 pr-3 pl-5">
                      <Link href={`/candidates/${r.id}`} className="block" onClick={(e) => e.stopPropagation()}>
                        <span className="flex items-center gap-1.5 font-medium group-hover:text-accent-text">
                          <span className="truncate">{r.name}</span>
                          {r.duplicateOf && (
                            <span title="Near-identical CV to another candidate" className="text-amber">
                              <Copy className="size-3.5" />
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-[12.5px] text-muted">{r.currentPath ?? r.sourceFilename}</span>
                      </Link>
                    </td>
                    <td className="px-3">
                      <RoleChip role={r.roleCode} />
                    </td>
                    <td className="px-3">
                      <ScoreCell score={r.totalScore} />
                    </td>
                    <td className="px-3">
                      <TierBadge tier={r.tier} />
                    </td>
                    <td className="px-3">
                      <GateBadge passed={r.gatePassed} role={r.roleCode} />
                    </td>
                    <td className="px-3">
                      <KeySignal s={r.keySignal} />
                    </td>
                    <td className="px-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-3 text-[12.5px] whitespace-nowrap text-muted">{relativeTime(r.lastEvaluatedAt)}</td>
                    <td className="py-3 pr-5 pl-3 text-right">
                      {STATUS_DECISION[r.status] ? (
                        <DecisionPill decision={STATUS_DECISION[r.status]!} />
                      ) : r.status === "evaluated" ? (
                        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-text">
                          Review <ArrowUpRight className="size-3.5" />
                        </span>
                      ) : (
                        <span className="text-[12.5px] text-subtle">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-line md:hidden">
            {visible.map((r) => (
              <li key={r.id}>
                <Link href={`/candidates/${r.id}`} className="flex items-start justify-between gap-3 px-4 py-3.5 active:bg-surface-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="truncate text-[12.5px] text-muted">{r.currentPath ?? r.sourceFilename}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <RoleChip role={r.roleCode} />
                      <TierBadge tier={r.tier} />
                      <GateBadge passed={r.gatePassed} role={r.roleCode} />
                      {STATUS_DECISION[r.status] && <DecisionPill decision={STATUS_DECISION[r.status]!} />}
                    </div>
                    <div className="mt-2">
                      <StatusPill status={r.status} />
                    </div>
                  </div>
                  <span className="text-2xl font-semibold tabular">{formatScore(r.totalScore)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
