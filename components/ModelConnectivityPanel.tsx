"use client";

import { useState } from "react";

import { pickLocale, type Locale } from "@/lib/i18n";

type ResultShape = {
  configured?: boolean;
  ok?: boolean;
  baseUrl?: string;
  model?: string;
  visionModel?: string;
  latencyMs?: number;
  preview?: string;
  error?: string;
  apiKeyPreview?: string;
};

export function ModelConnectivityPanel({ locale }: { locale: Locale }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultShape | null>(null);
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  async function runTest() {
    setLoading(true);
    try {
      const response = await fetch("/api/llm/health", { method: "POST" });
      const payload = (await response.json()) as ResultShape;
      setResult(payload);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel">
      <p className="section-kicker">{t("Model Admin", "模型后台")}</p>
      <h2 className="section-title">{t("Gemini connectivity", "Gemini 连通性测试")}</h2>
      <p className="subheadline">
        {t(
          "Run a live One-API connectivity probe and inspect the configured gateway, models, latency, and returned preview.",
          "点击按钮后会执行一次真实的 One-API 连通性探测，并返回当前网关、模型、时延和响应预览。"
        )}
      </p>

      <div className="actions">
        <button className="btn" onClick={() => void runTest()} disabled={loading}>
          {loading ? t("Testing...", "测试中...") : t("Test Connectivity", "测试模型连通性")}
        </button>
      </div>

      {result ? (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="stack small">
            <div>{t("Configured", "已配置")}: {String(result.configured)}</div>
            <div>{t("Reachable", "可连通")}: <span className={result.ok ? "success" : "danger"}>{String(result.ok)}</span></div>
            <div>{t("Base URL", "网关地址")}: {result.baseUrl || "-"}</div>
            <div>{t("API Key", "密钥预览")}: {result.apiKeyPreview || "-"}</div>
            <div>{t("Text Model", "文本模型")}: {result.model || "-"}</div>
            <div>{t("Vision Model", "视觉模型")}: {result.visionModel || "-"}</div>
            <div>{t("Latency", "响应时延")}: {result.latencyMs ?? "-"} ms</div>
            {result.preview ? <div>{t("Preview", "返回预览")}: {result.preview}</div> : null}
            {result.error ? <div className="danger">{t("Error", "错误")}: {result.error}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
