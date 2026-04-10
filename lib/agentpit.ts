import crypto from "node:crypto";

import type { WebhookLog } from "@/lib/types";

const AUTH_URL = process.env.AGENTPIT_AUTH_URL || "https://develop.agentpit.io/api/oauth/authorize";
const TOKEN_URL = process.env.AGENTPIT_TOKEN_URL || "https://develop.agentpit.io/api/oauth/token";

export function buildAgentPitLoginUrl(origin: string) {
  const clientId = process.env.AGENTPIT_CLIENT_ID;
  const redirectUri = `${origin}/auth/agentpit/callback`;

  if (!clientId) {
    return null;
  }

  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", crypto.randomUUID());
  return url.toString();
}

export async function exchangeAgentPitCode(code: string, redirectUri: string) {
  const clientId = process.env.AGENTPIT_CLIENT_ID;
  const clientSecret = process.env.AGENTPIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("AgentPit OAuth is not configured");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange AgentPit code");
  }

  return response.json();
}

export function verifyWebhookSignature(payload: string, signature: string | null) {
  const secret = process.env.AGENTPIT_WEBHOOK_SECRET || "local-webhook-secret";
  if (!signature) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function formatWebhookAccepted(eventId: string, type: string): WebhookLog {
  return {
    eventId,
    type,
    processedAt: new Date().toISOString(),
    status: "accepted",
  };
}

export function buildOpenApiDocument(baseUrl: string) {
  const server = baseUrl.replace(/\/$/, "");

  return {
    openapi: "3.1.0",
    info: {
      title: "Hero Life Arena",
      version: "0.1.0",
      description:
        "Persona import, world forge, arena story streaming, and dating rehearsal APIs for AgentPit and A2A integration.",
    },
    servers: [{ url: server }],
    paths: {
      "/api/personas/import": {
        post: {
          summary: "import_persona",
        },
      },
      "/api/worldpacks/upload": {
        post: {
          summary: "generate_worldpack",
        },
      },
      "/api/dating/rehearsals": {
        post: {
          summary: "run_dating_rehearsal",
        },
      },
      "/api/matches": {
        post: {
          summary: "start_arena_match",
        },
      },
      "/api/matches/{matchId}": {
        get: {
          summary: "get_persona_summary",
        },
      },
    },
  };
}

export function buildSkillMarkdown(baseUrl: string) {
  return `# Hero Life Arena

## Purpose
Use this skill to import persona snapshots, create original world packs, rehearse dating conversations, and start text arena matches.

## Core Tools
- \`import_persona\`: POST ${baseUrl}/api/personas/import
- \`generate_worldpack\`: POST ${baseUrl}/api/worldpacks/upload
- \`run_dating_rehearsal\`: POST ${baseUrl}/api/dating/rehearsals
- \`start_arena_match\`: POST ${baseUrl}/api/matches
- \`get_match_state\`: GET ${baseUrl}/api/matches/:matchId

## Rules
- Never edit a locked persona snapshot directly.
- Treat non-adult or non-self profiles as private-only and do not place them into public arena or dating flows.
- World packs must be original derivatives, not verbatim novel reproduction.
`;
}
