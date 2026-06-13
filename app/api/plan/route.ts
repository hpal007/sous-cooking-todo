import { NextRequest, NextResponse } from "next/server";
import { planRequestSchema } from "@/lib/validation";
import { generateCookingPlan } from "@/lib/gemini";
import { checkRateLimit, sweepRateLimit } from "@/lib/rate-limit";

// Run on the Node.js runtime so the Gemini SDK and the server-only API key work.
export const runtime = "nodejs";
// Never cache a personalized plan.
export const dynamic = "force-dynamic";

function clientKey(request: NextRequest): string {
  // Trust the standard proxy headers on Vercel; fall back to a constant so the
  // limiter still functions locally.
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "local";
}

export async function POST(request: NextRequest) {
  // Guard the paid, public endpoint against a single client hammering it.
  sweepRateLimit();
  const { allowed, retryAfterSeconds } = checkRateLimit(clientKey(request));
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check your inputs.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const plan = await generateCookingPlan(parsed.data);
    return NextResponse.json({ plan });
  } catch (err) {
    // Log the real error server-side; return a safe, generic message to the
    // client so we never leak the API key, server config, stack traces, or model
    // internals.
    console.error("[/api/plan] generation failed:", err);
    return NextResponse.json(
      { error: "We couldn't generate a plan right now. Please try again in a moment." },
      { status: 502 },
    );
  }
}
