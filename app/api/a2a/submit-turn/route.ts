import { NextRequest, NextResponse } from "next/server";

import { equipSkill, supportMatch, triggerRound } from "@/lib/app-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = String(body.action || "trigger_round");

    if (action === "equip_skill") {
      const result = await equipSkill(body.matchId, Number(body.round), {
        participantId: body.participantId,
        skillId: body.skillId,
      });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "support") {
      const result = await supportMatch(body.matchId, {
        participantId: body.participantId,
        renownSpent: body.renownSpent,
      });
      return NextResponse.json({ ok: true, result });
    }

    const result = await triggerRound(body.matchId, Number(body.round));
    return NextResponse.json({ ok: true, result }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "A2A submit-turn failed" },
      { status: 400 }
    );
  }
}
