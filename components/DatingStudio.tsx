"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { datingModeCatalog } from "@/lib/catalog";
import type { DatingDossier, PersonaOverlay, PersonaSnapshot } from "@/lib/types";

type Props = {
  personas: PersonaSnapshot[];
  dossiers: DatingDossier[];
  overlays: PersonaOverlay[];
};

export function DatingStudio({ personas, dossiers, overlays }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [personaId, setPersonaId] = useState(personas[0]?.id || "");
  const [resumeText, setResumeText] = useState("");
  const [selectedDossierId, setSelectedDossierId] = useState(dossiers[0]?.id || "");
  const [modeId, setModeId] = useState(datingModeCatalog[0].id);
  const [prompt, setPrompt] = useState("I want to open strong without sounding rehearsed.");
  const [rehearsal, setRehearsal] = useState<null | {
    analysis: string[];
    script: string[];
    mode: { label: string };
  }>(null);

  async function createNewDossier() {
    setStatus("");
    try {
      const response = await fetch("/api/dating/dossiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, resumeText }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create dossier");
      }
      setStatus("Dating dossier distilled from your resume overlay.");
      setSelectedDossierId(payload.dossier.id);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create dossier");
    }
  }

  async function runRehearsal() {
    setStatus("");
    try {
      const response = await fetch("/api/dating/rehearsals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId,
          dossierId: selectedDossierId,
          modeId,
          prompt,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to run rehearsal");
      }
      setRehearsal(payload);
      setStatus("Tarot rehearsal loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to run rehearsal");
    }
  }

  return (
    <div className="grid-list">
      <section className="glass-panel">
        <p className="section-kicker">Dating Dossier</p>
        <h2 className="section-title">Upload a resume, extract style, practice the encounter</h2>
        <div className="two-col">
          <div className="stack">
            <div>
              <label className="label">Adult SELF Persona</label>
              <select className="select" value={personaId} onChange={(event) => setPersonaId(event.target.value)}>
                {personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="card">
              <strong>Overlay Signals</strong>
              <div className="stack small">
                {overlays
                  .filter((overlay) => overlay.personaId === personaId)
                  .map((overlay) => (
                    <div key={overlay.id}>{overlay.publicBio || overlay.resumeSummary || "No overlay yet"}</div>
                  ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label">Resume / Profile Text</label>
            <textarea
              className="textarea"
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              placeholder="Paste your resume, short self-summary, or profile notes. Original upload is cached for 24 hours only."
            />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn" disabled={isPending} onClick={() => void createNewDossier()}>
            Distill Dating Dossier
          </button>
        </div>
      </section>

      <section className="glass-panel">
        <p className="section-kicker">Tarot Table</p>
        <h2 className="section-title">Real rehearsal, blindbox legend, or fictional extreme</h2>
        <div className="two-col">
          <div className="stack">
            <div>
              <label className="label">Dossier</label>
              <select className="select" value={selectedDossierId} onChange={(event) => setSelectedDossierId(event.target.value)}>
                {dossiers.map((dossier) => (
                  <option key={dossier.id} value={dossier.id}>
                    {dossier.id.slice(0, 16)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mode</label>
              <select className="select" value={modeId} onChange={(event) => setModeId(event.target.value)}>
                {datingModeCatalog.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prompt</label>
              <textarea className="textarea" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            </div>
            <div className="actions">
              <button className="btn-secondary" disabled={isPending} onClick={() => void runRehearsal()}>
                Run Tarot Rehearsal
              </button>
            </div>
            {status ? <p className="small muted">{status}</p> : null}
          </div>

          <div className="tarot-grid">
            <div className="tarot-card">
              <div className="badge">Your Card</div>
              <h3 className="section-title" style={{ fontSize: "1.2rem" }}>
                Locked self + overlay
              </h3>
              <p className="muted small">Your line should feel like a person, not like a prompt template.</p>
            </div>
            <div className="spark-column">
              <div className="badge">Spark</div>
            </div>
            <div className="tarot-card">
              <div className="badge">Counterpart Card</div>
              <h3 className="section-title" style={{ fontSize: "1.2rem" }}>
                Opposing persona
              </h3>
              <p className="muted small">
                The rehearsal engine picks the pressure source and teaches you where the tension lives.
              </p>
            </div>
          </div>
        </div>

        {rehearsal ? (
          <div className="stack" style={{ marginTop: 22 }}>
            <div className="card">
              <strong>{rehearsal.mode.label}</strong>
              <div className="stack small" style={{ marginTop: 10 }}>
                {rehearsal.analysis.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
            <div className="card">
              <strong>Rehearsal Script</strong>
              <div className="stack small" style={{ marginTop: 10 }}>
                {rehearsal.script.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
