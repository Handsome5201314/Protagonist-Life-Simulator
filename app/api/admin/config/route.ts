import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { rollbackGameplayConfig, updateGameplayConfig } from "@/lib/app-service";

const patchSchema = z.object({
  dating: z
    .object({
      forceTrustCrisisAfterFirstTurn: z.boolean().optional(),
      tensionBoost: z.number().int().min(0).max(20).optional(),
      environmentPressure: z.number().int().min(0).max(3).optional(),
      skillCostDiamonds: z.number().int().min(1).max(10).optional(),
    })
    .optional(),
  arena: z
    .object({
      defaultProxyMode: z.enum(["self", "ai"]).optional(),
      openingPressureBoost: z.number().int().min(0).max(10).optional(),
      eventIntensity: z.number().int().min(1).max(3).optional(),
    })
    .optional(),
});

const applySchema = z.object({
  action: z.literal("apply").default("apply"),
  proposalId: z.string().optional(),
  locale: z.enum(["en", "zh"]).optional(),
  windowHours: z.number().int().min(24).max(24 * 30).optional(),
  patch: patchSchema.optional(),
});

const rollbackSchema = z.object({
  action: z.literal("rollback"),
  historyId: z.string().optional(),
  locale: z.enum(["en", "zh"]).optional(),
  windowHours: z.number().int().min(24).max(24 * 30).optional(),
});

const schema = z.discriminatedUnion("action", [applySchema, rollbackSchema]);

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const payload =
      body.action === "rollback"
        ? await rollbackGameplayConfig(body)
        : await updateGameplayConfig(body);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update gameplay config" },
      { status: 400 }
    );
  }
}
