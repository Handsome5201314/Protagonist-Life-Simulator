import { NextRequest, NextResponse } from "next/server";

import { createMatch } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createMatch({
      mode: body.mode || "public",
      worldPackId: body.worldPackId,
      participantPersonaIds: body.participantPersonaIds || [],
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "A2A create-match failed" },
      { status: 400 }
    );
  }
}
