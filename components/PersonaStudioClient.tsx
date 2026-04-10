"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { MemoryTrait, PersonaOverlay, PersonaSnapshot, WorldPack } from "@/lib/types";

type Props = {
  personas: PersonaSnapshot[];
  overlays: PersonaOverlay[];
  memoryTraits: MemoryTrait[];
  worldPacks: WorldPack[];
};

export function PersonaStudioClient({ personas, overlays, memoryTraits, worldPacks }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [importForm, setImportForm] = useState({
    name: "",
    rawText: "",
    ageBand: "adult",
    relation: "SELF",
  });
  const [overlayForms, setOverlayForms] = useState<Record<string, PersonaOverlay | undefined>>(
    Object.fromEntries(personas.map((persona) => [persona.id, overlays.find((overlay) => overlay.personaId === persona.id)]))
  );

  const userOwned = useMemo(() => personas.filter((persona) => persona.source !== "legend"), [personas]);

  async function submitImport() {
    setMessage("");
    try {
      const response = await fetch("/api/personas/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "upload",
          name: importForm.name,
          rawText: importForm.rawText,
          ageBand: importForm.ageBand,
          relation: importForm.relation,
          interests: ["上传画像", "世界观探索"],
          fears: ["被人读成模板"],
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Import failed");
      }
      setMessage("Uploaded snapshot minted into the vault.");
      setImportForm({ name: "", rawText: "", ageBand: "adult", relation: "SELF" });
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    }
  }

  async function saveOverlay(personaId: string) {
    const form = overlayForms[personaId];
    if (!form) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(`/api/personas/${personaId}/overlay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save overlay");
      }
      setMessage("Overlay sealed without touching the locked snapshot.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save overlay");
    }
  }

  return (
    <div className="grid-list">
      <section className="glass-panel">
        <p className="section-kicker">Persona Mint</p>
        <h2 className="section-title">Import a temporary snapshot when no binding exists</h2>
        <div className="two-col">
          <div className="stack">
            <div>
              <label className="label">Hero Name</label>
              <input
                className="field"
                value={importForm.name}
                onChange={(event) => setImportForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Clockwork Negotiator"
              />
            </div>
            <div className="two-col">
              <div>
                <label className="label">Age Band</label>
                <select
                  className="select"
                  value={importForm.ageBand}
                  onChange={(event) => setImportForm((prev) => ({ ...prev, ageBand: event.target.value }))}
                >
                  <option value="adult">adult</option>
                  <option value="teen">teen</option>
                  <option value="child">child</option>
                </select>
              </div>
              <div>
                <label className="label">Relation</label>
                <select
                  className="select"
                  value={importForm.relation}
                  onChange={(event) => setImportForm((prev) => ({ ...prev, relation: event.target.value }))}
                >
                  <option value="SELF">SELF</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="label">Snapshot Draft</label>
            <textarea
              className="textarea"
              value={importForm.rawText}
              onChange={(event) => setImportForm((prev) => ({ ...prev, rawText: event.target.value }))}
              placeholder="Describe the personality, tone, fears, and weird spark of this hero. This becomes an uploaded temporary snapshot with a 7-day TTL."
            />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn" disabled={isPending} onClick={() => void submitImport()}>
            Mint Upload Snapshot
          </button>
        </div>
        {message ? <p className="small muted">{message}</p> : null}
      </section>

      <section className="glass-panel">
        <p className="section-kicker">Locked DNA</p>
        <h2 className="section-title">User-owned personas</h2>
        <div className="grid-list">
          {userOwned.map((persona) => {
            const overlay = overlayForms[persona.id];
            const inherited = memoryTraits.filter((item) => item.personaId === persona.id);

            return (
              <div key={persona.id} className="card">
                <div className="two-col">
                  <div className="stack">
                    <div className="badge">{persona.source.toUpperCase()} source</div>
                    <h3 className="section-title" style={{ fontSize: "1.55rem" }}>
                      {persona.deletedAt ? "[Destroyed Data Ghost]" : persona.name}
                    </h3>
                    <p className="muted">
                      Locked Hash {persona.lockedHash.slice(0, 12)}... | Expires {new Date(persona.expiresAt).toLocaleDateString()}
                    </p>
                    <div className="pill-row">
                      {persona.publicTraitTags.map((tag) => (
                        <span key={tag} className="pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="stack small">
                      <div>Interests: {persona.interests.join(", ") || "none"}</div>
                      <div>Fears: {persona.fears.join(", ") || "none"}</div>
                      <div>Career Tilt: {persona.careerTilt}</div>
                      <div className={persona.adultOnlyEligible ? "success" : "danger"}>
                        {persona.adultOnlyEligible
                          ? "Eligible for public arena + dating"
                          : "Private only. Kept out of public arena and dating."}
                      </div>
                    </div>
                  </div>

                  <div className="stack">
                    <div>
                      <label className="label">Resume Overlay</label>
                      <textarea
                        className="textarea"
                        value={overlay?.resumeSummary || ""}
                        onChange={(event) =>
                          setOverlayForms((prev) => ({
                            ...prev,
                            [persona.id]: {
                              id: prev[persona.id]?.id || "",
                              personaId: persona.id,
                              resumeSummary: event.target.value,
                              publicBio: prev[persona.id]?.publicBio || "",
                              datingPreferences: prev[persona.id]?.datingPreferences || [],
                              visualSkin: prev[persona.id]?.visualSkin || "fortune-ink",
                              tonePreset: prev[persona.id]?.tonePreset || "measured-poetic",
                              privacyLevel: prev[persona.id]?.privacyLevel || "public",
                              updatedAt: prev[persona.id]?.updatedAt || "",
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Public Bio</label>
                      <textarea
                        className="textarea"
                        value={overlay?.publicBio || ""}
                        onChange={(event) =>
                          setOverlayForms((prev) => ({
                            ...prev,
                            [persona.id]: {
                              id: prev[persona.id]?.id || "",
                              personaId: persona.id,
                              resumeSummary: prev[persona.id]?.resumeSummary || "",
                              publicBio: event.target.value,
                              datingPreferences: prev[persona.id]?.datingPreferences || [],
                              visualSkin: prev[persona.id]?.visualSkin || "fortune-ink",
                              tonePreset: prev[persona.id]?.tonePreset || "measured-poetic",
                              privacyLevel: prev[persona.id]?.privacyLevel || "public",
                              updatedAt: prev[persona.id]?.updatedAt || "",
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="actions">
                      <button className="btn-secondary" disabled={isPending} onClick={() => void saveOverlay(persona.id)}>
                        Save Overlay
                      </button>
                    </div>
                    {inherited.length ? (
                      <div className="stack">
                        <strong>Memory Traits</strong>
                        {inherited.map((memory) => (
                          <div key={memory.id} className="pill">
                            {memory.name} · {memory.summary}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass-panel">
        <p className="section-kicker">Forge Hooks</p>
        <h2 className="section-title">Quick links into downstream systems</h2>
        <div className="three-col">
          <div className="card">
            <strong>World Packs Ready</strong>
            <p className="muted small">{worldPacks.length} sanitized worlds available for chapter generation.</p>
          </div>
          <div className="card">
            <strong>Legacy Inheritance</strong>
            <p className="muted small">{memoryTraits.length} memory traits recorded for future descendants.</p>
          </div>
          <div className="card">
            <strong>No Direct Edits</strong>
            <p className="muted small">All changeable flavor lives in Overlay. Locked DNA stays immutable.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
