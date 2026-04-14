import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isOpenClawConfigured, OpenClawGatewayClient } from "@/lib/openclaw-gateway";
import { getSuperAdminSession } from "@/lib/super-admin-auth";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const schema = z.object({
  agentId: z.enum(["superadmin", "main", "director", "dating", "arena"]).default("superadmin"),
  messages: z.array(messageSchema).min(1).max(20),
});

function buildSystemPrompt() {
  return [
    "You are the super-admin project copilot for Turing Destiny Arena.",
    "You are helping the project owner modify and improve a commercial-grade multi-agent game system.",
    "Answer directly and in Chinese when the user writes Chinese.",
    "Be concrete and operational.",
    "When asked to change the project, respond with exact file-level recommendations, patch structure, risks, and verification steps.",
    "Do not claim code has already been modified from this web console.",
    "Do not mention cron jobs, healthcheck skills, internal tools, searching, checking files, or your own workflow unless the user explicitly asks about them.",
    "Do not narrate your reasoning process.",
    "Current web-console capability is advisory chat only unless the operator explicitly asks for gameplay-config changes through the existing admin system.",
    "Respect the dual-engine rule: referee logic decides outcomes, agents narrate.",
  ].join(" ");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const authenticated = await getSuperAdminSession();
    if (!authenticated) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isOpenClawConfigured()) {
      return NextResponse.json({ ok: false, error: "OpenClaw gateway is not configured" }, { status: 503 });
    }

    const body = schema.parse(await request.json());
    const client = new OpenClawGatewayClient();

    const prompt = [
      "Project context:",
      "- Frontend: Next.js App Router + Tailwind + Lucide",
      "- BFF: Next.js API routes",
      "- Backend core: Python FastAPI",
      "- Agent runtime: OpenClaw",
      "- Rule: referee decides outcomes, agents narrate only",
      "",
      "Conversation:",
      ...body.messages.map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`),
      "",
      "Respond with direct project guidance.",
    ].join("\n");

    const reply = await client.generateText(prompt, {
      agentId: body.agentId,
      systemPrompt: buildSystemPrompt(),
      temperature: 0.45,
      maxTokens: 2000,
    });

    return NextResponse.json({
      ok: true,
      agentId: body.agentId,
      reply,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Chat failed" },
      { status: 400 }
    );
  }
}
