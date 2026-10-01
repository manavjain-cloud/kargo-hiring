import { NextResponse, type NextRequest } from "next/server";
import { handleError, jsonError, uuidParam } from "@/lib/api";
import { evaluateCandidate } from "@/lib/repo";

export const runtime = "nodejs";
// two Gemini calls, each allowed up to 90s of overload retries
export const maxDuration = 300;

/** Runs the AI pipeline for one candidate and stores the structured recommendation. */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/candidates/[id]/evaluate">) {
  const { id } = await ctx.params;
  if (!uuidParam.safeParse(id).success) return jsonError("Invalid candidate id.", 400);
  try {
    const result = await evaluateCandidate(id);
    return NextResponse.json(result);
  } catch (err) {
    return handleError(err);
  }
}
