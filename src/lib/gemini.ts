import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config, ConfigError } from "./env";

let client: GoogleGenAI | null = null;

function gemini(): GoogleGenAI {
  if (client) return client;
  const { geminiApiKey } = config();
  if (!geminiApiKey) throw new ConfigError("GEMINI_API_KEY");
  client = new GoogleGenAI({ apiKey: geminiApiKey });
  return client;
}

export class AiError extends Error {
  constructor(
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "AiError";
  }
}

/** Gemini's structured-output schema accepts a JSON Schema subset; drop keys it rejects. */
function toGeminiSchema(schema: z.ZodType): unknown {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) {
        if (k === "$schema" || k === "additionalProperties" || k === "~standard") continue;
        out[k] = strip(v);
      }
      return out;
    }
    return node;
  };
  return strip(z.toJSONSchema(schema, { target: "draft-2020-12" }));
}

/** How long one call keeps retrying through overload before giving up. */
const RETRY_WINDOW_MS = Number(process.env.GEMINI_RETRY_WINDOW_MS) || 90_000;

/**
 * Models that can't serve requests right now: retired (404) or out of daily quota (429 "PerDay").
 * Remembered across calls for an hour so a batch of CVs doesn't re-hit an exhausted model every time.
 */
const unavailableUntil = new Map<string, { until: number; reason: "retired" | "daily-quota" }>();
const SKIP_MS = 60 * 60 * 1000;

function isDailyQuota(err: unknown): boolean {
  return /PerDay|free_tier_requests/i.test((err as Error)?.message ?? "");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function statusOf(err: unknown): number | undefined {
  if (err && typeof err === "object") {
    const e = err as { status?: number; code?: number };
    return e.status ?? e.code;
  }
  return undefined;
}

export interface JsonCallOptions<T extends z.ZodType> {
  schema: T;
  system: string;
  prompt: string;
  temperature?: number;
}

/**
 * Calls Gemini with a JSON schema, validates the result with zod, and retries on
 * rate limits / overload (backoff, rotating through the fallback model chain) and
 * once on invalid output (with feedback). Returns the model that actually answered.
 */
export async function generateJson<T extends z.ZodType>(opts: JsonCallOptions<T>): Promise<{ data: z.infer<T>; model: string }> {
  const chain = config().geminiModels;
  const responseJsonSchema = toGeminiSchema(opts.schema);
  let prompt = opts.prompt;
  let validationRetried = false;
  let lastStatus: number | undefined;
  // Keep rotating through the chain (with backoff) until this deadline; Google's 503s come in bursts.
  const deadline = Date.now() + RETRY_WINDOW_MS;

  for (let attempt = 0; Date.now() < deadline; attempt++) {
    const usable = chain.filter((m) => (unavailableUntil.get(m)?.until ?? 0) < Date.now());
    if (usable.length === 0) break;
    const model = usable[attempt % usable.length];
    let text: string | undefined;
    try {
      const res = await gemini().models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: opts.system,
          temperature: opts.temperature ?? 0.1,
          responseMimeType: "application/json",
          responseJsonSchema,
        },
      });
      text = res.text;
    } catch (err) {
      const status = statusOf(err);
      lastStatus = status;
      if (process.env.GEMINI_DEBUG) console.warn(`[gemini] ${model} attempt ${attempt + 1}: ${status} ${(err as Error).message.slice(0, 160)}`);
      if (status === 401 || status === 403) throw new AiError("Gemini rejected the API key (check GEMINI_API_KEY).");
      if (status === 400) throw new AiError(`Gemini rejected the request: ${(err as Error).message.slice(0, 300)}`);
      // Retired or out of daily quota: stop using this model for a while. Retrying won't help.
      if (status === 404) unavailableUntil.set(model, { until: Date.now() + SKIP_MS, reason: "retired" });
      else if (status === 429 && isDailyQuota(err)) unavailableUntil.set(model, { until: Date.now() + SKIP_MS, reason: "daily-quota" });
      // Otherwise (per-minute 429, 5xx overload) rotate to the next model; back off once per full pass.
      if ((attempt + 1) % Math.max(1, usable.length) === 0) {
        const wait = Math.min(15_000, 2_000 * 2 ** Math.floor(attempt / chain.length));
        if (Date.now() + wait >= deadline) break;
        await sleep(wait);
      }
      continue;
    }

    if (!text) throw new AiError("Gemini returned an empty response (it may have been blocked by safety filters).", true);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
    const result = opts.schema.safeParse(parsed);
    if (result.success) return { data: result.data, model };

    if (validationRetried) throw new AiError("Gemini returned output that doesn't match the rubric schema twice.", true);
    validationRetried = true;
    const issues = result.error ? z.prettifyError(result.error).slice(0, 1500) : "Response was not valid JSON.";
    prompt = `${opts.prompt}\n\nYour previous answer was invalid:\n${issues}\nReturn corrected JSON only.`;
  }
  const blocked = chain.map((m) => unavailableUntil.get(m)).filter((u) => u && u.until > Date.now());
  if (blocked.length === chain.length && blocked.every((u) => u!.reason === "daily-quota")) {
    throw new AiError(
      "Gemini's free-tier daily quota is used up on every configured model (20 requests/day/model). Enable billing on the Google AI Studio project for this key, or try again tomorrow.",
    );
  }
  throw new AiError(
    lastStatus === 429
      ? "Gemini quota/rate limit reached on every configured model. Wait a minute and retry."
      : lastStatus === 404
        ? `None of the configured Gemini models are available (${chain.join(", ")}). Check GEMINI_MODEL.`
        : "Gemini is overloaded right now (all configured models busy). Retry in a minute.",
    true,
  );
}
