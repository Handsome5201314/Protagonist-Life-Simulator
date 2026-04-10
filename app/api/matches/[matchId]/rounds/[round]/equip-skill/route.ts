import { NextRequest, NextResponse } from "next/server";

import { equipSkill } from "@/lib/app-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ matchId: string; round: string }> }
) {
  try {
    const { matchId, round } = await context.params;
    const body = await request.json();
    const result = await equipSkill(matchId, Number(round), body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to equip skill" },
      { status: 400 }
    );
  }
}
