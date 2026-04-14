import { NextRequest, NextResponse } from "next/server";

import { getLocale } from "@/lib/i18n-server";
import { getPythonEngineBaseUrl, interactRequestSchema, mapInteractRequestToPython } from "@/lib/python-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = interactRequestSchema.parse(await request.json());
    const locale = await getLocale();
    const pythonPayload = mapInteractRequestToPython(body, locale);

    const response = await fetch(`${getPythonEngineBaseUrl()}/engine/trigger`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pythonPayload),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: errorText || `Python engine returned ${response.status}`,
        },
        { status: 502 }
      );
    }

    if (!response.body) {
      return NextResponse.json(
        {
          ok: false,
          error: "Python engine did not return a stream body",
        },
        { status: 502 }
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to proxy interaction",
      },
      { status: 400 }
    );
  }
}
