import { NextResponse } from "next/server";

import { deleteMe } from "@/lib/app-service";

export async function POST() {
  try {
    const result = await deleteMe();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete account" },
      { status: 400 }
    );
  }
}
