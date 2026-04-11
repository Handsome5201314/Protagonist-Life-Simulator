import { NextRequest, NextResponse } from "next/server";

import { joinMatch } from "@/lib/app-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await request.json();
    const result = await joinMatch(matchId, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to join match" },
      { status: 400 }
    );
  }
}
