import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { askDirectorQuestion } from "@/lib/app-service";

const schema = z.object({
  question: z.string().min(1),
  locale: z.enum(["en", "zh"]).optional(),
  windowHours: z.number().int().min(24).max(24 * 30).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const payload = await askDirectorQuestion(body);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to ask director" },
      { status: 400 }
    );
  }
}
