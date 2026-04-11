"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { pickLocale, type Locale } from "@/lib/i18n";
import type { PersonaOverlay, PersonaSnapshot, UserRecord } from "@/lib/types";

type Props = {
  locale: Locale;
  user: UserRecord;
  persona: PersonaSnapshot | null;
  overlay: PersonaOverlay | null;
};

export function QuickBindModal({ locale, user, persona, overlay }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    nickname: "新分身",
    socialStyle: "warm",
    pace: "balanced",
    logic: "mixed",
  });
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  useEffect(() => {
    if (!persona) {
      setOpen(true);
    }
  }, [persona]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-quick-bind", handler);
    return () => window.removeEventListener("open-quick-bind", handler);
  }, []);

  async function bindAiliangbiao() {
    setStatus("");
    try {
      const response = await fetch("/api/bind/ailiangbiao/complete", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || t("Binding failed", "绑定失败"));
      }
      setStatus(t("AIliangbiao persona imported.", "AIliangbiao 画像已导入。"));
      startTransition(() => router.refresh());
      setOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("Binding failed", "绑定失败"));
    }
  }

  async function createQuickPersona() {
    setStatus("");
    try {
      const response = await fetch("/api/personas/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || t("Quick persona failed", "快速画像生成失败"));
      }
      setStatus(t("Temporary persona generated.", "临时画像已生成。"));
      startTransition(() => router.refresh());
      setOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("Quick persona failed", "快速画像生成失败"));
    }
  }

  return (
    <>
      <button className="market-profile-pill" type="button" onClick={() => setOpen(true)}>
        <span className="market-profile-pill__dot" />
        {persona ? (persona.dataGhost?.displayAlias || persona.name) : t("Quick Bind", "快速绑定")}
      </button>

      {open ? (
        <div className="market-modal">
          <div className="market-modal__backdrop" onClick={() => setOpen(false)} />
          <div className="market-modal__panel">
            <button className="market-modal__close" type="button" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </button>
            <p className="section-kicker">{t("Quick Bind", "快速绑定")}</p>
            <h2 className="section-title" style={{ fontSize: "1.8rem" }}>
              {persona ? t("Your persona drawer", "你的画像抽屉") : t("Start with a persona", "先拥有一个画像再开始逛市场")}
            </h2>
            <p className="muted">
              {persona
                ? t(
                    "This drawer keeps persona management lightweight. The main market stays focused on matching and chat.",
                    "这个抽屉把画像管理收进了次级入口，让首页始终聚焦在配对和聊天。"
                  )
                : t(
                    "Choose the fastest path: import from AIliangbiao or answer three tiny questions to mint a temporary persona.",
                    "请选择最快的方式：从 AIliangbiao 导入，或者回答 3 个极简问题生成临时画像。"
                  )}
            </p>

            {persona ? (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="stack small">
                  <strong>{persona.name}</strong>
                  <div>{persona.publicTraitTags.slice(0, 3).join(" / ")}</div>
                  <div>{overlay?.publicBio || overlay?.resumeSummary || t("No overlay yet", "还没有外层画像")}</div>
                  <div>
                    {t("Wallet", "钱包")}: {t("Renown", "声望")} {user.wallet.renown} · {t("Diamonds", "钻石")} {user.wallet.diamonds}
                  </div>
                </div>
                <div className="actions" style={{ marginTop: 16 }}>
                  <Link className="btn-secondary" href="/personas">
                    {t("Open Persona Vault", "打开主角库")}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="actions" style={{ marginTop: 16 }}>
                  <button className="btn" disabled={isPending} onClick={() => void bindAiliangbiao()}>
                    {t("Import From AIliangbiao", "从 AIliangbiao 导入")}
                  </button>
                </div>

                <div className="card" style={{ marginTop: 16 }}>
                  <strong>{t("3-question quick test", "3 题极简测试")}</strong>
                  <div className="stack" style={{ marginTop: 12 }}>
                    <label className="label">
                      {t("Nickname", "昵称")}
                      <input
                        className="field"
                        value={form.nickname}
                        onChange={(event) => setForm((prev) => ({ ...prev, nickname: event.target.value }))}
                      />
                    </label>
                    <label className="label">
                      {t("Social style", "社交风格")}
                      <select
                        className="select"
                        value={form.socialStyle}
                        onChange={(event) => setForm((prev) => ({ ...prev, socialStyle: event.target.value }))}
                      >
                        <option value="warm">{t("Warm", "热情")}</option>
                        <option value="quiet">{t("Quiet", "安静")}</option>
                        <option value="playful">{t("Playful", "调皮")}</option>
                      </select>
                    </label>
                    <label className="label">
                      {t("Relationship pace", "关系节奏")}
                      <select
                        className="select"
                        value={form.pace}
                        onChange={(event) => setForm((prev) => ({ ...prev, pace: event.target.value }))}
                      >
                        <option value="slow">{t("Slow", "慢速")}</option>
                        <option value="balanced">{t("Balanced", "平衡")}</option>
                        <option value="fast">{t("Fast", "快速")}</option>
                      </select>
                    </label>
                    <label className="label">
                      {t("Decision mode", "决策偏好")}
                      <select
                        className="select"
                        value={form.logic}
                        onChange={(event) => setForm((prev) => ({ ...prev, logic: event.target.value }))}
                      >
                        <option value="heart">{t("Heart", "感受")}</option>
                        <option value="mixed">{t("Mixed", "混合")}</option>
                        <option value="logic">{t("Logic", "逻辑")}</option>
                      </select>
                    </label>
                  </div>
                  <div className="actions" style={{ marginTop: 16 }}>
                    <button className="btn-secondary" disabled={isPending} onClick={() => void createQuickPersona()}>
                      {t("Mint Temporary Persona", "生成临时画像")}
                    </button>
                  </div>
                </div>
              </>
            )}

            {status ? <div className="small muted" style={{ marginTop: 16 }}>{status}</div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
