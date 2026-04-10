import { NextRequest, NextResponse } from "next/server";

import { rehearseDating } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rehearsal = await rehearseDating(body);
    return NextResponse.json(rehearsal);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run rehearsal" },
      { status: 400 }
    );
  }
}
