"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { pickLocale, type Locale } from "@/lib/i18n";
import type { MemoryTrait, PersonaOverlay, PersonaSnapshot, WorldPack } from "@/lib/types";

type Props = {
  locale: Locale;
  personas: PersonaSnapshot[];
  overlays: PersonaOverlay[];
  memoryTraits: MemoryTrait[];
  worldPacks: WorldPack[];
};

export function PersonaStudioClient({ locale, personas, overlays, memoryTraits, worldPacks }: Props) {
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
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

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
          interests: [t("uploaded snapshot", "上传画像"), t("world building", "世界观探索")],
          fears: [t("being reduced to a template", "被人读成模板")],
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("Import failed", "导入失败"));
      setMessage(t("Uploaded snapshot minted into the vault.", "上传画像已经铸造成新的主角快照。"));
      setImportForm({ name: "", rawText: "", ageBand: "adult", relation: "SELF" });
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Import failed", "导入失败"));
    }
  }

  async function saveOverlay(personaId: string) {
    const form = overlayForms[personaId];
    if (!form) return;

    setMessage("");

    try {
      const response = await fetch(`/api/personas/${personaId}/overlay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("Failed to save overlay", "保存外层画像失败"));
      setMessage(t("Overlay sealed without touching the locked snapshot.", "外层画像已保存，锁定快照没有被改动。"));
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Failed to save overlay", "保存外层画像失败"));
    }
  }

  return (
    <div className="grid-list">
      <section className="glass-panel">
        <p className="section-kicker">{t("Persona Mint", "主角铸造")}</p>
        <h2 className="section-title">{t("Import a temporary snapshot when no binding exists", "未绑定时，也可以导入临时主角快照")}</h2>
        <div className="two-col">
          <div className="stack">
            <div>
              <label className="label">{t("Hero Name", "主角名")}</label>
              <input
                className="field"
                value={importForm.name}
                onChange={(event) => setImportForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={t("Clockwork Negotiator", "钟表谈判师")}
              />
            </div>
            <div className="two-col">
              <div>
                <label className="label">{t("Age Band", "年龄段")}</label>
                <select
                  className="select"
                  value={importForm.ageBand}
                  onChange={(event) => setImportForm((prev) => ({ ...prev, ageBand: event.target.value }))}
                >
                  <option value="adult">{t("adult", "成人")}</option>
                  <option value="teen">{t("teen", "青少年")}</option>
                  <option value="child">{t("child", "儿童")}</option>
                </select>
              </div>
              <div>
                <label className="label">{t("Relation", "关系")}</label>
                <select
                  className="select"
                  value={importForm.relation}
                  onChange={(event) => setImportForm((prev) => ({ ...prev, relation: event.target.value }))}
                >
                  <option value="SELF">{t("SELF", "本人")}</option>
                  <option value="OTHER">{t("OTHER", "其他")}</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="label">{t("Snapshot Draft", "快照草稿")}</label>
            <textarea
              className="textarea"
              value={importForm.rawText}
              onChange={(event) => setImportForm((prev) => ({ ...prev, rawText: event.target.value }))}
              placeholder={t(
                "Describe the personality, tone, fears, and strange spark of this hero. This becomes an uploaded temporary snapshot with a 7-day TTL.",
                "描述这个主角的性格、语气、恐惧和奇异火花。系统会把它铸造成一个 7 天有效的临时上传快照。"
              )}
            />
          </div>
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn" disabled={isPending} onClick={() => void submitImport()}>
            {t("Mint Upload Snapshot", "铸造上传快照")}
          </button>
        </div>
        {message ? <p className="small muted">{message}</p> : null}
      </section>

      <section className="glass-panel">
        <p className="section-kicker">{t("Locked DNA", "锁定 DNA")}</p>
        <h2 className="section-title">{t("User-owned personas", "我的主角画像")}</h2>
        <div className="grid-list">
          {userOwned.map((persona) => {
            const overlay = overlayForms[persona.id];
            const inherited = memoryTraits.filter((item) => item.personaId === persona.id);

            return (
              <div key={persona.id} className="card">
                <div className="two-col">
                  <div className="stack">
                    <div className="badge">{persona.source.toUpperCase()} {t("source", "来源")}</div>
                    <h3 className="section-title" style={{ fontSize: "1.55rem" }}>
                      {persona.deletedAt ? t("[Destroyed Data Ghost]", "[已销毁的数据幽灵]") : persona.name}
                    </h3>
                    <p className="muted">
                      {t("Locked Hash", "锁定哈希")} {persona.lockedHash.slice(0, 12)}... | {t("Expires", "过期时间")}{" "}
                      {new Date(persona.expiresAt).toLocaleDateString()}
                    </p>
                    <div className="pill-row">
                      {persona.publicTraitTags.map((tag) => (
                        <span key={tag} className="pill">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="stack small">
                      <div>{t("Interests", "兴趣")}: {persona.interests.join(", ") || t("none", "无")}</div>
                      <div>{t("Fears", "恐惧")}: {persona.fears.join(", ") || t("none", "无")}</div>
                      <div>{t("Career Tilt", "职业倾向")}: {persona.careerTilt}</div>
                      <div className={persona.adultOnlyEligible ? "success" : "danger"}>
                        {persona.adultOnlyEligible
                          ? t("Eligible for public arena + dating", "可进入公开竞技与相亲模式")
                          : t("Private only. Kept out of public arena and dating.", "仅限私密模式，不进入公开竞技与相亲。")}
                      </div>
                    </div>
                  </div>

                  <div className="stack">
                    <div>
                      <label className="label">{t("Resume Overlay", "履历外层")}</label>
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
                      <label className="label">{t("Public Bio", "公开传记")}</label>
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
                        {t("Save Overlay", "保存外层画像")}
                      </button>
                    </div>
                    {inherited.length ? (
                      <div className="stack">
                        <strong>{t("Memory Traits", "记忆碎片")}</strong>
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
        <p className="section-kicker">{t("Forge Hooks", "延伸能力")}</p>
        <h2 className="section-title">{t("Quick links into downstream systems", "向下游玩法延伸的关键钩子")}</h2>
        <div className="three-col">
          <div className="card">
            <strong>{t("World Packs Ready", "已就绪世界包")}</strong>
            <p className="muted small">
              {t(
                `${worldPacks.length} sanitized worlds available for chapter generation.`,
                `当前有 ${worldPacks.length} 个已清洗世界包可用于章节生成。`
              )}
            </p>
          </div>
          <div className="card">
            <strong>{t("Legacy Inheritance", "世代继承")}</strong>
            <p className="muted small">
              {t(
                `${memoryTraits.length} memory traits recorded for future descendants.`,
                `当前记录了 ${memoryTraits.length} 个记忆碎片，供下一代主角继承。`
              )}
            </p>
          </div>
          <div className="card">
            <strong>{t("No Direct Edits", "不可直接改底座")}</strong>
            <p className="muted small">
              {t("All changeable flavor lives in Overlay. Locked DNA stays immutable.", "所有可改风味都在 Overlay 层，锁定 DNA 永远保持不可变。")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
