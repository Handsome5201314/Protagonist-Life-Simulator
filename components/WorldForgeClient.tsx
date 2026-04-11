"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { pickLocale, type Locale } from "@/lib/i18n";
import type { ScratchUpload, WorldPack } from "@/lib/types";

type Props = {
  locale: Locale;
  worldPacks: WorldPack[];
  uploads: ScratchUpload[];
};

export function WorldForgeClient({ locale, worldPacks, uploads }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  async function submitWorld() {
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("title", title || t("Untitled World", "未命名世界"));
      formData.append("text", text);
      formData.append("locale", locale);
      const file = fileRef.current?.files?.[0];
      if (file) formData.append("file", file);

      const response = await fetch("/api/worldpacks/upload", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("Upload failed", "上传失败"));
      setStatus(t("World pack distilled into a safe original arena.", "世界包已经被提炼成安全的原创舞台。"));
      setTitle("");
      setText("");
      if (fileRef.current) fileRef.current.value = "";
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("Upload failed", "上传失败"));
    }
  }

  async function sanitizeWorld(worldId: string) {
    setStatus("");
    try {
      const response = await fetch(`/api/worldpacks/${worldId}/sanitize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("Sanitize failed", "重清洗失败"));
      setStatus(t("World pack re-sanitized with guardrail cleaning.", "世界包已完成新一轮护栏清洗。"));
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("Sanitize failed", "重清洗失败"));
    }
  }

  return (
    <div className="grid-list">
      <section className="glass-panel">
        <p className="section-kicker">{t("Original Universe Distiller", "原创宇宙蒸馏器")}</p>
        <h2 className="section-title">
          {t(
            "Upload a beloved novel, keep the atmosphere, lose the prompt injection",
            "上传你喜欢的小说，保留世界气味，剥离提示词注入"
          )}
        </h2>
        <div className="two-col">
          <div className="stack">
            <div>
              <label className="label">{t("World Title", "世界名称")}</label>
              <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div>
              <label className="label">{t("Optional File", "可选文件")}</label>
              <input ref={fileRef} className="field" type="file" />
            </div>
          </div>
          <div>
            <label className="label">{t("Source Excerpt / Notes", "原文摘录 / 设定备注")}</label>
            <textarea
              className="textarea"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t(
                "Paste the setting, factions, vibe, and conflict. The guardrail strips instructions and keeps atmosphere.",
                "粘贴设定、阵营、氛围和冲突。护栏会清除指令式污染，只保留世界氛围。"
              )}
            />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn" disabled={isPending} onClick={() => void submitWorld()}>
            {t("Distill World Pack", "提炼世界包")}
          </button>
        </div>
        {status ? <p className="small muted">{status}</p> : null}
      </section>

      <section className="glass-panel">
        <p className="section-kicker">{t("Forged Worlds", "已锻造世界")}</p>
        <h2 className="section-title">{t("Private universes ready for arena and dating scripts", "已可用于竞技和相亲脚本的私人宇宙")}</h2>
        <div className="grid-list">
          {worldPacks.map((world) => (
            <div key={world.id} className="card">
              <div className="two-col">
                <div className="stack">
                  <div className="badge">{world.derivedFrom === "curated" ? t("Curated", "官方预设") : t("Upload-derived", "上传衍生")}</div>
                  <h3 className="section-title" style={{ fontSize: "1.5rem" }}>{world.title}</h3>
                  <p className="muted">{world.sanitizedSummary}</p>
                  <div className="pill-row">
                    {world.factions.map((faction) => (
                      <span key={faction} className="pill">{faction}</span>
                    ))}
                  </div>
                </div>
                <div className="stack">
                  <div><strong>{t("Tone", "氛围")}</strong><p className="muted small">{world.tone}</p></div>
                  <div><strong>{t("Conflicts", "冲突")}</strong><p className="muted small">{world.conflicts.join(" / ")}</p></div>
                  <div><strong>{t("Taboo Rules", "禁忌规则")}</strong><p className="muted small">{world.tabooRules.join(" / ")}</p></div>
                  <div className={world.safetyStatus === "warned" ? "danger small" : "success small"}>
                    {t("Safety", "安全状态")} {world.safetyStatus}
                  </div>
                  <div className="actions">
                    <button className="btn-ghost" disabled={isPending} onClick={() => void sanitizeWorld(world.id)}>
                      {t("Re-sanitize", "重新清洗")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel">
        <p className="section-kicker">{t("Upload Cache", "上传缓存")}</p>
        <h2 className="section-title">{t("24-hour scratch storage", "24 小时临时缓存")}</h2>
        <table className="table-lite">
          <thead>
            <tr>
              <th>{t("Kind", "类型")}</th>
              <th>{t("Name", "名称")}</th>
              <th>{t("Delete After", "删除时间")}</th>
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
