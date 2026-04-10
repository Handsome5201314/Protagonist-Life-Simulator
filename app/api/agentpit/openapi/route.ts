import { NextRequest, NextResponse } from "next/server";

import { buildOpenApiDocument } from "@/lib/agentpit";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  return NextResponse.json(buildOpenApiDocument(origin));
}
