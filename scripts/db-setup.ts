/**
 * Applies SQL migrations to Neon, then seeds the two roles (JD text) and the
 * 8 past hires (rubric back-test + CV text). Idempotent — safe to re-run.
 *
 * Source documents are read from SOURCE_DIR (default: the folder above this app),
 * expecting JDs/*.docx and Hires/*.docx. Candidate CVs are NOT seeded — they are
 * uploaded through the app.
 *
 * Run: npm run db:setup
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { Pool } from "@neondatabase/serverless";
import mammoth from "mammoth";
import { PAST_HIRES } from "../src/lib/past-hires";
import { ROLES } from "../src/lib/rubric";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}
const sourceDir = path.resolve(process.env.SOURCE_DIR ?? path.join(process.cwd(), ".."));
const pool = new Pool({ connectionString: url });

async function docxText(file: string): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer: readFileSync(file) });
  return value.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function migrate() {
  await pool.query(`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`);
  const applied = new Set((await pool.query<{ name: string }>(`select name from schema_migrations`)).rows.map((r) => r.name));
  const dir = path.join(process.cwd(), "db", "migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const name = f.replace(/\.sql$/, "");
    if (applied.has(name)) {
      console.log(`  · ${name} already applied`);
      continue;
    }
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(readFileSync(path.join(dir, f), "utf8"));
      await client.query(`insert into schema_migrations (name) values ($1) on conflict do nothing`, [name]);
      await client.query("commit");
      console.log(`  ✓ applied ${name}`);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }
}

async function seedRoles() {
  const jdDir = path.join(sourceDir, "JDs");
  const files = existsSync(jdDir) ? readdirSync(jdDir).filter((f) => f.endsWith(".docx")) : [];
  const pmFile = files.find((f) => /product manager/i.test(f) && !/senior/i.test(f));
  const spmFile = files.find((f) => /senior product manager/i.test(f));
  if (!pmFile || !spmFile) throw new Error(`Couldn't find both JD .docx files in ${jdDir}`);
  for (const [code, file] of [["pm", pmFile], ["spm", spmFile]] as const) {
    const text = await docxText(path.join(jdDir, file));
    await pool.query(
      `insert into roles (code, title, gate_min_c6, jd_text, jd_source_file) values ($1,$2,$3,$4,$5)
       on conflict (code) do update set title = excluded.title, gate_min_c6 = excluded.gate_min_c6,
         jd_text = excluded.jd_text, jd_source_file = excluded.jd_source_file`,
      [code, ROLES[code].title, ROLES[code].gateMin, text, file],
    );
    console.log(`  ✓ role ${code} ← ${file} (${text.length} chars)`);
  }
}

async function seedPastHires() {
  const hireDir = path.join(sourceDir, "Hires");
  for (const h of PAST_HIRES) {
    const file = path.join(hireDir, h.cvFile);
    const text = existsSync(file) ? await docxText(file) : null;
    await pool.query(
      `insert into past_hires (id, full_name, role_title, joined, last_rating, outcome, c1, c2, c3, c4, c5, pattern_score, cv_text, cv_source_file)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       on conflict (id) do update set full_name = excluded.full_name, role_title = excluded.role_title, joined = excluded.joined,
         last_rating = excluded.last_rating, outcome = excluded.outcome, c1 = excluded.c1, c2 = excluded.c2, c3 = excluded.c3,
         c4 = excluded.c4, c5 = excluded.c5, pattern_score = excluded.pattern_score,
         cv_text = coalesce(excluded.cv_text, past_hires.cv_text), cv_source_file = excluded.cv_source_file`,
      [h.id, h.fullName, h.roleTitle, h.joined, h.lastRating, h.outcome, h.scores.C1, h.scores.C2, h.scores.C3, h.scores.C4, h.scores.C5, h.patternScore, text, h.cvFile],
    );
    console.log(`  ✓ past hire ${h.fullName}${text ? "" : " (CV file not found — seeded without CV text)"}`);
  }
}

async function main() {
  console.log("Migrations");
  await migrate();
  console.log(`Seeding from ${sourceDir}`);
  await seedRoles();
  await seedPastHires();
  const { rows } = await pool.query<{ n: string }>(`select count(*)::text as n from candidates`);
  console.log(`\nDone. Candidates in pipeline: ${rows[0].n} (upload CVs through the app).`);
}

main()
  .catch((err) => {
    const msg =
      err instanceof Error
        ? err.message
        : ((err as { error?: Error })?.error?.message ?? "Connection to Neon dropped (network). Re-run the command.");
    console.error("\nSetup failed:", msg);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
