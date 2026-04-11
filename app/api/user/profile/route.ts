import { NextRequest, NextResponse } from "next/server";

import { updateUserProfile } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await updateUserProfile(body);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user profile" },
      { status: 400 }
    );
  }
}
