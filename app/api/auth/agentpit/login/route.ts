import { NextRequest, NextResponse } from "next/server";

import { buildAgentPitLoginUrl } from "@/lib/agentpit";

export async function GET(request: NextRequest) {
  const url = buildAgentPitLoginUrl(request.nextUrl.origin);
  if (!url) {
    return NextResponse.redirect(new URL("/?agentpit=missing-config", request.url));
  }

  return NextResponse.redirect(url);
}
