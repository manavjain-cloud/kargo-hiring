import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleError, jsonError, uuidParam } from "@/lib/api";
import { updateCandidate } from "@/lib/repo";

export const runtime = "nodejs";

const body = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    email: z.union([z.string().trim().email().max(254), z.literal("").transform(() => null)]).optional(),
    roleCode: z.enum(["pm", "spm"]).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, "Nothing to update.");

/** Manual corrections: name, contact email, applied role. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/candidates/[id]">) {
  const { id } = await ctx.params;
  if (!uuidParam.safeParse(id).success) return jsonError("Invalid candidate id.", 400);
  try {
    await updateCandidate(id, body.parse(await req.json()));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
