/**
 * Arjun's 8 past hires. Sources:
 *  - role / joined / last rating: case PDF ("What He's Providing" table)
 *  - C1-C5 back-test scores + pattern score: rubric.txt Part 5
 *  - signal matrix A-E and pattern evidence: rubric.txt Part 1
 *  - path summaries: the hires' own CVs (Hires/*.docx)
 */
import type { PatternScores } from "./scoring";

export type SignalValue = "YES" | "partial" | "weak" | "no" | "desk-only" | "routine on-call";

export interface PastHire {
  id: string;
  fullName: string;
  roleTitle: string;
  joined: string;
  lastRating: "Exceeds Expectations" | "Meets Expectations" | "Below Expectations";
  outcome: "thriving" | "not_thriving";
  scores: PatternScores;
  patternScore: number;
  path: string;
  evidence: string[];
  signals: Record<"A" | "B" | "C" | "D" | "E", SignalValue>;
  cvFile: string;
}

export const SIGNAL_LABELS: Record<"A" | "B" | "C" | "D" | "E", string> = {
  A: "Worked on the logistics \"floor\" before their current function",
  B: "Built something nobody asked for, and peers adopted it",
  C: "Owned outcomes with no layer above making the calls",
  D: "Personally owned a live crisis",
  E: "Openly learned from a failure (killed work, post-mortem)",
};

export const PAST_HIRES: PastHire[] = [
  {
    id: "lavanya-iyer",
    fullName: "Lavanya Iyer",
    roleTitle: "Product Manager",
    joined: "Apr 2025",
    lastRating: "Exceeds Expectations",
    outcome: "thriving",
    scores: { C1: 3, C2: 3, C3: 3, C4: 3, C5: 3 },
    patternScore: 80.0,
    path: "3 yrs carrier ops & supply chain at Mahindra Logistics → sole PM at a port & logistics SaaS",
    evidence: [
      "Carrier allocation and exception management for 800+ shipments/month at a national 3PL",
      "Built a shipment visibility dashboard (Excel → Tableau) adopted by 2 other regional teams",
      "Sole PM: shipped 6 features, killed 2 on usage data, wrote the outage post-mortem herself",
    ],
    signals: { A: "YES", B: "YES", C: "YES", D: "YES", E: "YES" },
    cvFile: "cv_07_lavanya_iyer.docx",
  },
  {
    id: "aditya-shetty",
    fullName: "Aditya Shetty",
    roleTitle: "Sales Lead",
    joined: "Aug 2023",
    lastRating: "Exceeds Expectations",
    outcome: "thriving",
    scores: { C1: 3, C2: 3, C3: 3, C4: 2, C5: 3 },
    patternScore: 76.7,
    path: "Port-services sales at JNPT, alongside terminal ops at peak → enterprise sales at a supply-chain SaaS",
    evidence: [
      "Worked alongside the terminal operations team during peak periods — berth windows, DO releases",
      "No account manager layer between the client and execution",
      "Ran a post-mortem on a lost freight-forwarder deal that became standard team practice",
    ],
    signals: { A: "YES", B: "YES", C: "YES", D: "YES", E: "YES" },
    cvFile: "cv_04_aditya_shetty.docx",
  },
  {
    id: "meghna-tiwari",
    fullName: "Meghna Tiwari",
    roleTitle: "Customer Success Manager",
    joined: "Aug 2024",
    lastRating: "Exceeds Expectations",
    outcome: "thriving",
    scores: { C1: 3, C2: 3, C3: 3, C4: 3, C5: 2 },
    patternScore: 76.7,
    path: "Freight-forwarder customer relations & documentation → customer success at a field-ops SaaS",
    evidence: [
      "Fixed a 7pm customs hold overnight with the CHA before the client knew",
      "Built the 30-60-90 onboarding framework her whole CS team now uses",
      "No escalation to management in 14 months",
    ],
    signals: { A: "YES", B: "YES", C: "YES", D: "YES", E: "YES" },
    cvFile: "cv_06_meghna_tiwari.docx",
  },
  {
    id: "rohan-desai",
    fullName: "Rohan Desai",
    roleTitle: "Head of Engineering",
    joined: "Jul 2022",
    lastRating: "Exceeds Expectations",
    outcome: "thriving",
    scores: { C1: 3, C2: 3, C3: 3, C4: 3, C5: 1 },
    patternScore: 73.3,
    path: "3 yrs CHA operations at JNPT → backend / systems engineering at a freight-tracking SaaS",
    evidence: [
      "180+ shipments/month of import/export documentation at a CHA firm",
      "Built an Excel shipment tracker the 12-person ops team adopted in 2 weeks",
      "Built a BoL verification prototype over a weekend; 30 colleagues using it within a month",
    ],
    signals: { A: "YES", B: "YES", C: "YES", D: "YES", E: "weak" },
    cvFile: "cv_01_rohan_desai.docx",
  },
  {
    id: "sunita-krishnamurthy",
    fullName: "Sunita Krishnamurthy",
    roleTitle: "Operations Lead",
    joined: "Jan 2023",
    lastRating: "Exceeds Expectations",
    outcome: "thriving",
    scores: { C1: 3, C2: 3, C3: 3, C4: 3, C5: 1 },
    patternScore: 73.3,
    path: "4 yrs freight-forwarding documentation & compliance → independent logistics operations consultant",
    evidence: [
      "200+ shipments/month of documentation across sea and air",
      "Redesigned the team's intake workflow over a weekend when the FMS vendor changed formats; kept permanently",
      "Owns processes start to finish with limited oversight",
    ],
    signals: { A: "YES", B: "YES", C: "YES", D: "YES", E: "weak" },
    cvFile: "cv_02_sunita_krishnamurthy.docx",
  },
  {
    id: "preetham-rao",
    fullName: "Preetham Rao",
    roleTitle: "Backend Engineer",
    joined: "Feb 2024",
    lastRating: "Below Expectations",
    outcome: "not_thriving",
    scores: { C1: 1, C2: 2, C3: 1, C4: 1, C5: 0 },
    patternScore: 30.0,
    path: "Backend engineer in a 12-engineer team at a 3,200-person e-commerce company",
    evidence: [
      "Logistics from the desk only: integrated Delhivery / Bluedart / Ecom Express APIs",
      "Pressure handled inside a routine P1 on-call rotation",
      "Whole career inside a large, structured org",
    ],
    signals: { A: "desk-only", B: "partial", C: "no", D: "routine on-call", E: "no" },
    cvFile: "cv_05_preetham_rao.docx",
  },
  {
    id: "rahul-bose",
    fullName: "Rahul Bose",
    roleTitle: "Growth & Marketing Lead",
    joined: "Jun 2025",
    lastRating: "Meets Expectations",
    outcome: "not_thriving",
    scores: { C1: 0, C2: 2, C3: 2, C4: 0, C5: 0 },
    patternScore: 23.3,
    path: "B2B SaaS demand generation in HR-tech and fintech; no operations exposure",
    evidence: [
      "Full demand-gen ownership with no CMO above — but in unrelated domains",
      "Impressive pipeline metrics earned outside logistics",
      "CV is all wins — no failure owned",
    ],
    signals: { A: "no", B: "YES", C: "YES", D: "no", E: "no" },
    cvFile: "cv_08_rahul_bose.docx",
  },
  {
    id: "vikram-nair",
    fullName: "Vikram Nair",
    roleTitle: "Product Manager",
    joined: "Jun 2023",
    lastRating: "Meets Expectations",
    outcome: "not_thriving",
    scores: { C1: 0, C2: 1, C3: 1, C4: 0, C5: 0 },
    patternScore: 11.7,
    path: "3 yrs PM in HR-tech B2B SaaS, in a 4-person PM team with senior PMs above",
    evidence: [
      "Best JD match for PM on paper — landed \"Meets\"",
      "PRD template and sprint process: framework vocabulary without ground-level evidence",
      "No operations exposure; no killed feature or failure owned",
    ],
    signals: { A: "no", B: "partial", C: "partial", D: "no", E: "no" },
    cvFile: "cv_03_vikram_nair.docx",
  },
];

export const THRIVING = PAST_HIRES.filter((h) => h.outcome === "thriving");
export const NOT_THRIVING = PAST_HIRES.filter((h) => h.outcome === "not_thriving");

export function pastHireById(id: string | null | undefined): PastHire | undefined {
  return PAST_HIRES.find((h) => h.id === id);
}
