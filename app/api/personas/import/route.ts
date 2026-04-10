import { NextRequest, NextResponse } from "next/server";

import { importPersona } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const persona = await importPersona(body);
    return NextResponse.json({ persona });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import persona" },
      { status: 400 }
    );
  }
}
