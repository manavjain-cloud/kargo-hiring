import "server-only";

/** Server-only configuration. Nothing here is ever exposed to the browser. */

const clean = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : undefined);

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
/** Used in order when the primary model is overloaded (503), rate-limited (429) or retired (404). */
export const DEFAULT_GEMINI_FALLBACKS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

export function config() {
  const primary = clean(process.env.GEMINI_MODEL) ?? DEFAULT_GEMINI_MODEL;
  const fallbacks =
    clean(process.env.GEMINI_FALLBACK_MODELS)
      ?.split(",")
      .map((m) => m.trim())
      .filter(Boolean) ?? DEFAULT_GEMINI_FALLBACKS;
  return {
    databaseUrl: clean(process.env.DATABASE_URL),
    geminiApiKey: clean(process.env.GEMINI_API_KEY),
    geminiModel: primary,
    geminiModels: [primary, ...fallbacks.filter((m) => m !== primary)],
    resendApiKey: clean(process.env.RESEND_API_KEY),
    resendFrom: clean(process.env.RESEND_FROM_EMAIL),
    /** Demo/test mode: deliver every approved email here instead of to the candidate. */
    resendTestRecipient: clean(process.env.RESEND_TEST_RECIPIENT),
  };
}

export interface ConfigStatus {
  database: boolean;
  gemini: boolean;
  geminiModel: string;
  email: boolean;
  emailFrom: string | null;
  emailTestRecipient: string | null;
}

export function configStatus(): ConfigStatus {
  const c = config();
  return {
    database: Boolean(c.databaseUrl),
    gemini: Boolean(c.geminiApiKey),
    geminiModel: c.geminiModel,
    email: Boolean(c.resendApiKey && c.resendFrom),
    emailFrom: c.resendFrom ?? null,
    emailTestRecipient: c.resendTestRecipient ?? null,
  };
}

export class ConfigError extends Error {
  constructor(public readonly missing: string) {
    super(`${missing} is not configured. Add it to .env.local and restart the server.`);
    this.name = "ConfigError";
  }
}
