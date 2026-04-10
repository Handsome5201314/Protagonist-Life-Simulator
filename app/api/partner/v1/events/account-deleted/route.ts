import { NextRequest, NextResponse } from "next/server";

import { processPartnerAccountDeleted } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await processPartnerAccountDeleted(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process account deletion" },
      { status: 400 }
    );
  }
}
