import { Buffer } from "node:buffer";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
};

type ChatCompletionChoice = {
  message: {
    content: string | null;
  };
};

type ChatCompletionResponse = {
  choices: ChatCompletionChoice[];
};

type OpenAiErrorShape = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

export class OneApiGeminiProxy {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly textModel: string;
  private readonly visionModel: string;

  constructor(input?: {
    baseUrl?: string;
    apiKey?: string;
    textModel?: string;
    visionModel?: string;
  }) {
    this.baseUrl = (input?.baseUrl || process.env.ONE_API_BASE_URL || "").replace(/\/$/, "");
    this.apiKey = input?.apiKey || process.env.ONE_API_KEY || "";
    this.textModel =
      input?.textModel || process.env.ONE_API_GEMINI_MODEL || "gemini-3-flash-preview";
    this.visionModel =
      input?.visionModel || process.env.ONE_API_GEMINI_VISION_MODEL || "gemini-3-flash-preview";

    if (!this.baseUrl) {
      throw new Error("ONE_API_BASE_URL is missing");
    }

    if (!this.apiKey.startsWith("sk-")) {
      throw new Error(
        `ONE_API_KEY format is invalid. Expected 'sk-' prefix, got '${this.apiKey.slice(0, 8)}'`
      );
    }
  }

  private async request<T>(path: string, body: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as OpenAiErrorShape;
      throw new Error(payload.error?.message || `One-API request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async generateText(prompt: string, input?: { temperature?: number; maxTokens?: number }) {
    const response = await this.request<ChatCompletionResponse>("/chat/completions", {
      model: this.textModel,
      messages: [{ role: "user", content: prompt }],
      temperature: input?.temperature ?? 0.2,
      max_tokens: input?.maxTokens ?? 8192,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  }

  async chat(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    input?: { systemPrompt?: string; temperature?: number; maxTokens?: number }
  ) {
    const apiMessages: ChatMessage[] = [];
    if (input?.systemPrompt) {
      apiMessages.push({ role: "system", content: input.systemPrompt });
    }

    apiMessages.push(
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      }))
    );

    const response = await this.request<ChatCompletionResponse>("/chat/completions", {
      model: this.textModel,
      messages: apiMessages,
      temperature: input?.temperature ?? 0.7,
      max_tokens: input?.maxTokens ?? 2000,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  }

  async *chatStream(
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    input?: { systemPrompt?: string; temperature?: number; maxTokens?: number }
  ) {
    const apiMessages: ChatMessage[] = [];
    if (input?.systemPrompt) {
      apiMessages.push({ role: "system", content: input.systemPrompt });
    }

    apiMessages.push(
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      }))
    );

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.textModel,
        messages: apiMessages,
        temperature: input?.temperature ?? 0.7,
        max_tokens: input?.maxTokens ?? 2000,
        stream: true,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as OpenAiErrorShape;
      throw new Error(payload.error?.message || `One-API stream failed with ${response.status}`);
    }

    if (!response.body) {
      throw new Error("One-API stream response body is empty");
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice("data:".length).trim();
        if (payload === "[DONE]") return;

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const chunk = parsed.choices?.[0]?.delta?.content;
          if (chunk) {
            yield chunk;
          }
        } catch {
          continue;
        }
      }
    }
  }

  async analyzeImage(
    imageBytes: Uint8Array | Buffer,
    mimeType: string,
    prompt: string,
    input?: { temperature?: number; maxTokens?: number }
  ) {
    const b64 = Buffer.from(imageBytes).toString("base64");
    const imageUrl = `data:${mimeType};base64,${b64}`;

    const response = await this.request<ChatCompletionResponse>("/chat/completions", {
      model: this.visionModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: input?.temperature ?? 0.2,
      max_tokens: input?.maxTokens ?? 2000,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  }

  async analyzeImageAsJson(
    imageBytes: Uint8Array | Buffer,
    mimeType: string,
    prompt: string
  ) {
    const text = await this.analyzeImage(imageBytes, mimeType, prompt);
    let stripped = text.trim();

    if (stripped.startsWith("```")) {
      const lines = stripped.split("\n");
      stripped = lines.slice(1, -1).join("\n");
    }

    return JSON.parse(stripped) as Record<string, unknown>;
  }
}

export function createOneApiGeminiProxy() {
  return new OneApiGeminiProxy();
}
