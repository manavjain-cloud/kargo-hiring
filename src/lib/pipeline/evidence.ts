/**
 * Anti-fabrication guard: every "evidence" quote the model returns is checked
 * against the actual CV text. Unverifiable quotes are demoted to inferences.
 */

export type EvidenceStatus = "verified" | "near" | "unverified";

export interface EvidenceItem {
  quote: string;
  status: EvidenceStatus;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Replaces the candidate's name tokens so the scorer never sees them. */
export function makeRedactor(fullName: string | null | undefined): (s: string) => string {
  const tokens = (fullName ?? "")
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}]/gu, ""))
    .filter((t) => t.length >= 3);
  if (tokens.length === 0) return (s) => s;
  const re = new RegExp(`\\b(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "giu");
  return (s) => s.replace(re, "[candidate]");
}

export class EvidenceVerifier {
  private readonly haystack: string;
  private readonly words: string[];

  constructor(cvText: string, redact: (s: string) => string) {
    this.haystack = norm(redact(cvText));
    this.words = this.haystack.split(" ");
  }

  check(quote: string): EvidenceStatus {
    const q = norm(quote.replace(/^["'“]+|["'”]+$/g, "").replace(/\.\.\.|…/g, " "));
    if (q.length < 8) return "unverified";
    if (this.haystack.includes(q)) return "verified";

    // Tolerate small extraction differences: ≥ 85% of 4-word windows must appear in order-free match.
    const qw = q.split(" ");
    if (qw.length < 6) return "unverified";
    const grams = new Set<string>();
    for (let i = 0; i + 4 <= this.words.length; i++) grams.add(this.words.slice(i, i + 4).join(" "));
    let hit = 0;
    let total = 0;
    for (let i = 0; i + 4 <= qw.length; i++) {
      total++;
      if (grams.has(qw.slice(i, i + 4).join(" "))) hit++;
    }
    return total > 0 && hit / total >= 0.85 ? "near" : "unverified";
  }
}
