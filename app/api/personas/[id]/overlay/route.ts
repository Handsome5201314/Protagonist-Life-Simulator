import { NextRequest, NextResponse } from "next/server";

import { updatePersonaOverlay } from "@/lib/app-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await context.params;
    const overlay = await updatePersonaOverlay(id, body);
    return NextResponse.json({ overlay });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update overlay" },
      { status: 400 }
    );
  }
}
