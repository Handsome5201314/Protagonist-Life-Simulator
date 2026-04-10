import { NextRequest, NextResponse } from "next/server";

import { exchangeAgentPitCode } from "@/lib/agentpit";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/personas?agentpit=missing-code", request.url));
  }

  try {
    await exchangeAgentPitCode(code, `${request.nextUrl.origin}/auth/agentpit/callback`);
    return NextResponse.redirect(new URL("/personas?agentpit=connected", request.url));
  } catch {
    return NextResponse.redirect(new URL("/personas?agentpit=exchange-failed", request.url));
  }
}
