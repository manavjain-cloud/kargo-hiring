import type { CriterionCode, RoleCode, Tier } from "./rubric";
import type { EvidenceItem } from "./pipeline/evidence";

export type PipelineStatus =
  | "uploaded"
  | "evaluating"
  | "evaluated"
  | "failed"
  | "moved_forward"
  | "on_hold"
  | "declined";

export type DecisionCode = "move_forward" | "hold" | "decline";
export type EmailStatus = "draft" | "sent" | "failed" | "cancelled";
export type RoleFilter = "all" | RoleCode;

export const DECISION_LABEL: Record<DecisionCode, string> = {
  move_forward: "Move Forward",
  hold: "Hold",
  decline: "Decline",
};

export const STATUS_LABEL: Record<PipelineStatus, string> = {
  uploaded: "Not evaluated",
  evaluating: "Evaluating…",
  evaluated: "Awaiting decision",
  failed: "Evaluation failed",
  moved_forward: "Moved forward",
  on_hold: "On hold",
  declined: "Declined",
};

export const DECISION_TO_STATUS: Record<DecisionCode, PipelineStatus> = {
  move_forward: "moved_forward",
  hold: "on_hold",
  decline: "declined",
};

export interface CandidateRow {
  id: string;
  name: string;
  roleCode: RoleCode;
  status: PipelineStatus;
  sourceFilename: string;
  currentPath: string | null;
  totalScore: number | null;
  tier: Tier | null;
  gatePassed: boolean | null;
  wrongRoleFlag: boolean;
  c1Score: number | null;
  keySignal: { label: string; score: number; negative: boolean } | null;
  lastEvaluatedAt: string | null;
  lastError: string | null;
  duplicateOf: string | null;
  createdAt: string;
}

export interface DashboardMetrics {
  candidates: number;
  evaluated: number;
  shortlisted: number;
  consider: number;
  pass: number;
  pendingDecision: number;
  movedForward: number;
  onHold: number;
  declined: number;
  notEvaluated: number;
}

export interface ScoreView {
  criterion: CriterionCode;
  role: RoleCode | null;
  score: number;
  aiScore: number | null;
  weight: number;
  points: number;
  confidence: "high" | "medium" | "low";
  rationale: string;
  evidence: EvidenceItem[];
  inferences: string[];
  missing: string[];
  probeFocus: string | null;
  subChecks: Record<"a" | "b" | "c", { met: boolean; evidence: EvidenceItem[]; note: string }> | null;
}

export interface RoleResultView {
  role: RoleCode;
  totalScore: number;
  patternScore: number;
  scoreTier: Tier;
  tier: Tier;
  gatePassed: boolean;
  c1CapApplied: boolean;
  gateCapApplied: boolean;
  wrongRoleFlag: boolean;
  tierReasons: string[];
}

export interface ProbeView {
  role: RoleCode;
  criterion: string;
  question: string;
  focus: string | null;
  reason: string;
}

export interface DecisionView {
  id: string;
  decision: DecisionCode;
  roleCode: RoleCode;
  note: string | null;
  decidedBy: string;
  aiTier: Tier | null;
  aiScore: number | null;
  createdAt: string;
}

export interface EmailView {
  id: string;
  decisionId: string;
  template: DecisionCode;
  toEmail: string | null;
  subject: string;
  body: string;
  status: EmailStatus;
  error: string | null;
  /** Set when test mode redirected the email: the address it actually went to. */
  testDeliveredTo: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface EvaluationView {
  id: string;
  model: string;
  promptVersion: string;
  rubricVersion: string;
  snapshot: {
    who_they_are: string;
    current_role: string;
    career_path: string;
    domain: string;
    years_experience: number | null;
    location: string | null;
  };
  whyRanked: string;
  strengths: string[];
  cautionFlags: { type: string; detail: string; source: "ai" | "system" }[];
  closestPastHireId: string | null;
  closestReason: string | null;
  nearestByScoresId: string | null;
  trace: {
    steps: { step: string; detail: string; at: string }[];
    evidence: { verified: number; near: number; unverified: number };
  };
  durationMs: number | null;
  createdAt: string;
  scores: ScoreView[];
  roleResults: Partial<Record<RoleCode, RoleResultView>>;
  probes: ProbeView[];
}

export interface CandidateDetail {
  id: string;
  name: string;
  nameSource: "cv" | "filename" | "manual";
  email: string | null;
  phone: string | null;
  location: string | null;
  roleCode: RoleCode;
  status: PipelineStatus;
  sourceFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  lastError: string | null;
  duplicateOf: { id: string; name: string; similarity: number } | null;
  createdAt: string;
  evaluation: EvaluationView | null;
  decisions: DecisionView[];
  emails: EmailView[];
}

export interface AppSettings {
  reviewerName: string;
  companyName: string;
  autoSendAfterDecision: boolean;
}

export const ROLE_COOKIE = "kargo_role";

export function parseRoleFilter(v: string | null | undefined): RoleFilter | null {
  return v === "all" || v === "pm" || v === "spm" ? v : null;
}
