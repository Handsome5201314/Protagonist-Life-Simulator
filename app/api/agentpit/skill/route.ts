import { NextRequest } from "next/server";

import { buildSkillMarkdown } from "@/lib/agentpit";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  return new Response(buildSkillMarkdown(origin), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
