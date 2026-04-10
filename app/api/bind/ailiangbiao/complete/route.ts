import { NextResponse } from "next/server";

import { completeAiliangbiaoLink } from "@/lib/app-service";

export async function POST() {
  try {
    const result = await completeAiliangbiaoLink();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete link" },
      { status: 400 }
    );
  }
}
