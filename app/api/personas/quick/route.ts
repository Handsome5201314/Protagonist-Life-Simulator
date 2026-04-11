import { NextRequest, NextResponse } from "next/server";

import { createQuickPersona } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const persona = await createQuickPersona(body);
    return NextResponse.json({ persona }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create quick persona" },
      { status: 400 }
    );
  }
}
