import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getDb, updateDb } from "@/lib/db";
import { generateProjectChangeProposal } from "@/lib/project-changes";
import { getSuperAdminSession } from "@/lib/super-admin-auth";

const schema = z.object({
  prompt: z.string().min(1),
  agentId: z.enum(["superadmin", "main", "director", "dating", "arena"]).default("superadmin"),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const authenticated = await getSuperAdminSession();
  if (!authenticated) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  return NextResponse.json(
    {
      ok: true,
      proposals: db.projectChangeProposals,
      history: db.projectChangeHistory,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const authenticated = await getSuperAdminSession();
    if (!authenticated) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = schema.parse(await request.json());
    const proposal = await generateProjectChangeProposal(body);

    await updateDb((db) => {
      db.projectChangeProposals.unshift(proposal);
      db.projectChangeProposals = db.projectChangeProposals.slice(0, 20);
    });

    return NextResponse.json(
      { ok: true, proposal },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to generate proposal" },
      { status: 400 }
    );
  }
}
