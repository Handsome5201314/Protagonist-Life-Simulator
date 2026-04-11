import { NextResponse } from "next/server";

import { triggerRound } from "@/lib/app-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string; round: string }> }
) {
  try {
    const { matchId, round } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await triggerRound(matchId, Number(round), body.locale === "zh" ? "zh" : "en");
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger round" },
      { status: 400 }
    );
  }
}
