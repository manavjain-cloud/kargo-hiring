import "server-only";
import { isMissingSchema } from "./db";
import { ConfigError } from "./env";

export type Loaded<T> = { ok: true; data: T } | { ok: false; reason: "no-database" | "no-schema" | "error"; message: string };

/** Runs a page's data loader and turns setup problems into a renderable state instead of a crash. */
export async function safeLoad<T>(fn: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ConfigError) return { ok: false, reason: "no-database", message: err.message };
    if (isMissingSchema(err)) return { ok: false, reason: "no-schema", message: "Database tables not found." };
    console.error("[page] data load failed", err);
    return { ok: false, reason: "error", message: "Couldn't reach the database. Check DATABASE_URL and your connection, then reload." };
  }
}
