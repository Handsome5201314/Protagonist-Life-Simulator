import { NextResponse } from "next/server";

import { getDb, updateDb } from "@/lib/db";
import { applyProjectChangeProposal } from "@/lib/project-changes";
import { getSuperAdminSession } from "@/lib/super-admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  _request: Request,
  context: { params: Promise<{ proposalId: string }> }
) {
  try {
    const authenticated = await getSuperAdminSession();
    if (!authenticated) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { proposalId } = await context.params;
    const db = await getDb();
    const proposal = db.projectChangeProposals.find((item) => item.id === proposalId);
    if (!proposal) {
      return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
    }

    const historyEntry = await applyProjectChangeProposal(proposal);

    await updateDb((mutableDb) => {
      const target = mutableDb.projectChangeProposals.find((item) => item.id === proposalId);
      if (target) {
        target.status = "applied";
      }
      mutableDb.projectChangeHistory.unshift(historyEntry);
      mutableDb.projectChangeHistory = mutableDb.projectChangeHistory.slice(0, 40);
    });

    return NextResponse.json(
      { ok: true, historyEntry },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to apply proposal" },
      { status: 400 }
    );
  }
}
