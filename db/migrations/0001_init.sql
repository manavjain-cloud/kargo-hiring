-- Kargo Hiring Intelligence — initial schema (Neon Postgres)
-- Only the Next.js server holds DATABASE_URL; nothing here is reachable from the browser.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type role_code as enum ('pm', 'spm');
create type tier_code as enum ('SHORTLIST', 'CONSIDER', 'PASS');
create type criterion_code as enum ('C1', 'C2', 'C3', 'C4', 'C5', 'C6');
create type pipeline_status as enum (
  'uploaded',      -- CV stored + text extracted, not yet evaluated
  'evaluating',    -- AI pipeline running
  'evaluated',     -- AI recommendation ready, waiting for Arjun
  'failed',        -- AI pipeline failed (see last_error)
  'moved_forward', -- Arjun decided: Move Forward
  'on_hold',       -- Arjun decided: Hold
  'declined'       -- Arjun decided: Decline
);
create type decision_code as enum ('move_forward', 'hold', 'decline');
create type email_status as enum ('draft', 'sent', 'failed', 'cancelled');
create type outcome_group as enum ('thriving', 'not_thriving');

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- roles: the two open roles and their JDs
-- ---------------------------------------------------------------------------
create table roles (
  code            role_code primary key,
  title           text not null,
  gate_min_c6     smallint not null check (gate_min_c6 between 0 and 3),
  jd_text         text not null,
  jd_source_file  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger roles_updated_at before update on roles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- past_hires: Arjun's 8 calibration hires (case PDF + rubric Parts 1 & 5)
-- ---------------------------------------------------------------------------
create table past_hires (
  id                 text primary key,
  full_name          text not null,
  role_title         text not null,
  joined             text not null,
  last_rating        text not null,
  outcome            outcome_group not null,
  c1 smallint not null check (c1 between 0 and 3),
  c2 smallint not null check (c2 between 0 and 3),
  c3 smallint not null check (c3 between 0 and 3),
  c4 smallint not null check (c4 between 0 and 3),
  c5 smallint not null check (c5 between 0 and 3),
  pattern_score      numeric(5,1) not null,
  cv_text            text,
  cv_source_file     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger past_hires_updated_at before update on past_hires
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- candidates
-- ---------------------------------------------------------------------------
create table candidates (
  id                    uuid primary key default gen_random_uuid(),
  role_code             role_code not null references roles(code),
  full_name             text,  -- display + communication only; never sent to the scorer
  name_source           text not null default 'filename' check (name_source in ('cv', 'filename', 'manual')),
  email                 text,
  phone                 text,
  location              text,
  status                pipeline_status not null default 'uploaded',
  source_filename       text not null,
  mime_type             text not null,
  file_size_bytes       integer not null check (file_size_bytes > 0),
  content_hash          text not null,
  cv_text               text not null,
  possible_duplicate_of uuid references candidates(id) on delete set null,
  duplicate_similarity  numeric(4,3),
  last_error            text,
  last_evaluated_at     timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index candidates_role_status_idx on candidates (role_code, status);
create index candidates_content_hash_idx on candidates (content_hash);
create trigger candidates_updated_at before update on candidates
  for each row execute function set_updated_at();

-- Source CV files (Neon has no object store; CVs are small, so bytea is fine).
create table candidate_files (
  candidate_id    uuid primary key references candidates(id) on delete cascade,
  filename        text not null,
  mime_type       text not null,
  data            bytea not null,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- candidate_evaluations: one AI run per candidate (history kept, one current)
-- ---------------------------------------------------------------------------
create table candidate_evaluations (
  id                    uuid primary key default gen_random_uuid(),
  candidate_id          uuid not null references candidates(id) on delete cascade,
  is_current            boolean not null default true,
  model                 text not null,
  prompt_version        text not null,
  rubric_version        text not null,
  snapshot              jsonb not null,
  extraction            jsonb not null,
  why_ranked            text not null,
  strengths             jsonb not null default '[]',
  caution_flags         jsonb not null default '[]',
  closest_past_hire_id  text references past_hires(id),
  closest_reason        text,
  nearest_by_scores_id  text references past_hires(id),
  trace                 jsonb not null default '{}',
  raw_output            jsonb not null,
  duration_ms           integer,
  created_at            timestamptz not null default now()
);
create index candidate_evaluations_candidate_idx on candidate_evaluations (candidate_id, created_at desc);
create unique index candidate_evaluations_one_current on candidate_evaluations (candidate_id) where is_current;

-- ---------------------------------------------------------------------------
-- evaluation_scores: C1-C5 once per evaluation; C6 once per role
-- ---------------------------------------------------------------------------
create table evaluation_scores (
  id              uuid primary key default gen_random_uuid(),
  evaluation_id   uuid not null references candidate_evaluations(id) on delete cascade,
  criterion       criterion_code not null,
  role_code       role_code references roles(code),
  score           smallint not null check (score between 0 and 3),
  ai_score        smallint check (ai_score between 0 and 3),
  weight          smallint not null,
  points          numeric(5,2) not null,
  confidence      text not null check (confidence in ('high', 'medium', 'low')),
  rationale       text not null,
  evidence        jsonb not null default '[]',
  inferences      jsonb not null default '[]',
  missing         jsonb not null default '[]',
  probe_focus     text,
  sub_checks      jsonb,
  created_at      timestamptz not null default now(),
  constraint c6_has_role check ((criterion = 'C6') = (role_code is not null))
);
-- one row per criterion; C6 once per role (role_code is null for C1-C5)
create unique index evaluation_scores_unique
  on evaluation_scores (evaluation_id, criterion, role_code) nulls not distinct;

-- ---------------------------------------------------------------------------
-- evaluation_role_results: deterministic score / gate / tier per role
-- ---------------------------------------------------------------------------
create table evaluation_role_results (
  id                  uuid primary key default gen_random_uuid(),
  evaluation_id       uuid not null references candidate_evaluations(id) on delete cascade,
  role_code           role_code not null references roles(code),
  total_score         numeric(5,1) not null check (total_score between 0 and 100),
  pattern_score       numeric(5,1) not null check (pattern_score between 0 and 80),
  score_tier          tier_code not null,
  tier                tier_code not null,
  gate_passed         boolean not null,
  c1_cap_applied      boolean not null,
  gate_cap_applied    boolean not null,
  wrong_role_flag     boolean not null,
  tier_reasons        jsonb not null default '[]',
  created_at          timestamptz not null default now(),
  unique (evaluation_id, role_code)
);

-- ---------------------------------------------------------------------------
-- interview_probes: rubric Part 6 questions attached to the weakest criteria
-- ---------------------------------------------------------------------------
create table interview_probes (
  id              uuid primary key default gen_random_uuid(),
  evaluation_id   uuid not null references candidate_evaluations(id) on delete cascade,
  role_code       role_code not null references roles(code),
  criterion       text not null check (criterion in ('C1','C2','C3','C4','C5','C6','ALL')),
  question        text not null,
  focus           text,
  reason          text not null,
  sort_order      smallint not null,
  created_at      timestamptz not null default now()
);
create index interview_probes_eval_idx on interview_probes (evaluation_id, role_code, sort_order);

-- ---------------------------------------------------------------------------
-- decisions: human-only. Every row is Arjun's action, never the AI's.
-- ---------------------------------------------------------------------------
create table decisions (
  id                   uuid primary key default gen_random_uuid(),
  candidate_id         uuid not null references candidates(id) on delete cascade,
  evaluation_id        uuid references candidate_evaluations(id) on delete set null,
  role_code            role_code not null references roles(code),
  decision             decision_code not null,
  note                 text check (char_length(note) <= 2000),
  decided_by           text not null,
  ai_tier_at_decision  tier_code,
  ai_score_at_decision numeric(5,1),
  created_at           timestamptz not null default now()
);
create index decisions_candidate_idx on decisions (candidate_id, created_at desc);

-- ---------------------------------------------------------------------------
-- email_events: downstream communication prepared after a decision
-- ---------------------------------------------------------------------------
create table email_events (
  id                   uuid primary key default gen_random_uuid(),
  candidate_id         uuid not null references candidates(id) on delete cascade,
  decision_id          uuid not null references decisions(id) on delete cascade,
  template             decision_code not null,
  to_email             text,
  subject              text not null,
  body                 text not null,
  status               email_status not null default 'draft',
  provider             text,
  provider_message_id  text,
  error                text,
  approved_by          text,
  sent_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index email_events_candidate_idx on email_events (candidate_id, created_at desc);
create trigger email_events_updated_at before update on email_events
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- app_settings: single-row workspace settings
-- ---------------------------------------------------------------------------
create table app_settings (
  id                        boolean primary key default true check (id),
  reviewer_name             text not null default 'Arjun Mehta',
  company_name              text not null default 'Kargo',
  auto_send_after_decision  boolean not null default false,
  updated_at                timestamptz not null default now()
);
create trigger app_settings_updated_at before update on app_settings
  for each row execute function set_updated_at();
insert into app_settings (id) values (true) on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Migration bookkeeping
-- ---------------------------------------------------------------------------
create table if not exists schema_migrations (
  name        text primary key,
  applied_at  timestamptz not null default now()
);
insert into schema_migrations (name) values ('0001_init') on conflict do nothing;
