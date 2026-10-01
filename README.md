# Kargo · Hiring Intelligence

**Live app:** https://kargo-hiring-three.vercel.app · deploys automatically from `main` via Vercel.

An AI hiring workspace for Kargo's **Product Manager** and **Senior Product Manager** roles.
It scores CVs against the pattern hidden in Arjun's own hiring history (**operator-turned-builder**), explains every score with CV evidence, suggests interview probes, and then hands the decision to Arjun.

> **AI recommends. Arjun decides.** No score in this tool is a hiring decision. Only a human action changes a candidate's status.

## Stack

- **Next.js 16** (App Router, TypeScript strict, Tailwind v4)
- **Neon Postgres** via `@neondatabase/serverless` (server-only `DATABASE_URL`)
- **Gemini** via `@google/genai` for evidence extraction and criterion scoring
- **Resend** (optional) for candidate email. Without it, decisions produce drafts only.

## Setup

```bash
cp .env.example .env.local     # fill in DATABASE_URL and GEMINI_API_KEY
npm install
npm run db:setup               # creates tables, seeds roles (JDs) + 8 past hires from ../JDs and ../Hires
npm run dev
```

Where the keys come from:

| Variable | Where |
|---|---|
| `DATABASE_URL` | Neon Console → project → **Connect** → *Pooled connection* string |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | optional, default `gemini-3.8-flash` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | optional, resend.com → API Keys. The sender domain must be verified; `onboarding@resend.dev` only delivers to your own Resend login email |
| `RESEND_TEST_RECIPIENT` | optional **test mode**: every approved email is delivered to this address (your Resend login email) instead of the candidate, with the intended recipient shown in the subject and body. Use it until a domain is verified; leave it empty for real sending |
| `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` | optional, protects the whole app with HTTP Basic auth (recommended when deployed) |

All variables are server-only. None use `NEXT_PUBLIC_`, so none reach the browser.

## How a CV is evaluated

```
CV (PDF/DOCX/TXT) → server-side text extraction (magic-byte checked, 10 MB max)
  → Gemini step 1: verbatim structured evidence (roles, bullets, summary)
  → fairness redaction: name, contact details and education never reach the scorer
  → Gemini step 2: C1–C5 + C6 (PM and Senior PM) on 0–3, with evidence / inference / missing, per rubric.txt
  → evidence audit: every quote is checked against the CV; unverifiable quotes are demoted to inferences
  → deterministic rubric engine (src/lib/scoring.ts): points, totals, gates, C1 = 0 override, tiers, wrong-role flag
  → probes from rubric Part 6 for the weakest / thinnest criteria
  → closest thriving past hire (model pick, validated + cross-checked by C1–C5 score distance)
  → saved to Postgres with a full trace
```

The model **never** sets the total, gate or tier. For Senior PM, C6 is recomputed as the number of checks (a)(b)(c) met.

**Interpretation to note:** the rubric says a candidate who fails the role gate is "NOT shortlisted for that role" but doesn't name a tier. The app caps such a candidate at CONSIDER and labels why.

## Decision workflow

1. Arjun clicks **Move Forward / Hold / Decline** and confirms (optional internal note).
2. The decision is stored with the AI tier/score at that moment, for audit.
3. The matching email (invite / holding update / respectful decline) is **drafted**. It never contains scores or AI reasoning.
4. Arjun reviews, edits, and clicks **Approve & send** (Resend). Auto-send after a decision is off by default and can be switched on in Settings.

## Scripts

| Script | What it does |
|---|---|
| `npm run verify:rubric` | 20 deterministic checks: reproduces the rubric Part 5 back-test and every gate/tier/override rule |
| `npm run calibrate` | Runs the real Gemini pipeline on the 8 past-hire CVs (leave-one-out) and compares to the rubric back-test |
| `npm run db:setup` | Applies `db/migrations/*.sql` and seeds roles + past hires (idempotent) |
| `npm run typecheck` / `npm run lint` / `npm run build` | Quality gates |

## Data model (`db/migrations/0001_init.sql`)

`roles` · `past_hires` · `candidates` · `candidate_files` (source CV bytes) · `candidate_evaluations` · `evaluation_scores` · `evaluation_role_results` · `interview_probes` · `decisions` · `email_events` · `app_settings`

## Source material

`rubric.txt` (authoritative, copied to `src/content/rubric.txt`), the two JDs, the 8 past-hire CVs, and the case PDF. Candidate CVs are **not** seeded. They are uploaded through the app.
