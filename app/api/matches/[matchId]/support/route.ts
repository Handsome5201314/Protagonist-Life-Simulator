import { NextRequest, NextResponse } from "next/server";

import { supportMatch } from "@/lib/app-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params;
    const body = await request.json();
    const ticket = await supportMatch(matchId, body);
    return NextResponse.json({ ticket });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to support match" },
      { status: 400 }
    );
  }
}
