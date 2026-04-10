import { NextResponse } from "next/server";

import { sanitizeExistingWorldPack } from "@/lib/app-service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const world = await sanitizeExistingWorldPack(id);
    return NextResponse.json({ world });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sanitize world pack" },
      { status: 400 }
    );
  }
}
