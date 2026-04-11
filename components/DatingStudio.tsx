"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { datingModeCatalog } from "@/lib/catalog";
import { pickLocale, type Locale } from "@/lib/i18n";
import type { DatingDossier, PersonaOverlay, PersonaSnapshot } from "@/lib/types";

type Props = {
  locale: Locale;
  personas: PersonaSnapshot[];
  dossiers: DatingDossier[];
  overlays: PersonaOverlay[];
};

export function DatingStudio({ locale, personas, dossiers, overlays }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [personaId, setPersonaId] = useState(personas[0]?.id || "");
  const [resumeText, setResumeText] = useState("");
  const [selectedDossierId, setSelectedDossierId] = useState(dossiers[0]?.id || "");
  const [modeId, setModeId] = useState(datingModeCatalog[0].id);
  const [prompt, setPrompt] = useState("I want to open strong without sounding rehearsed.");
  const [rehearsal, setRehearsal] = useState<null | { analysis: string[]; script: string[]; mode: { label: string } }>(null);
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  async function createNewDossier() {
    setStatus("");
    try {
      const response = await fetch("/api/dating/dossiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, resumeText }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("Failed to create dossier", "生成相亲档案失败"));
      setStatus(t("Dating dossier distilled from your resume overlay.", "系统已经根据你的履历外层提炼出相亲档案。"));
      setSelectedDossierId(payload.dossier.id);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("Failed to create dossier", "生成相亲档案失败"));
    }
  }

  async function runRehearsal() {
    setStatus("");
    try {
      const response = await fetch("/api/dating/rehearsals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, dossierId: selectedDossierId, modeId, prompt, locale }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("Failed to run rehearsal", "排练失败"));
      setRehearsal(payload);
      setStatus(t("Tarot rehearsal loaded.", "塔罗排练已加载。"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("Failed to run rehearsal", "排练失败"));
    }
  }

  return (
    <div className="grid-list">
      <section className="glass-panel">
        <p className="section-kicker">{t("Dating Dossier", "相亲档案")}</p>
        <h2 className="section-title">{t("Upload a resume, extract style, practice the encounter", "上传简历，提炼气质，再排练这场相遇")}</h2>
        <div className="two-col">
          <div className="stack">
            <div>
              <label className="label">{t("Adult SELF Persona", "成年本人主角")}</label>
              <select className="select" value={personaId} onChange={(event) => setPersonaId(event.target.value)}>
                {personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>{persona.name}</option>
                ))}
              </select>
            </div>
            <div className="card">
              <strong>{t("Overlay Signals", "外层画像信号")}</strong>
              <div className="stack small">
                {overlays.filter((overlay) => overlay.personaId === personaId).map((overlay) => (
                  <div key={overlay.id}>{overlay.publicBio || overlay.resumeSummary || t("No overlay yet", "暂时没有外层画像")}</div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label">{t("Resume / Profile Text", "简历 / 个人介绍文本")}</label>
            <textarea
              className="textarea"
              value={resumeText}
              onChange={(event) => setResumeText(event.target.value)}
              placeholder={t(
                "Paste your resume, short self-summary, or profile notes. Original upload is cached for 24 hours only.",
                "粘贴你的简历、简介或个人备注。原始上传内容只会缓存 24 小时。"
              )}
            />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn" disabled={isPending} onClick={() => void createNewDossier()}>
            {t("Distill Dating Dossier", "提炼相亲档案")}
          </button>
        </div>
      </section>

      <section className="glass-panel">
        <p className="section-kicker">{t("Tarot Table", "塔罗桌")}</p>
        <h2 className="section-title">{t("Real rehearsal, blindbox legend, or fictional extreme", "真实陪练、盲盒名人局或虚构极端局")}</h2>
        <div className="two-col">
          <div className="stack">
            <div>
              <label className="label">{t("Dossier", "档案")}</label>
              <select className="select" value={selectedDossierId} onChange={(event) => setSelectedDossierId(event.target.value)}>
                {dossiers.map((dossier) => (
                  <option key={dossier.id} value={dossier.id}>{dossier.id.slice(0, 16)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("Mode", "模式")}</label>
              <select className="select" value={modeId} onChange={(event) => setModeId(event.target.value)}>
                {datingModeCatalog.map((mode) => (
                  <option key={mode.id} value={mode.id}>{pickLocale(locale, mode.label, mode.label === "Real Rehearsal" ? "真实陪练" : mode.label === "Legend Blindbox" ? "盲盒名人局" : "虚构极端局")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("Prompt", "输入提示")}</label>
              <textarea className="textarea" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            </div>
            <div className="actions">
              <button className="btn-secondary" disabled={isPending} onClick={() => void runRehearsal()}>
                {t("Run Tarot Rehearsal", "开始塔罗排练")}
              </button>
            </div>
            {status ? <p className="small muted">{status}</p> : null}
          </div>

          <div className="tarot-grid">
            <div className="tarot-card">
              <div className="badge">{t("Your Card", "你的底牌")}</div>
              <h3 className="section-title" style={{ fontSize: "1.2rem" }}>{t("Locked self + overlay", "锁定自我 + 外层画像")}</h3>
              <p className="muted small">{t("Your line should feel like a person, not like a prompt template.", "你的开场应该像一个人，而不是一个模板。")}</p>
            </div>
            <div className="spark-column"><div className="badge">{t("Spark", "火花")}</div></div>
            <div className="tarot-card">
              <div className="badge">{t("Counterpart Card", "对方底牌")}</div>
              <h3 className="section-title" style={{ fontSize: "1.2rem" }}>{t("Opposing persona", "对位人格")}</h3>
              <p className="muted small">{t("The rehearsal engine picks the pressure source and teaches you where the tension lives.", "排练引擎会指出压力源，并告诉你张力藏在哪里。")}</p>
            </div>
          </div>
        </div>

        {rehearsal ? (
          <div className="stack" style={{ marginTop: 22 }}>
            <div className="card">
              <strong>
                {pickLocale(
                  locale,
                  rehearsal.mode.label,
                  rehearsal.mode.label === "Real Rehearsal"
                    ? "真实陪练"
                    : rehearsal.mode.label === "Legend Blindbox"
                      ? "盲盒名人局"
                      : rehearsal.mode.label === "Fictional Extreme"
                        ? "虚构极端局"
                        : rehearsal.mode.label
                )}
              </strong>
              <div className="stack small" style={{ marginTop: 10 }}>
                {rehearsal.analysis.map((line) => (<div key={line}>{line}</div>))}
              </div>
            </div>
            <div className="card">
              <strong>{t("Rehearsal Script", "排练脚本")}</strong>
              <div className="stack small" style={{ marginTop: 10 }}>
                {rehearsal.script.map((line) => (<div key={line}>{line}</div>))}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
