import type { Metadata } from "next";
import { Ban, Lock, Scale, ShieldCheck } from "lucide-react";
import { TierBadge } from "@/components/ui/badges";
import { Card, Eyebrow, SectionHeader } from "@/components/ui/card";
import {
  C6_WEIGHT,
  CAUTION_SIGNALS,
  CRITERIA,
  FAIRNESS_GUARDRAILS,
  OVERRIDE_RULE,
  PATTERN_CRITERIA,
  PROBES,
  ROLES,
  RUBRIC_VERSION,
  TIER_BANDS,
  WRONG_ROLE_MESSAGE,
  ZERO_WEIGHT_SIGNALS,
  type CriterionDef,
  type RoleCode,
  type Score,
} from "@/lib/rubric";
import { cn } from "@/lib/ui";

export const metadata: Metadata = { title: "Rubric" };

const SCORES: Score[] = [3, 2, 1, 0];
const SEGMENTS = [
  ...PATTERN_CRITERIA.map((c) => ({ code: c, name: CRITERIA[c].short, weight: CRITERIA[c].weight })),
  { code: "C6", name: "Role fit", weight: C6_WEIGHT },
];

function Anchors({ anchors }: { anchors: CriterionDef["anchors"] }) {
  return (
    <ul className="divide-y divide-line rounded-lg border border-line">
      {SCORES.map((s) => (
        <li key={s} className="grid grid-cols-[28px_1fr] gap-2 px-3 py-2 text-[13px]">
          <span className={cn("font-mono font-semibold", s === 3 ? "text-accent-text" : "text-subtle")}>{s}</span>
          <span className={s === 0 ? "text-muted" : ""}>{anchors[s]}</span>
        </li>
      ))}
    </ul>
  );
}

export default function RubricPage() {
  return (
    <div className="space-y-6">
      <div className="animate-rise">
        <Eyebrow>Context layer · {RUBRIC_VERSION}</Eyebrow>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight">The hiring rubric</h1>
        <p className="mt-1.5 max-w-3xl text-sm text-muted">
          Derived from Arjun&apos;s 8 past hires (who thrived and who didn&apos;t) and the two JDs. Every CV is scored the same way, with the
          reason written down.
        </p>
      </div>

      <div className="flex animate-rise items-center gap-4 rounded-xl border border-accent/40 bg-accent-soft px-5 py-4">
        <Lock className="size-5 shrink-0 text-accent-text" />
        <p className="text-[14px]">
          <strong>The rubric recommends. Arjun decides.</strong> <span className="text-muted">No score on this page is a hiring decision. The system uses it only to recommend and explain.</span>
        </p>
      </div>

      {/* Weights */}
      <Card>
        <SectionHeader title="Weights · 100 points" hint="Points per criterion = (score ÷ 3) × weight. The pattern (C1–C5) is 80; role fit is deliberately only 20." />
        <div className="px-5 py-5">
          <div className="flex h-9 overflow-hidden rounded-lg">
            {SEGMENTS.map((s, i) => (
              <div
                key={s.code}
                className={cn(
                  "flex min-w-0 items-center justify-center border-r-2 border-surface text-[11.5px] font-semibold last:border-r-0",
                  s.code === "C6" ? "bg-surface-3 text-fg" : i === 0 ? "bg-accent text-accent-fg" : "bg-fg text-bg",
                )}
                style={{ width: `${s.weight}%`, opacity: s.code === "C6" || i === 0 ? 1 : 1 - i * 0.12 }}
                title={`${s.code} ${s.name}: ${s.weight}`}
              >
                <span className="truncate px-1">
                  {s.code} · {s.weight}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-subtle">
            <span>Pattern: operator-turned-builder · 80</span>
            <span>Role fit · 20</span>
          </div>
        </div>
      </Card>

      {/* C1–C5 */}
      <div className="grid gap-5 lg:grid-cols-2">
        {PATTERN_CRITERIA.map((c) => {
          const d = CRITERIA[c];
          return (
            <Card key={c} className={cn(c === "C1" && "lg:col-span-2")}>
              <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div>
                  <p className="font-mono text-[12px] font-semibold text-subtle">{c}</p>
                  <h2 className="text-[16px] font-semibold tracking-tight">{d.name}</h2>
                  <p className="mt-1 text-[13px] text-muted">{d.question}</p>
                </div>
                <div className="text-right">
                  <p className="text-[26px] leading-none font-semibold tabular">{d.weight}</p>
                  <p className="text-[11px] text-subtle">weight</p>
                </div>
              </div>
              <div className={cn("grid gap-4 px-5 py-4", c === "C1" && "md:grid-cols-[1fr_320px]")}>
                <Anchors anchors={d.anchors} />
                <div className="space-y-2 text-[12.5px] text-muted">
                  {d.evidenceWords && (
                    <p>
                      <span className="font-medium text-fg">Evidence words:</span> {d.evidenceWords}
                    </p>
                  )}
                  {d.note && <p>{d.note}</p>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* C6 + gates */}
      <Card>
        <SectionHeader title="C6 · Role fit & gate" hint="Arjun's past hires did not match their specs well, and the spec did not predict who thrived. Role fit stays because some basics are non-negotiable." />
        <div className="grid gap-5 px-5 py-5 lg:grid-cols-2">
          {(Object.keys(ROLES) as RoleCode[]).map((r) => {
            const role = ROLES[r];
            return (
              <div key={r} className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold">{role.title}</h3>
                    <p className="text-[12.5px] text-muted">{role.focus}</p>
                  </div>
                  <span className="rounded-md bg-fg px-2 py-1 text-[12px] font-semibold whitespace-nowrap text-bg">Gate: C6 ≥ {role.gateMin}</span>
                </div>
                {role.c6Checks && (
                  <ol className="space-y-1 rounded-lg bg-surface-2 px-3 py-2.5 text-[13px]">
                    {role.c6Checks.map((ch) => (
                      <li key={ch.key}>
                        <span className="font-mono font-semibold text-subtle">({ch.key})</span> {ch.label}
                      </li>
                    ))}
                  </ol>
                )}
                <Anchors anchors={role.c6Anchors} />
              </div>
            );
          })}
        </div>
        <p className="border-t border-line px-5 py-3 text-[13px] text-muted">
          A candidate who fails the gate is <strong className="text-fg">not shortlisted for that role</strong>. If their pattern score (C1–C5) is 60+/80, they are
          flagged: “{WRONG_ROLE_MESSAGE}”
        </p>
      </Card>

      {/* Tiers */}
      <Card>
        <SectionHeader title="Tiers & override" />
        <div className="grid gap-px bg-line sm:grid-cols-3">
          {TIER_BANDS.map((t) => (
            <div key={t.tier} className="bg-surface px-5 py-4">
              <TierBadge tier={t.tier} size="lg" />
              <p className="mt-2 text-[20px] font-semibold tabular">
                {t.min}–{t.max}
              </p>
              <p className="text-[13px] text-muted">{t.meaning}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3 border-t border-line px-5 py-3.5 text-[13px]">
          <Scale className="mt-0.5 size-4 shrink-0 text-accent-text" />
          <p>
            <strong>Override rule.</strong> <span className="text-muted">{OVERRIDE_RULE}</span>
          </p>
        </div>
      </Card>

      {/* Probes */}
      <Card>
        <SectionHeader title="Interview probes (Part 6)" hint="The system attaches probes for the criteria where the candidate scored lowest or where the evidence was thinnest." />
        <ul className="divide-y divide-line">
          {(Object.entries(PROBES) as [string, string[]][]).map(([k, qs]) => (
            <li key={k} className="grid gap-2 px-5 py-3 sm:grid-cols-[90px_1fr]">
              <span className="font-mono text-[12px] font-semibold text-subtle">{k === "ALL" ? "All" : k.replace("C6-pm", "C6 · PM").replace("C6-spm", "C6 · SPM")}</span>
              <div className="space-y-1 text-[13.5px]">
                {qs.map((q) => (
                  <p key={q}>“{q}”</p>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Fairness */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <SectionHeader title="Fairness guardrails" />
          <ul className="space-y-2.5 px-5 py-4 text-[13px]">
            {FAIRNESS_GUARDRAILS.map((g) => (
              <li key={g} className="flex gap-2.5">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ok" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionHeader title="Weight = 0" hint="Did not predict success in Arjun's history." />
          <ul className="space-y-2.5 px-5 py-4 text-[13px]">
            {ZERO_WEIGHT_SIGNALS.map((g) => (
              <li key={g} className="flex gap-2.5">
                <Ban className="mt-0.5 size-3.5 shrink-0 text-subtle" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionHeader title="Caution signals" hint="Probe, don't auto-reject." />
          <ul className="space-y-2.5 px-5 py-4 text-[13px]">
            {CAUTION_SIGNALS.map((g) => (
              <li key={g.key} className="flex gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber" />
                <span>{g.label}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
