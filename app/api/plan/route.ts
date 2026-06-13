import { NextRequest, NextResponse } from "next/server";
import { planRequestSchema } from "@/lib/validation";
import { generateCookingPlan } from "@/lib/gemini";

// Run on the Node.js runtime so the Gemini SDK and the server-only API key work.
export const runtime = "nodejs";
// Never cache a personalized plan.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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
    // Log the real error server-side; return a safe message to the client so we
    // never leak the API key, stack traces, or model internals.
    console.error("[/api/plan] generation failed:", err);
    const message =
      err instanceof Error && err.message.includes("GEMINI_API_KEY")
        ? "The server is missing its Gemini API key. Add GEMINI_API_KEY and restart."
        : "We couldn't generate a plan right now. Please try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
