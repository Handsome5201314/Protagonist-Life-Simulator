import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

export async function GET() {
  const db = await getDb();
  const profiles = db.personas
    .filter((persona) => persona.source !== "legend")
    .map((persona) => ({
      profileId: persona.sourceProfileId || persona.id,
      name: persona.deletedAt ? "[Destroyed Data Ghost]" : persona.name,
      source: persona.source,
      adultOnlyEligible: persona.adultOnlyEligible,
      expiresAt: persona.expiresAt,
    }));

  return NextResponse.json({ profiles });
}
