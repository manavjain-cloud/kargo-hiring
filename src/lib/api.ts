import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isMissingSchema } from "./db";
import { ConfigError } from "./env";
import { EmailNotConfiguredError } from "./email/send";
import { ExtractionError } from "./extract";
import { AiError } from "./gemini";
import { ConflictError, NotFoundError } from "./repo";

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Maps domain errors to HTTP responses. Unknown errors never leak internals. */
export function handleError(err: unknown) {
  if (err instanceof z.ZodError) return jsonError(z.prettifyError(err), 400);
  if (err instanceof ExtractionError) return jsonError(err.message, 422);
  if (err instanceof NotFoundError) return jsonError(err.message, 404);
  if (err instanceof ConflictError) return jsonError(err.message, 409);
  if (err instanceof ConfigError || err instanceof EmailNotConfiguredError) return jsonError(err.message, 503, { setup: true });
  if (isMissingSchema(err)) return jsonError("Database schema not found. Run `npm run db:setup`.", 503, { setup: true });
  if (err instanceof AiError) return jsonError(err.message, err.retryable ? 503 : 502, { retryable: err.retryable });
  console.error("[api] unexpected error", err);
  return jsonError("Something went wrong on the server. Please retry.", 500);
}

export const uuidParam = z.string().uuid();
