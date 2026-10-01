import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { config, ConfigError } from "../env";

let client: NeonQueryFunction<false, false> | null = null;

/** Neon HTTP client. Server-only: DATABASE_URL never leaves the server. */
export function db(): NeonQueryFunction<false, false> {
  if (client) return client;
  const url = config().databaseUrl;
  if (!url) throw new ConfigError("DATABASE_URL");
  client = neon(url);
  return client;
}

/** Typed query helper using $1-style parameters. */
export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await db().query(text, params)) as T[];
}

export async function queryOne<T>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export interface Stmt {
  text: string;
  params?: unknown[];
}

/** Runs statements atomically as a single non-interactive Postgres transaction. */
export async function transaction(stmts: Stmt[]): Promise<void> {
  if (stmts.length === 0) return;
  await db().transaction((txn) => stmts.map((s) => txn.query(s.text, s.params ?? [])));
}

/** Postgres "undefined_table" — the schema has not been applied yet. */
export function isMissingSchema(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "42P01";
}

export const toIso = (v: unknown): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString();

export const toNum = (v: unknown): number | null => (v == null ? null : Number(v));
