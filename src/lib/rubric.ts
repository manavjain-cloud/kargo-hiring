/**
 * Kargo hiring rubric — typed transcription of /rubric.txt (the source of truth).
 * Deterministic scoring logic in ./scoring.ts reads only from here.
 * Do not change weights, anchors, gates or tiers without updating rubric.txt.
 */

export const RUBRIC_VERSION = "rubric.txt@2026-09-28";

export type RoleCode = "pm" | "spm";
export type CriterionCode = "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
export type PatternCriterion = Exclude<CriterionCode, "C6">;
export type Tier = "SHORTLIST" | "CONSIDER" | "PASS";
export type Score = 0 | 1 | 2 | 3;

export const PATTERN_CRITERIA: PatternCriterion[] = ["C1", "C2", "C3", "C4", "C5"];
export const ALL_CRITERIA: CriterionCode[] = ["C1", "C2", "C3", "C4", "C5", "C6"];

export interface CriterionDef {
  code: CriterionCode;
  name: string;
  short: string;
  weight: number;
  question: string;
  anchors: Record<Score, string>;
  evidenceWords?: string;
  note?: string;
}

export const CRITERIA: Record<PatternCriterion, CriterionDef> = {
  C1: {
    code: "C1",
    name: "Ground-level operations experience",
    short: "Ops floor",
    weight: 25,
    question:
      "Did they do the operational work themselves, in logistics or a similar operations-heavy business, before or alongside their current function?",
    anchors: {
      3: "2+ yrs hands-on in freight forwarding / CHA / port / 3PL / carrier ops (documentation, customs, carrier allocation, exceptions)",
      2: "Hands-on ops in an adjacent ops-heavy domain (supply chain, warehousing, field ops, manufacturing) OR <2 yrs logistics ops",
      1: "Logistics exposure from the desk only (built integrations, sold to, or analysed logistics without doing the work)",
      0: "No operations exposure",
    },
    evidenceWords:
      "shipments/month, BoL, customs hold, CHA, ICD, berth, carrier exceptions, \"worked alongside the ops team\", site/port visits",
    note: "The strongest signal. All 5 thrivers = 3. Non-thrivers: 0, 0, 1.",
  },
  C2: {
    code: "C2",
    name: "Builds unasked, and others adopt it",
    short: "Builds unasked",
    weight: 20,
    question:
      "Did they spot a broken workflow, build a fix without being told to, and did colleagues/customers adopt it voluntarily?",
    anchors: {
      3: "Self-initiated tool/process, adopted by others (named team size or time-to-adoption), still in use",
      2: "Self-initiated build with some adoption, or built within their own function only",
      1: "Built process artifacts as part of an assigned role (templates, docs) with no adoption evidence",
      0: "Only executed what was assigned",
    },
    evidenceWords:
      "\"built... adopted across\", \"now standard\", \"team now uses\", \"retained permanently\", \"over a weekend\", \"from scratch\"",
    note: "Mirrors Kargo PM success metric: \"features customers use without being asked to.\"",
  },
  C3: {
    code: "C3",
    name: "Ownership without a layer above",
    short: "No layer above",
    weight: 15,
    question: "Have they made calls with no senior person above them making the call?",
    anchors: {
      3: "Sole owner / first in function / \"no layer between me and execution\"; made and lived with the calls",
      2: "Clear ownership of an area but with a senior layer available",
      1: "Owned components within a larger team; decisions made above",
      0: "Supporting role only",
    },
    evidenceWords:
      "\"sole PM\", \"without a product layer\", \"no account manager layer\", \"limited oversight\", \"no escalation to management\"",
    note: "Mirrors SPM JD: \"no committee that approves product decisions.\"",
  },
  C4: {
    code: "C4",
    name: "Personal ownership under operational pressure",
    short: "Owns the crisis",
    weight: 10,
    question: "When something broke, did they step outside their role and own it?",
    anchors: {
      3: "Owned an unplanned crisis end-to-end, outside a defined process (e.g., overnight customs hold, vendor format change over a weekend, outage post-mortem they wrote themselves)",
      2: "Handled high-stakes pressure with clear personal ownership",
      1: "Pressure handled inside a defined routine (on-call rota, SLA queue)",
      0: "No evidence",
    },
  },
  C5: {
    code: "C5",
    name: "Learns from failure in the open",
    short: "Learns in the open",
    weight: 10,
    question: "Do they show things that did not work, and what changed because of it?",
    anchors: {
      3: "Killed their own work on data, or ran a post-mortem that changed team practice",
      2: "Owned a mistake/limitation and drove its fix transparently",
      1: "Diagnosis/fixing of problems, but no own failure acknowledged",
      0: "CV is all wins",
    },
    note: "Mirrors PM JD: \"shipped things, killed things, and learned from both.\"",
  },
};

export const C6_WEIGHT = 20;
export const PATTERN_MAX = 80;

export interface RoleDef {
  code: RoleCode;
  title: string;
  shortTitle: string;
  focus: string;
  gateMin: Score;
  c6Anchors: Record<Score, string>;
  c6Checks?: { key: "a" | "b" | "c"; label: string }[];
}

export const ROLES: Record<RoleCode, RoleDef> = {
  pm: {
    code: "pm",
    title: "Product Manager",
    shortTitle: "PM",
    focus: "Core platform: tracking, documentation, status visibility",
    gateMin: 1,
    c6Anchors: {
      3: "2-4 yrs PM (or equivalent end-to-end product ownership), shipped AND killed features, at an early-stage / 0-to-1 company",
      2: "Product ownership evidence, but outside the range or mostly in mature, structured orgs",
      1: "No PM title, but has built and driven adoption of software or tools used by others (e.g., an engineer or ops lead who built internal products)",
      0: "No evidence of owning any product, tool or build end-to-end",
    },
  },
  spm: {
    code: "spm",
    title: "Senior Product Manager",
    shortTitle: "Senior PM",
    focus: "Integration & data layer; future Head of Product",
    gateMin: 2,
    c6Anchors: {
      3: "All three checks met",
      2: "Two of three checks met",
      1: "One of three checks met",
      0: "None of the checks met",
    },
    c6Checks: [
      { key: "a", label: "5-8 yrs experience incl. owning a product area with no senior PM above" },
      { key: "b", label: "Platform / integration / data-layer products (carrier systems, port portals, ERPs, APIs)" },
      { key: "c", label: "Early-stage or \"rules not written yet\" environment" },
    ],
  },
};

export const ROLE_CODES: RoleCode[] = ["pm", "spm"];

export const TIER_BANDS: { tier: Tier; min: number; max: number; meaning: string }[] = [
  { tier: "SHORTLIST", min: 75, max: 100, meaning: "Recommend to Arjun for a conversation this week" },
  { tier: "CONSIDER", min: 55, max: 74, meaning: "Worth a look if shortlist is thin; probe gaps" },
  { tier: "PASS", min: 0, max: 54, meaning: "Send a respectful decline once Arjun confirms" },
];

export const OVERRIDE_RULE =
  "C1 = 0 caps the candidate at CONSIDER, however high the rest scores. In Arjun's history, no hire without operations exposure has reached \"Exceeds\".";

export const WRONG_ROLE_THRESHOLD = 60;
export const WRONG_ROLE_MESSAGE = "Strong Kargo profile — wrong role; consider for other openings.";

/** Rubric Part 6 — interview probe bank. */
export const PROBES: Record<PatternCriterion | "C6-pm" | "C6-spm" | "ALL", string[]> = {
  C1: [
    "Walk me through a freight forwarder's morning. What breaks first?",
    "When were you last physically in an ops room / at a port / warehouse?",
  ],
  C2: [
    "Tell me about something you built that nobody asked for. Who uses it today, and how did they find it?",
  ],
  C3: [
    "Tell me about a call you made with no one above you to check it. What happened, and would you make it again?",
  ],
  C4: [
    "Describe the worst operational night of your career. What did you do personally between the problem and the fix?",
  ],
  C5: ["What's something you shipped and then killed? How did you know?"],
  "C6-pm": ["What are the 3 things Kargo should build next, and why?"],
  "C6-spm": [
    "Which integration would you ship first to unlock a new customer segment? What would you refuse to build, and why?",
    "When should Kargo build vs. configure vs. not touch?",
  ],
  ALL: ["Confirm: Mumbai-based or willing to relocate; in-office."],
};

/** Rubric Part 1 — caution signals seen in the non-thriving group. Probe, don't auto-reject. */
export const CAUTION_SIGNALS = [
  { key: "large_structured_org", label: "Whole career inside large, structured orgs" },
  { key: "desk_only_logistics", label: "Logistics knowledge only from the desk/API side" },
  { key: "team_output_senior_layer", label: "Achievements described as team outputs with a senior layer making the calls" },
  { key: "all_wins", label: "A CV that is all wins — no killed feature, lost deal or failure owned" },
] as const;

/** Rubric Part 1 — what did NOT predict success (weight 0). */
export const ZERO_WEIGHT_SIGNALS = [
  "Pedigree / college name",
  "Certifications & community badges (Product School CPO, Reforge, conference talks, HubSpot/Google certs)",
  "Impressive metrics earned in unrelated domains",
  "Framework vocabulary (JTBD, OKRs, PRD templates) without ground-level evidence behind it",
  "Closest match to the JD on paper",
];

/** Rubric Part 8. */
export const FAIRNESS_GUARDRAILS = [
  "Never score on name, gender, age, photo, college name, or family background. Score only on work evidence in the CV.",
  "Career gaps, non-linear paths and non-PM titles are NOT penalised — Rohan (ops → engineering) and Lavanya (ops → product) switched functions entirely.",
  "Missing information = score the evidence present, and add a probe; do not assume the worst.",
  "The rubric recommends. Arjun makes every final call.",
];

export const HIDDEN_PATTERN = {
  name: "Operator-turned-builder",
  description:
    "Every thriving hire spent real time inside freight / port / 3PL operations — handling Bills of Lading, customs holds, berth windows, carrier exceptions — before moving into engineering, ops, sales, CS or product. Then, in that seat, they built tools and processes that colleagues adopted on their own.",
};

export function criterionDef(code: CriterionCode, role: RoleCode): CriterionDef {
  if (code !== "C6") return CRITERIA[code];
  const r = ROLES[role];
  return {
    code: "C6",
    name: `Role fit — ${r.title}`,
    short: "Role fit",
    weight: C6_WEIGHT,
    question: r.focus,
    anchors: r.c6Anchors,
    note: `Gate: C6 must be ≥ ${r.gateMin}.`,
  };
}
