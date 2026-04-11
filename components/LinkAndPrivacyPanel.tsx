"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { pickLocale, type Locale } from "@/lib/i18n";

export function LinkAndPrivacyPanel({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  async function runAction(url: string, successText: string) {
    setStatus("");

    try {
      const response = await fetch(url, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || t("Request failed", "请求失败"));
      }
      setStatus(successText);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("Request failed", "请求失败"));
    }
  }

  return (
    <div className="stack">
      <div className="actions">
        <button
          className="btn"
          disabled={isPending}
          onClick={() =>
            void runAction(
              "/api/bind/ailiangbiao/complete",
              t("AIliangbiao prototype profiles linked.", "AIliangbiao 原型画像已完成绑定。")
            )
          }
        >
          {t("Link AIliangbiao Prototype", "绑定 AIliangbiao 原型数据")}
        </button>
        <a className="btn-secondary" href="/api/auth/agentpit/login">
          {t("AgentPit OAuth", "AgentPit 授权登录")}
        </a>
        <button
          className="btn-ghost"
          disabled={isPending}
          onClick={() =>
            void runAction(
              "/api/privacy/delete-me",
              t("Your local demo data has been ghosted.", "你的本地演示数据已经进入幽灵化删除流程。")
            )
          }
        >
          {t("Request Erasure", "申请删除数据")}
        </button>
      </div>
      {status ? <div className="small muted">{status}</div> : null}
    </div>
  );
}
