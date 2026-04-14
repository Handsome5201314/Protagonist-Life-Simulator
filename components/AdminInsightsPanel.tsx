"use client";

import { useState, useTransition } from "react";

import { pickLocale, type Locale } from "@/lib/i18n";
import type {
  DirectorInsightSnapshot,
  GameplayConfig,
  GameplayConfigHistoryEntry,
  GameplayConfigProposal,
  TelemetrySummary,
} from "@/lib/types";

type AdminInsightsPanelProps = {
  locale: Locale;
  initialSummary: TelemetrySummary;
  initialInsight: DirectorInsightSnapshot;
  initialConfig: GameplayConfig;
  initialProposals: GameplayConfigProposal[];
  initialHistory: GameplayConfigHistoryEntry[];
};

type InsightResponse = {
  summary: TelemetrySummary;
  insight: DirectorInsightSnapshot;
  config: GameplayConfig;
  proposals: GameplayConfigProposal[];
  history: GameplayConfigHistoryEntry[];
};

type DirectorResponse = {
  answer: string;
  summary: TelemetrySummary;
};

type ConfigResponse = {
  config: GameplayConfig;
  proposals: GameplayConfigProposal[];
  summary: TelemetrySummary;
  insight: DirectorInsightSnapshot;
  history: GameplayConfigHistoryEntry[];
  error?: string;
};

const WINDOWS = [
  { hours: 72, label: "72h" },
  { hours: 168, label: "7d" },
  { hours: 336, label: "14d" },
];

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function priorityTone(priority: "now" | "next" | "watch") {
  if (priority === "now") return "border-pink-400/30 bg-pink-500/10 text-pink-100";
  if (priority === "next") return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
  return "border-white/15 bg-white/5 text-white/70";
}

function historyTone(action: "apply" | "rollback") {
  return action === "rollback"
    ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
}

export function AdminInsightsPanel({
  locale,
  initialSummary,
  initialInsight,
  initialConfig,
  initialProposals,
  initialHistory,
}: AdminInsightsPanelProps) {
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  const [summary, setSummary] = useState(initialSummary);
  const [insight, setInsight] = useState(initialInsight);
  const [config, setConfig] = useState(initialConfig);
  const [proposals, setProposals] = useState(initialProposals);
  const [history, setHistory] = useState(initialHistory);
  const [windowHours, setWindowHours] = useState(initialSummary.windowHours);
  const [question, setQuestion] = useState(
    locale === "zh"
      ? "为什么相亲房第一回合流失还高？下一步先改哪里？"
      : "Why is first-turn dating retention still weak, and what should we change first?"
  );
  const [directorAnswer, setDirectorAnswer] = useState("");
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [isRefreshing, startRefresh] = useTransition();
  const [isAsking, startAsk] = useTransition();
  const [isMutating, startMutating] = useTransition();

  function syncInsightPayload(payload: InsightResponse) {
    setSummary(payload.summary);
    setInsight(payload.insight);
    setConfig(payload.config);
    setProposals(payload.proposals);
    setHistory(payload.history);
    setWindowHours(payload.summary.windowHours);
  }

  function syncConfigPayload(payload: ConfigResponse) {
    setSummary(payload.summary);
    setInsight(payload.insight);
    setConfig(payload.config);
    setProposals(payload.proposals);
    setHistory(payload.history);
  }

  function refreshInsights(nextWindowHours: number) {
    setError("");
    startRefresh(async () => {
      try {
        const response = await fetch(`/api/admin/insights?locale=${locale}&windowHours=${nextWindowHours}&ts=${Date.now()}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as InsightResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || t("Failed to refresh insights", "刷新洞察失败"));
        }
        syncInsightPayload(payload);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : t("Unknown error", "未知错误"));
      }
    });
  }

  function askDirector() {
    setError("");
    startAsk(async () => {
      try {
        const response = await fetch("/api/admin/director", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            windowHours,
            question,
          }),
        });
        const payload = (await response.json()) as DirectorResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || t("Failed to ask director", "向 director 提问失败"));
        }
        setDirectorAnswer(payload.answer);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : t("Unknown error", "未知错误"));
      }
    });
  }

  function applyProposal(proposalId: string) {
    setError("");
    setPendingId(proposalId);
    startMutating(async () => {
      try {
        const response = await fetch("/api/admin/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "apply",
            proposalId,
            locale,
            windowHours,
          }),
        });
        const payload = (await response.json()) as ConfigResponse;
        if (!response.ok) {
          throw new Error(payload.error || t("Failed to apply patch", "应用补丁失败"));
        }
        syncConfigPayload(payload);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : t("Unknown error", "未知错误"));
      } finally {
        setPendingId("");
      }
    });
  }

  function rollbackHistory(historyId: string) {
    setError("");
    setPendingId(historyId);
    startMutating(async () => {
      try {
        const response = await fetch("/api/admin/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "rollback",
            historyId,
            locale,
            windowHours,
          }),
        });
        const payload = (await response.json()) as ConfigResponse;
        if (!response.ok) {
          throw new Error(payload.error || t("Failed to rollback config", "回滚配置失败"));
        }
        syncConfigPayload(payload);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : t("Unknown error", "未知错误"));
      } finally {
        setPendingId("");
      }
    });
  }

  return (
    <section className="glass-panel" style={{ marginTop: 24 }}>
      <div className="actions" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <p className="section-kicker">{t("Live Insights", "实时玩法洞察")}</p>
          <h2 className="section-title" style={{ fontSize: "2rem" }}>
            {t("Telemetry and director console", "遥测看板与 director 控制台")}
          </h2>
          <p className="subheadline">
            {t(
              "This view summarizes real room behavior, shows the current gameplay config, and lets you apply or roll back safe tuning patches.",
              "这里会汇总真实房间行为、展示当前玩法配置，并允许你预览、应用和回滚安全调参补丁。"
            )}
          </p>
        </div>
        <div className="actions" style={{ gap: 8 }}>
          {WINDOWS.map((option) => (
            <button
              key={option.hours}
              className={option.hours === windowHours ? "btn" : "btn-secondary"}
              onClick={() => refreshInsights(option.hours)}
              disabled={isRefreshing}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="three-col" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="small muted">{t("Arena Prep Completion", "竞技场准备完成率")}</div>
          <div className="section-title" style={{ fontSize: "1.8rem" }}>{formatPercent(summary.metrics.arenaPrepCompletionRate)}</div>
        </div>
        <div className="card">
          <div className="small muted">{t("Arena Activation Rate", "竞技场开局率")}</div>
          <div className="section-title" style={{ fontSize: "1.8rem" }}>{formatPercent(summary.metrics.arenaActivationRate)}</div>
        </div>
        <div className="card">
          <div className="small muted">{t("Dating Continuation", "相亲首轮延续率")}</div>
          <div className="section-title" style={{ fontSize: "1.8rem" }}>{formatPercent(summary.metrics.datingContinuationRate)}</div>
        </div>
      </div>

      <div className="three-col" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="small muted">{t("Second-Turn Dating Rate", "相亲二回合留存")}</div>
          <div className="section-title" style={{ fontSize: "1.8rem" }}>{formatPercent(summary.metrics.datingSecondTurnRate)}</div>
        </div>
        <div className="card">
          <div className="small muted">{t("AI Proxy Share", "AI 托管占比")}</div>
          <div className="section-title" style={{ fontSize: "1.8rem" }}>{formatPercent(summary.metrics.arenaAiProxyShare)}</div>
        </div>
        <div className="card">
          <div className="small muted">{t("Window Event Count", "窗口事件量")}</div>
          <div className="section-title" style={{ fontSize: "1.8rem" }}>{summary.totalEvents}</div>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="small muted">{t("System Read", "系统判断")}</div>
          <h3 style={{ marginTop: 8 }}>{insight.headline}</h3>
          <p className="small muted" style={{ marginTop: 12 }}>{summary.narrativeSummary}</p>
          <div className="stack small" style={{ marginTop: 16 }}>
            {insight.findings.map((finding) => (
              <div key={finding}>{finding}</div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="small muted">{t("Current Gameplay Config", "当前玩法配置")}</div>
          <div className="stack small" style={{ marginTop: 12 }}>
            <div>
              <strong>{t("Dating", "相亲")}</strong>
              <div className="small muted" style={{ marginTop: 6 }}>
                {[
                  `trust crisis: ${String(config.dating.forceTrustCrisisAfterFirstTurn)}`,
                  `tension boost: ${config.dating.tensionBoost}`,
                  `pressure: ${config.dating.environmentPressure}`,
                  `skill cost: ${config.dating.skillCostDiamonds}`,
                ].join(" / ")}
              </div>
            </div>
            <div>
              <strong>{t("Arena", "竞技场")}</strong>
              <div className="small muted" style={{ marginTop: 6 }}>
                {[
                  `default proxy: ${config.arena.defaultProxyMode}`,
                  `opening pressure: ${config.arena.openingPressureBoost}`,
                  `event intensity: ${config.arena.eventIntensity}`,
                ].join(" / ")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="small muted">{t("Hotspots", "热点分布")}</div>
          <div className="stack small" style={{ marginTop: 12 }}>
            <div>
              <strong>{t("Top arena worlds", "竞技场热门世界")}</strong>
              <div className="small muted" style={{ marginTop: 6 }}>
                {(summary.topArenaWorlds.length ? summary.topArenaWorlds : [{ label: t("No arena data yet", "暂无竞技场数据"), count: 0 }]).map((item) => `${item.label} (${item.count})`).join(" / ")}
              </div>
            </div>
            <div>
              <strong>{t("Top dating actions", "相亲热门动作")}</strong>
              <div className="small muted" style={{ marginTop: 6 }}>
                {(summary.topDatingActions.length ? summary.topDatingActions : [{ label: t("No dating data yet", "暂无相亲数据"), count: 0 }]).map((item) => `${item.label} (${item.count})`).join(" / ")}
              </div>
            </div>
            <div>
              <strong>{t("Top arena event cards", "竞技场热门事件卡")}</strong>
              <div className="small muted" style={{ marginTop: 6 }}>
                {(summary.topArenaEventCards.length ? summary.topArenaEventCards : [{ label: t("No round data yet", "暂无回合数据"), count: 0 }]).map((item) => `${item.label} (${item.count})`).join(" / ")}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="small muted">{t("Watchlist", "继续观测")}</div>
          <div className="stack small" style={{ marginTop: 12 }}>
            {insight.watchlist.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        </div>
      </div>

      <section style={{ marginTop: 18 }}>
        <p className="section-kicker">{t("Patch Preview", "补丁预览")}</p>
        <div className="grid-list" style={{ marginTop: 12 }}>
          {proposals.map((proposal) => (
            <div key={proposal.id} className="card">
              <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <strong>{proposal.title}</strong>
                <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${priorityTone(proposal.priority)}`}>
                  {proposal.priority}
                </span>
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>{proposal.reason}</p>
              <div className="stack small" style={{ marginTop: 12 }}>
                {proposal.diff.length ? (
                  proposal.diff.map((item) => (
                    <div key={`${proposal.id}-${item.path}`} className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
                      <div className="small muted">{item.path}</div>
                      <div style={{ marginTop: 6, lineHeight: 1.7 }}>
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>{String(item.before)}</span>
                        <span style={{ margin: "0 10px", color: "rgba(255,255,255,0.35)" }}>→</span>
                        <span>{String(item.after)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="small muted">{t("This recommendation is watch-only and does not include a direct patch.", "这条建议当前只做观测，不带直接补丁。")}</div>
                )}
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <button
                  className="btn"
                  onClick={() => applyProposal(proposal.id)}
                  disabled={isMutating || !proposal.diff.length}
                >
                  {isMutating && pendingId === proposal.id ? t("Applying...", "应用中...") : t("Apply Patch", "应用补丁")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <p className="section-kicker">{t("Config History", "配置历史")}</p>
        <div className="grid-list" style={{ marginTop: 12 }}>
          {history.length ? (
            history.map((entry, index) => (
              <div key={entry.id} className="card">
                <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{entry.proposalTitle || entry.reason}</strong>
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${historyTone(entry.action)}`}>
                    {entry.action}
                  </span>
                </div>
                <p className="small muted" style={{ marginTop: 8 }}>{entry.createdAt}</p>
                <p className="small muted" style={{ marginTop: 8 }}>{entry.reason}</p>
                <div className="stack small" style={{ marginTop: 12 }}>
                  {entry.diff.map((item) => (
                    <div key={`${entry.id}-${item.path}`}>
                      {item.path}: {String(item.before)} → {String(item.after)}
                    </div>
                  ))}
                </div>
                <div className="actions" style={{ marginTop: 12 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => rollbackHistory(entry.id)}
                    disabled={isMutating || index !== 0}
                  >
                    {isMutating && pendingId === entry.id ? t("Rolling Back...", "回滚中...") : t("Rollback To Before This Change", "回滚到这次变更之前")}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="card">
              <div className="small muted">{t("No config history yet.", "当前还没有配置历史。")}</div>
            </div>
          )}
        </div>
      </section>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="small muted">{t("Ask Director", "直接问 director")}</div>
        <textarea
          className="textarea"
          style={{ marginTop: 12, minHeight: 140 }}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => askDirector()} disabled={isAsking || !question.trim()}>
            {isAsking ? t("Thinking...", "分析中...") : t("Ask Director", "发送问题")}
          </button>
        </div>
        {directorAnswer ? (
          <div className="card" style={{ marginTop: 12, background: "rgba(255,255,255,0.03)" }}>
            <div className="small muted">{t("Director Reply", "Director 回答")}</div>
            <p style={{ marginTop: 10, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{directorAnswer}</p>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="danger" style={{ marginTop: 16 }}>
          {error}
        </div>
      ) : null}
    </section>
  );
}
