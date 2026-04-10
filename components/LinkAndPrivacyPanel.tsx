"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function LinkAndPrivacyPanel() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  async function runAction(url: string, successText: string) {
    setStatus("");

    try {
      const response = await fetch(url, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Request failed");
      }
      setStatus(successText);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Request failed");
    }
  }

  return (
    <div className="stack">
      <div className="actions">
        <button
          className="btn"
          disabled={isPending}
          onClick={() => void runAction("/api/bind/ailiangbiao/complete", "AIliangbiao prototype profiles linked.")}
        >
          Link AIliangbiao Prototype
        </button>
        <a className="btn-secondary" href="/api/auth/agentpit/login">
          AgentPit OAuth
        </a>
        <button
          className="btn-ghost"
          disabled={isPending}
          onClick={() => void runAction("/api/privacy/delete-me", "Your local demo data has been ghosted.")}
        >
          Request Erasure
        </button>
      </div>
      {status ? <div className="small muted">{status}</div> : null}
    </div>
  );
}
