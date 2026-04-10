import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await context.params;
  const db = await getDb();
  const persona = db.personas.find(
    (item) => item.id === profileId || item.sourceProfileId === profileId
  );

  if (!persona) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: persona.id,
    source: persona.source,
    sourceProfileId: persona.sourceProfileId,
    assessmentVersion: persona.assessmentVersion,
    traitVector: persona.traitVector,
    publicTraitTags: persona.publicTraitTags,
    riskFlags: persona.riskFlags,
    lockedHash: persona.lockedHash,
    expiresAt: persona.expiresAt,
  });
}
