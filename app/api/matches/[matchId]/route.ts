import { NextResponse } from "next/server";

import { getMatchBundle } from "@/lib/app-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const bundle = await getMatchBundle(matchId);
    return NextResponse.json(bundle);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Match not found" },
      { status: 404 }
    );
  }
}
