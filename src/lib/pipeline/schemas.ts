import { z } from "zod";
import { THRIVING } from "../past-hires";

/* ---------- Step 1: structured evidence extraction (verbatim) ---------- */

export const FUNCTIONS = [
  "operations",
  "product",
  "engineering",
  "sales",
  "customer_success",
  "marketing",
  "consulting",
  "analytics",
  "founder",
  "other",
] as const;

export const ExtractionSchema = z.object({
  contact: z.object({
    full_name: z.string().nullable().describe("Candidate's name exactly as written, or null if absent"),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable().describe("City/region as written, or null"),
  }),
  headline: z.string().nullable().describe("Title/headline line under the name, verbatim, or null"),
  summary_text: z.string().nullable().describe("Professional summary/profile paragraph copied verbatim, or null"),
  total_years_experience: z
    .number()
    .nullable()
    .describe("Total years of work experience if stated or computable from dates, else null"),
  experience: z
    .array(
      z.object({
        title: z.string(),
        organization: z.string(),
        org_context: z
          .string()
          .nullable()
          .describe("Company stage/size/sector exactly as stated in the CV (e.g. 'Series A, 35 employees'), or null"),
        start: z.string().nullable(),
        end: z.string().nullable(),
        function: z.enum(FUNCTIONS),
        domain: z.string().nullable().describe("Industry/domain of this role, e.g. 'freight forwarding', 'HR tech SaaS'"),
        highlights: z.array(z.string()).describe("Every bullet/line of this role copied VERBATIM"),
      }),
    )
    .describe("All work experience, most recent first, including internships, family business, freelance"),
  other_evidence: z
    .array(z.string())
    .describe("Verbatim lines from projects/achievements/volunteering sections that describe work done"),
  skills: z.array(z.string()),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

/* ---------- Step 2: rubric scoring ---------- */

const score = z.number().int().min(0).max(3);
const confidence = z.enum(["high", "medium", "low"]);

const CriterionAssessment = z.object({
  score,
  confidence: confidence.describe("How well the CV evidence supports this score"),
  rationale: z.string().describe("1-2 sentences mapping the evidence to the rubric anchor"),
  evidence: z
    .array(z.string())
    .describe("Short VERBATIM quotes (<= 200 chars each) copied from the CV text that support the score. Empty if none."),
  inferences: z
    .array(z.string())
    .describe("Reasoning that goes beyond what the CV literally says. Label clearly; never present as fact."),
  missing: z.array(z.string()).describe("Information absent from the CV that would change this score"),
  probe_focus: z.string().describe("The specific thing to verify about THIS candidate in an interview for this criterion"),
});

const SpmCheck = z.object({
  met: z.boolean(),
  evidence: z.array(z.string()).describe("VERBATIM quotes from the CV"),
  note: z.string(),
});

export const CAUTION_TYPES = [
  "large_structured_org",
  "desk_only_logistics",
  "team_output_senior_layer",
  "all_wins",
  "thin_evidence",
  "other",
] as const;

const thrivingIds = THRIVING.map((h) => h.id) as [string, ...string[]];

export const ScoringSchema = z.object({
  snapshot: z.object({
    who_they_are: z.string().describe("2 lines: current role, path, domain — work facts only"),
    current_role: z.string(),
    career_path: z.string().describe("Compact path, e.g. 'CHA operations → backend engineering → product'"),
    domain: z.string(),
  }),
  criteria: z.object({
    C1: CriterionAssessment,
    C2: CriterionAssessment,
    C3: CriterionAssessment,
    C4: CriterionAssessment,
    C5: CriterionAssessment,
  }),
  role_fit: z.object({
    pm: CriterionAssessment,
    spm: CriterionAssessment.extend({
      checks: z.object({ a: SpmCheck, b: SpmCheck, c: SpmCheck }),
    }),
  }),
  why_ranked: z
    .string()
    .describe("2-3 sentences quoting CV evidence (in quotation marks) for the highest-weighted criteria. Do not state a total or tier."),
  strengths: z.array(z.string()).describe("2-4 strengths, each tied to CV evidence"),
  caution_flags: z.array(z.object({ type: z.enum(CAUTION_TYPES), detail: z.string() })),
  closest_past_hire: z.object({
    id: z.enum(thrivingIds),
    reason: z.string().describe("Why this thriving hire is the closest match, and what differs"),
  }),
});
export type Scoring = z.infer<typeof ScoringSchema>;
export type CriterionAssessmentT = z.infer<typeof CriterionAssessment>;
