import { NextRequest, NextResponse } from "next/server";

import { getAdminInsights } from "@/lib/app-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
    const rawWindowHours = Number(request.nextUrl.searchParams.get("windowHours") || "168");
    const windowHours = Number.isFinite(rawWindowHours) ? Math.min(24 * 30, Math.max(24, rawWindowHours)) : 168;
    const payload = await getAdminInsights({ locale, windowHours });
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load admin insights" },
      { status: 500 }
    );
  }
}
