import type { Tier } from "@/lib/rubric";
import { cn, formatScore } from "@/lib/ui";

/** Radial score out of 100, with the 55 / 75 tier thresholds marked on the ring. */
export function ScoreDial({ score, tier, size = 112 }: { score: number; tier: Tier; size?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const stroke = tier === "SHORTLIST" ? "var(--accent)" : tier === "CONSIDER" ? "var(--amber)" : "var(--border-strong)";
  const tick = (v: number) => {
    const a = (v / 100) * 2 * Math.PI - Math.PI / 2;
    return { x1: 50 + 38 * Math.cos(a), y1: 50 + 38 * Math.sin(a), x2: 50 + 50 * Math.cos(a), y2: 50 + 50 * Math.sin(a) };
  };
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full" role="img" aria-label={`Score ${formatScore(score)} out of 100`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform="rotate(-90 50 50)"
          className="transition-[stroke-dasharray] duration-700"
        />
        {[55, 75].map((v) => (
          <line key={v} {...tick(v)} stroke="var(--bg)" strokeWidth="1.6" />
        ))}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className={cn("leading-none font-semibold tracking-tight tabular", size >= 100 ? "text-[30px]" : "text-xl")}>{formatScore(score)}</p>
          <p className="mt-0.5 text-[10.5px] font-medium text-subtle">/ 100</p>
        </div>
      </div>
    </div>
  );
}

export function ScoreDots({ score, max = 3 }: { score: number; max?: number }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${score} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cn("h-2 w-4 rounded-sm", i < score ? (score === 3 ? "bg-accent" : "bg-fg") : "bg-surface-3")} />
      ))}
    </span>
  );
}
