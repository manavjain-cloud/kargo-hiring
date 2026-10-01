import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleError, jsonError, uuidParam } from "@/lib/api";
import { recordDecision } from "@/lib/repo";

export const runtime = "nodejs";

const body = z.object({
  decision: z.enum(["move_forward", "hold", "decline"]),
  note: z.string().trim().max(2000).optional(),
  // Explicit human confirmation — the UI only sends this after Arjun confirms the dialog.
  confirmed: z.literal(true),
});

/** Records Arjun's decision (the only way a candidate's status changes) and prepares the email draft. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/candidates/[id]/decision">) {
  const { id } = await ctx.params;
  if (!uuidParam.safeParse(id).success) return jsonError("Invalid candidate id.", 400);
  try {
    const parsed = body.parse(await req.json());
    const result = await recordDecision({ candidateId: id, decision: parsed.decision, note: parsed.note || null });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
