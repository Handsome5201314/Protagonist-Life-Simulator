import { NextResponse } from "next/server";

import { getDb, updateDb } from "@/lib/db";
import { rollbackProjectChangeHistory } from "@/lib/project-changes";
import { getSuperAdminSession } from "@/lib/super-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  _request: Request,
  context: { params: Promise<{ historyId: string }> }
) {
  try {
    const authenticated = await getSuperAdminSession();
    if (!authenticated) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { historyId } = await context.params;
    const db = await getDb();
    const history = db.projectChangeHistory.find((item) => item.id === historyId);
    if (!history) {
      return NextResponse.json({ ok: false, error: "History entry not found" }, { status: 404 });
    }

    const rollbackEntry = await rollbackProjectChangeHistory(history);

    await updateDb((mutableDb) => {
      const proposal = mutableDb.projectChangeProposals.find((item) => item.id === history.proposalId);
      if (proposal) {
        proposal.status = "rolled_back";
      }
      mutableDb.projectChangeHistory.unshift(rollbackEntry);
      mutableDb.projectChangeHistory = mutableDb.projectChangeHistory.slice(0, 40);
    });

    return NextResponse.json(
      { ok: true, historyEntry: rollbackEntry },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to rollback proposal" },
      { status: 400 }
    );
  }
}
