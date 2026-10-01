import type { Metadata } from "next";
import { Info, TriangleAlert } from "lucide-react";
import { Card, Eyebrow, SectionHeader } from "@/components/ui/card";
import { NOT_THRIVING, PAST_HIRES, SIGNAL_LABELS, THRIVING, type PastHire, type SignalValue } from "@/lib/past-hires";
import { HIDDEN_PATTERN, PATTERN_CRITERIA, PATTERN_MAX } from "@/lib/rubric";
import { cn } from "@/lib/ui";

export const metadata: Metadata = { title: "Past hires" };

function SignalCell({ v }: { v: SignalValue }) {
  const yes = v === "YES";
  return (
    <td className="px-2 py-2 text-center">
      <span
        className={cn(
          "inline-block min-w-12 rounded px-1.5 py-0.5 text-[11px] font-semibold",
          yes ? "bg-accent-soft text-accent-text" : v === "no" ? "text-subtle" : "bg-surface-2 text-muted",
        )}
      >
        {v}
      </span>
    </td>
  );
}

function HireCard({ h }: { h: PastHire }) {
  const thriving = h.outcome === "thriving";
  return (
    <li className="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{h.fullName}</p>
          <p className="text-[12.5px] text-muted">
            {h.roleTitle} · joined {h.joined}
          </p>
        </div>
        <span className={cn("rounded-md px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap", thriving ? "bg-ok-soft text-ok" : "bg-surface-2 text-muted")}>
          {h.lastRating.replace(" Expectations", "")}
        </span>
      </div>
      <p className="mt-2.5 text-[13px]">{h.path}</p>
      <ul className="mt-2.5 space-y-1 text-[12.5px] text-muted">
        {h.evidence.map((e) => (
          <li key={e} className="flex gap-2">
            <span className={cn("mt-1.5 size-1 shrink-0 rounded-full", thriving ? "bg-accent" : "bg-subtle")} />
            {e}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-[12px]">
        <span className="text-subtle">C1–C5</span>
        <span className="font-mono tabular">{PATTERN_CRITERIA.map((c) => h.scores[c]).join(" · ")}</span>
        <span className="ml-auto font-semibold tabular">
          {h.patternScore}
          <span className="font-normal text-subtle"> / 80</span>
        </span>
      </div>
    </li>
  );
}

function BackTestChart() {
  const groups = [
    { label: "Thriving (Exceeds)", hires: THRIVING, cls: "bg-accent" },
    { label: "Not thriving (Meets / Below)", hires: NOT_THRIVING, cls: "bg-chart-context" },
  ];
  return (
    <figure>
      <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-muted" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-accent" /> Thriving
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-context" /> Not thriving
        </span>
      </div>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-subtle uppercase">{g.label}</p>
            <ul className="space-y-1.5">
              {g.hires.map((h) => (
                <li key={h.id} className="group relative grid grid-cols-[130px_1fr_44px] items-center gap-3 sm:grid-cols-[170px_1fr_44px]">
                  <span className="truncate text-[13px]">{h.fullName}</span>
                  <div className="relative h-5">
                    <div
                      className={cn("h-full origin-left animate-grow rounded-r-[4px] transition-opacity group-hover:opacity-80", g.cls)}
                      style={{ width: `${(h.patternScore / PATTERN_MAX) * 100}%` }}
                    />
                    <div className="pointer-events-none absolute top-full left-0 z-10 mt-1 hidden rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12px] whitespace-nowrap shadow-card group-hover:block">
                      <span className="font-medium">{h.fullName}</span> · {h.lastRating} ·{" "}
                      {PATTERN_CRITERIA.map((c) => `${c} ${h.scores[c]}`).join("  ")}
                    </div>
                  </div>
                  <span className="text-right text-[13px] font-semibold tabular">{h.patternScore}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <figcaption className="mt-4 text-[12.5px] text-muted">
        Pattern score (C1–C5, out of 80) from rubric Part 5. All 5 thrivers score 73+ and all 3 non-thrivers score 30 or below. C1 alone
        separates the groups perfectly.
      </figcaption>
    </figure>
  );
}

export default function PastHiresPage() {
  return (
    <div className="space-y-6">
      <div className="animate-rise">
        <Eyebrow>Calibration · Arjun&apos;s history</Eyebrow>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight">Past hires</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted">
          The rubric is calibrated on the people Arjun has already hired: who is thriving, and who isn&apos;t. The JD describes the role.
          This history shows who succeeds in it.
        </p>
      </div>

      <div className="flex animate-rise gap-3 rounded-xl border border-amber/30 bg-amber-soft px-5 py-4 text-[13.5px]">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber" />
        <p>
          <strong>Only 8 hires (5 thriving).</strong>{" "}
          <span className="text-muted">
            This is a pattern, not proof. Re-check it after every new hire&apos;s first review. The rubric finds thrivers; it does not fine-rank the
            bottom (Preetham, rated Below, scores above the two Meets hires). Scores come from CVs only.
          </span>
        </p>
      </div>

      {/* Pattern */}
      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_1.1fr]">
          <div className="border-b border-line p-6 lg:border-r lg:border-b-0">
            <Eyebrow className="text-accent-text">The hidden pattern</Eyebrow>
            <h2 className="mt-2 text-[24px] font-semibold tracking-tight">{HIDDEN_PATTERN.name}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">{HIDDEN_PATTERN.description}</p>
            <div className="mt-4 flex items-center gap-2 text-[13px]">
              {["Ops floor", "Builds unasked", "Others adopt it"].map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  {i > 0 && <span className="text-subtle">→</span>}
                  <span className="rounded-md bg-surface-2 px-2 py-1 font-medium">{s}</span>
                </span>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] text-subtle">
              What did not predict success: pedigree (the non-thriving group holds the “strongest” paper), certifications, unrelated-domain
              metrics, framework vocabulary, and the closest JD match on paper.
            </p>
          </div>
          <div className="p-6">
            <BackTestChart />
          </div>
        </div>
      </Card>

      {/* Groups */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
            <span className="size-2 rounded-full bg-accent" /> Thriving · Exceeds Expectations <span className="font-normal text-subtle">({THRIVING.length})</span>
          </h2>
          <ul className="grid gap-3">
            {THRIVING.map((h) => (
              <HireCard key={h.id} h={h} />
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
            <span className="size-2 rounded-full bg-chart-context" /> Not thriving · Meets or Below{" "}
            <span className="font-normal text-subtle">({NOT_THRIVING.length})</span>
          </h2>
          <ul className="grid gap-3">
            {NOT_THRIVING.map((h) => (
              <HireCard key={h.id} h={h} />
            ))}
          </ul>
          <div className="mt-3 flex gap-2.5 rounded-xl border border-line bg-surface-2/60 p-4 text-[12.5px] text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <p>
              Caution signals seen here: whole career in large structured orgs, logistics only from the desk/API side, achievements owned by a
              senior layer, and CVs that are all wins. The tool flags these for probing. It never auto-rejects on them.
            </p>
          </div>
        </section>
      </div>

      {/* Signal matrix */}
      <Card>
        <SectionHeader title="Signal matrix" hint="What the 5 thriving hires have in common, and the other 3 do not (rubric Part 1)." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-subtle">
                <th className="px-5 py-2.5 font-medium">Signal</th>
                {PAST_HIRES.map((h) => (
                  <th key={h.id} className={cn("px-2 py-2.5 text-center font-medium", h.outcome === "thriving" ? "text-fg" : "text-subtle")}>
                    {h.fullName.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(SIGNAL_LABELS) as (keyof typeof SIGNAL_LABELS)[]).map((k) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <td className="px-5 py-2">
                    <span className="mr-2 font-mono font-semibold text-subtle">{k}</span>
                    {SIGNAL_LABELS[k]}
                  </td>
                  {PAST_HIRES.map((h) => (
                    <SignalCell key={h.id} v={h.signals[k]} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
