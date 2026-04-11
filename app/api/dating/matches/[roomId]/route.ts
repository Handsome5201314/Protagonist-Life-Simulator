import { NextResponse } from "next/server";

import { getDatingMatchBundle } from "@/lib/app-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await context.params;
    const room = await getDatingMatchBundle(roomId);
    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dating room not found" },
      { status: 404 }
    );
  }
}
