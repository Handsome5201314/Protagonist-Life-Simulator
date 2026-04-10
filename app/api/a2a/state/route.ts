import { NextRequest, NextResponse } from "next/server";

import { getA2AState } from "@/lib/app-service";

export async function GET(request: NextRequest) {
  try {
    const matchId = request.nextUrl.searchParams.get("matchId");
    if (!matchId) {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }

    const state = await getA2AState(matchId);
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "A2A state failed" },
      { status: 400 }
    );
  }
}
