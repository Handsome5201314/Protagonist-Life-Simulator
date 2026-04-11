import { NextRequest, NextResponse } from "next/server";

import { interactDatingMatch } from "@/lib/app-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const body = await request.json();
    const result = await interactDatingMatch(roomId, body);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to interact with dating room" },
      { status: 400 }
    );
  }
}
