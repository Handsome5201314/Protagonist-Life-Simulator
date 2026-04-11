import { NextRequest, NextResponse } from "next/server";

import { updateMatchPrep } from "@/lib/app-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await request.json();
    const result = await updateMatchPrep(matchId, body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update prep state" },
      { status: 400 }
    );
  }
}