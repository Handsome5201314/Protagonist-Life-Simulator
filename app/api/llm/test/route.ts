import { NextRequest, NextResponse } from "next/server";

import { createOneApiGeminiProxy } from "@/lib/one-api-gemini";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      prompt?: string;
      systemPrompt?: string;
      mode?: "generate" | "chat";
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    const proxy = createOneApiGeminiProxy();

    if (body.mode === "chat") {
      const text = await proxy.chat(body.messages || [], {
        systemPrompt: body.systemPrompt || "",
      });
      return NextResponse.json({ text });
    }

    const text = await proxy.generateText(body.prompt || "用三句话介绍 Hero Life Arena");
    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "LLM test failed" },
      { status: 500 }
    );
  }
}
