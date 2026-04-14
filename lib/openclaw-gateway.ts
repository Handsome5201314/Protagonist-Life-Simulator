type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

type OpenAiErrorShape = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

export function isOpenClawConfigured() {
  return Boolean(process.env.OPENCLAW_GATEWAY_BASE_URL && process.env.OPENCLAW_GATEWAY_TOKEN);
}

export class OpenClawGatewayClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(input?: { baseUrl?: string; token?: string }) {
    this.baseUrl = (input?.baseUrl || process.env.OPENCLAW_GATEWAY_BASE_URL || "").replace(/\/$/, "");
    this.token = input?.token || process.env.OPENCLAW_GATEWAY_TOKEN || "";

    if (!this.baseUrl) {
      throw new Error("OPENCLAW_GATEWAY_BASE_URL is missing");
    }

    if (!this.token) {
      throw new Error("OPENCLAW_GATEWAY_TOKEN is missing");
    }
  }

  private async request(path: string, body: Record<string, unknown>, agentId = "main") {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        "x-openclaw-agent-id": agentId,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as OpenAiErrorShape;
      throw new Error(payload.error?.message || `OpenClaw request failed with ${response.status}`);
    }

    return (await response.json()) as ChatCompletionResponse;
  }

  async generateText(
    prompt: string,
    input?: { systemPrompt?: string; temperature?: number; maxTokens?: number; user?: string; agentId?: string }
  ) {
    const agentId = input?.agentId || "main";
    const response = await this.request(
      "/chat/completions",
      {
        model: `openclaw/${agentId}`,
        user: input?.user,
        temperature: input?.temperature ?? 0.4,
        max_tokens: input?.maxTokens ?? 1600,
        messages: [
          ...(input?.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
      },
      agentId
    );

    return response.choices?.[0]?.message?.content?.trim() || "";
  }
}

export function createOpenClawGatewayClient() {
  return new OpenClawGatewayClient();
}
