import { updateDb } from "@/lib/db";
import { formatWebhookAccepted, verifyWebhookSignature } from "@/lib/agentpit";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("X-AgentPit-Signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = JSON.parse(raw) as { id?: string; type?: string };

  void updateDb((db) => {
    if (!body.id || !body.type) {
      return;
    }

    const exists = db.webhooks.some((item) => item.eventId === body.id);
    if (!exists) {
      db.webhooks.unshift(formatWebhookAccepted(body.id, body.type));
    }
  });

  return new Response(JSON.stringify({ accepted: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
