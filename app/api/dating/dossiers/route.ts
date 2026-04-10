import { NextRequest, NextResponse } from "next/server";

import { createDossier } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dossier = await createDossier(body);
    return NextResponse.json({ dossier }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create dossier" },
      { status: 400 }
    );
  }
}
