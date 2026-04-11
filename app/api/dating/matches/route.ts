import { NextRequest, NextResponse } from "next/server";

import { createDatingMatch } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const room = await createDatingMatch(body);
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create dating room" },
      { status: 400 }
    );
  }
}
