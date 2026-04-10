import { NextRequest, NextResponse } from "next/server";

import { createMatch } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = await createMatch(body);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create match" },
      { status: 400 }
    );
  }
}
