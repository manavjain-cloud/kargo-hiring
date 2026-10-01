/**
 * Polls the configured Gemini model chain until one answers (Google returns 503
 * during demand spikes). Exits 0 with the model name, or 1 after the time limit.
 * Run: npx tsx --env-file=.env.local scripts/wait-for-gemini.ts [minutes]
 */
import { GoogleGenAI } from "@google/genai";

const models = [process.env.GEMINI_MODEL || "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"];
const limitMin = Number(process.argv[2] ?? 20);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const started = Date.now();

async function main() {
  while (Date.now() - started < limitMin * 60_000) {
    for (const model of models) {
      try {
        await ai.models.generateContent({ model, contents: "Reply OK" });
        console.log(`AVAILABLE ${model} after ${Math.round((Date.now() - started) / 1000)}s`);
        return;
      } catch {
        // busy — try the next one
      }
    }
    console.log(`all busy at ${new Date().toLocaleTimeString()}`);
    await new Promise((r) => setTimeout(r, 60_000));
  }
  console.log("TIMEOUT: Gemini still unavailable");
  process.exitCode = 1;
}
main();
