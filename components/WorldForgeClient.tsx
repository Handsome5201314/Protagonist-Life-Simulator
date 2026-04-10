"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import type { ScratchUpload, WorldPack } from "@/lib/types";

type Props = {
  worldPacks: WorldPack[];
  uploads: ScratchUpload[];
};

export function WorldForgeClient({ worldPacks, uploads }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function submitWorld() {
    setStatus("");

    try {
      const formData = new FormData();
      formData.append("title", title || "Untitled World");
      formData.append("text", text);

      const file = fileRef.current?.files?.[0];
      if (file) {
        formData.append("file", file);
      }

      const response = await fetch("/api/worldpacks/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Upload failed");
      }
      setStatus("World pack distilled into a safe original arena.");
      setTitle("");
      setText("");
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    }
  }

  async function sanitizeWorld(worldId: string) {
    setStatus("");

    try {
      const response = await fetch(`/api/worldpacks/${worldId}/sanitize`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Sanitize failed");
      }
      setStatus("World pack re-sanitized with guardrail cleaning.");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sanitize failed");
    }
  }

  return (
    <div className="grid-list">
      <section className="glass-panel">
        <p className="section-kicker">Original Universe Distiller</p>
        <h2 className="section-title">Upload a beloved novel, keep the atmosphere, lose the prompt injection</h2>
        <div className="two-col">
          <div className="stack">
            <div>
              <label className="label">World Title</label>
              <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div>
              <label className="label">Optional File</label>
              <input ref={fileRef} className="field" type="file" />
            </div>
          </div>
          <div>
            <label className="label">Source Excerpt / Notes</label>
            <textarea
              className="textarea"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste the setting, factions, vibe, and conflict. The guardrail strips instructions and keeps atmosphere."
            />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn" disabled={isPending} onClick={() => void submitWorld()}>
            Distill World Pack
          </button>
        </div>
        {status ? <p className="small muted">{status}</p> : null}
      </section>

      <section className="glass-panel">
        <p className="section-kicker">Forged Worlds</p>
        <h2 className="section-title">Private universes ready for arena and dating scripts</h2>
        <div className="grid-list">
          {worldPacks.map((world) => (
            <div key={world.id} className="card">
              <div className="two-col">
                <div className="stack">
                  <div className="badge">{world.derivedFrom === "curated" ? "Curated" : "Upload-derived"}</div>
                  <h3 className="section-title" style={{ fontSize: "1.5rem" }}>
                    {world.title}
                  </h3>
                  <p className="muted">{world.sanitizedSummary}</p>
                  <div className="pill-row">
                    {world.factions.map((faction) => (
                      <span key={faction} className="pill">
                        {faction}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="stack">
                  <div>
                    <strong>Tone</strong>
                    <p className="muted small">{world.tone}</p>
                  </div>
                  <div>
                    <strong>Conflicts</strong>
                    <p className="muted small">{world.conflicts.join(" / ")}</p>
                  </div>
                  <div>
                    <strong>Taboo Rules</strong>
                    <p className="muted small">{world.tabooRules.join(" / ")}</p>
                  </div>
                  <div className={world.safetyStatus === "warned" ? "danger small" : "success small"}>
                    Safety {world.safetyStatus}
                  </div>
                  <div className="actions">
                    <button className="btn-ghost" disabled={isPending} onClick={() => void sanitizeWorld(world.id)}>
                      Re-sanitize
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel">
        <p className="section-kicker">Upload Cache</p>
        <h2 className="section-title">24-hour scratch storage</h2>
        <table className="table-lite">
          <thead>
            <tr>
              <th>Kind</th>
              <th>Name</th>
              <th>Delete After</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((upload) => (
              <tr key={upload.id}>
                <td>{upload.kind}</td>
                <td>{upload.originalName}</td>
                <td>{new Date(upload.deleteAfter).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
