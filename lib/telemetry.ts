import type {
  AppDatabase,
  DirectorInsightSnapshot,
  DirectorRecommendation,
  TelemetryEvent,
  TelemetryEventType,
  TelemetrySummary,
} from "@/lib/types";
import { average, createId, createLockedHash, nowIso } from "@/lib/utils";

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(1));
}

function countByType(events: TelemetryEvent[]) {
  return events.reduce<Partial<Record<TelemetryEventType, number>>>((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});
}

function rankLabels(
  events: TelemetryEvent[],
  filterType: TelemetryEventType,
  metadataKey: string
) {
  const buckets = new Map<string, number>();
  for (const event of events) {
    if (event.type !== filterType) continue;
    const label = event.metadata[metadataKey];
    if (typeof label !== "string" || !label.trim()) continue;
    buckets.set(label, (buckets.get(label) || 0) + 1);
  }

  return [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));
}

export function trackTelemetry(
  db: AppDatabase,
  input: {
    type: TelemetryEventType;
    userId: string;
    entityId?: string;
    metadata?: Record<string, string | number | boolean | null | undefined>;
  }
) {
  const metadata = Object.fromEntries(
    Object.entries(input.metadata || {}).map(([key, value]) => [key, value ?? null])
  ) as Record<string, string | number | boolean | null>;

  const event: TelemetryEvent = {
    id: createId("telemetry"),
    type: input.type,
    userId: input.userId,
    entityId: input.entityId,
    createdAt: nowIso(),
    metadata,
  };

  db.telemetryEvents.unshift(event);
  db.telemetryEvents = db.telemetryEvents.slice(0, 5000);
  return event;
}

export function summarizeTelemetry(db: AppDatabase, windowHours = 168): TelemetrySummary {
  const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
  const events = db.telemetryEvents.filter((event) => new Date(event.createdAt).getTime() >= cutoff);
  const counts = countByType(events);

  const arenaCreatedEvents = events.filter((event) => event.type === "arena.match_created");
  const arenaPrepEvents = events.filter((event) => event.type === "arena.prep_saved");
  const arenaRoundEvents = events.filter((event) => event.type === "arena.round_triggered");
  const datingRoomEvents = events.filter((event) => event.type === "dating.room_created");
  const datingTurnEvents = events.filter((event) => event.type === "dating.turn_played");

  const uniqueArenaCreated = new Set(arenaCreatedEvents.map((event) => event.entityId).filter(Boolean)).size;
  const uniqueArenaPrepared = new Set(arenaPrepEvents.map((event) => event.entityId).filter(Boolean)).size;
  const uniqueArenaActivated = new Set(arenaRoundEvents.map((event) => event.entityId).filter(Boolean)).size;

  const uniqueDatingRooms = new Set(datingRoomEvents.map((event) => event.entityId).filter(Boolean)).size;
  const uniqueDatingActivated = new Set(datingTurnEvents.map((event) => event.entityId).filter(Boolean)).size;
  const uniqueDatingSecondTurn = new Set(
    datingTurnEvents
      .filter((event) => Number(event.metadata.turnCount || 0) >= 2)
      .map((event) => event.entityId)
      .filter(Boolean)
  ).size;

  const datingTurnsPerRoom = [...new Set(datingTurnEvents.map((event) => event.entityId).filter(Boolean))].map((roomId) =>
    datingTurnEvents.filter((event) => event.entityId === roomId).length
  );

  const aiProxyPrepCount = arenaPrepEvents.filter((event) => event.metadata.proxyMode === "ai").length;

  const metrics = {
    personasImported: counts["persona.imported"] || 0,
    worldPacksUploaded: counts["worldpack.uploaded"] || 0,
    arenaMatchesCreated: uniqueArenaCreated,
    arenaPrepSaved: counts["arena.prep_saved"] || 0,
    arenaRoundsTriggered: counts["arena.round_triggered"] || 0,
    arenaRoomsActivated: uniqueArenaActivated,
    arenaPrepCompletionRate: percentage(uniqueArenaPrepared, uniqueArenaCreated),
    arenaActivationRate: percentage(uniqueArenaActivated, uniqueArenaPrepared),
    arenaAiProxyShare: percentage(aiProxyPrepCount, arenaPrepEvents.length),
    datingRoomsCreated: uniqueDatingRooms,
    datingRoomsActivated: uniqueDatingActivated,
    datingTurnsPlayed: counts["dating.turn_played"] || 0,
    datingContinuationRate: percentage(uniqueDatingActivated, uniqueDatingRooms),
    datingSecondTurnRate: percentage(uniqueDatingSecondTurn, uniqueDatingRooms),
    datingAverageTurnsPerRoom: Number(average(datingTurnsPerRoom).toFixed(1)),
  };

  const highlights: string[] = [];
  if (metrics.arenaMatchesCreated && metrics.arenaPrepCompletionRate < 70) {
    highlights.push(`Arena prep completion is only ${metrics.arenaPrepCompletionRate}% in the selected window.`);
  }
  if (metrics.arenaRoomsActivated && metrics.arenaActivationRate < 70) {
    highlights.push(`Many arena rooms stall before first round; activation rate is ${metrics.arenaActivationRate}%.`);
  }
  if (metrics.datingRoomsCreated && metrics.datingContinuationRate < 65) {
    highlights.push(`Dating first-turn continuation is ${metrics.datingContinuationRate}%, so opening scenes are still leaking players.`);
  }
  if (metrics.datingRoomsCreated && metrics.datingSecondTurnRate < 45) {
    highlights.push(`Second-turn dating retention is only ${metrics.datingSecondTurnRate}%, which suggests scene escalation is too flat.`);
  }
  if (!highlights.length) {
    highlights.push("Core room loops are moving, but telemetry volume is still small enough that every new room changes the trendline.");
  }

  const topArenaWorlds = rankLabels(events, "arena.match_created", "worldTitle");
  const topDatingActions = rankLabels(events, "dating.turn_played", "actionType");
  const topArenaEventCards = rankLabels(events, "arena.round_triggered", "eventCardTitle");

  const narrativeSummary = [
    `${metrics.arenaMatchesCreated} arena rooms were created, ${metrics.arenaRoomsActivated} of them reached a live round.`,
    `${metrics.datingRoomsCreated} dating rooms were opened, generating ${metrics.datingTurnsPlayed} total turns.`,
    metrics.arenaAiProxyShare
      ? `${metrics.arenaAiProxyShare}% of saved arena prep states chose AI proxy mode.`
      : "AI proxy mode has not become the dominant prep choice yet.",
    topDatingActions[0] ? `Most-used dating action: ${topDatingActions[0].label} (${topDatingActions[0].count}).` : "No dating action trend is available yet.",
  ].join(" ");

  return {
    generatedAt: nowIso(),
    windowHours,
    totalEvents: events.length,
    countsByType: counts,
    metrics,
    topArenaWorlds,
    topDatingActions,
    topArenaEventCards,
    highlights,
    narrativeSummary,
    summaryHash: createLockedHash({
      windowHours,
      totalEvents: events.length,
      counts,
      metrics,
      topArenaWorlds,
      topDatingActions,
      topArenaEventCards,
    }),
  };
}

export function buildHeuristicDirectorInsight(summary: TelemetrySummary): DirectorInsightSnapshot {
  return buildHeuristicDirectorInsightForLocale(summary, "en");
}

export function buildHeuristicDirectorInsightForLocale(
  summary: TelemetrySummary,
  locale: "en" | "zh"
): DirectorInsightSnapshot {
  const recommendations: DirectorRecommendation[] = [];

  if (summary.metrics.arenaPrepCompletionRate < 70 && summary.metrics.arenaMatchesCreated) {
    recommendations.push({
      priority: "now",
      title: locale === "zh" ? "压缩竞技场准备流程" : "Compress arena prep",
      why:
        locale === "zh"
          ? `创建的竞技场房间里，只有 ${summary.metrics.arenaPrepCompletionRate}% 真正保存了准备态。`
          : `Only ${summary.metrics.arenaPrepCompletionRate}% of created arena rooms saved prep state.`,
      action:
        locale === "zh"
          ? "缩短准备页、补更多默认值，并给出一个单屏的“直接开始”路径。"
          : "Shorten the prep surface, prefill more defaults, and show a one-screen 'start now' path.",
    });
  }

  if (summary.metrics.datingContinuationRate < 65 && summary.metrics.datingRoomsCreated) {
    recommendations.push({
      priority: "now",
      title: locale === "zh" ? "增强相亲第一幕钩子" : "Strengthen first-scene hooks",
      why:
        locale === "zh"
          ? `相亲房创建后的一回合延续率只有 ${summary.metrics.datingContinuationRate}%。`
          : `Dating continuation is ${summary.metrics.datingContinuationRate}% after room creation.`,
      action:
        locale === "zh"
          ? "提高场景风险、给出更明确的目标，并让第一句回复像一次试探而不是闲聊。"
          : "Increase scene risk, add stronger objectives, and make the first reply feel like a consequential test instead of small talk.",
    });
  }

  if (summary.metrics.datingSecondTurnRate < 45 && summary.metrics.datingRoomsCreated) {
    recommendations.push({
      priority: "next",
      title: locale === "zh" ? "第二回合前必须升级冲突" : "Escalate by turn two",
      why:
        locale === "zh"
          ? `只有 ${summary.metrics.datingSecondTurnRate}% 的相亲房进入了第二个玩家回合。`
          : `Only ${summary.metrics.datingSecondTurnRate}% of rooms make it to a second player turn.`,
      action:
        locale === "zh"
          ? "在第一轮交换后立刻插入一个明确分支或揭示，让房间像在推进剧情，而不是原地打转。"
          : "Insert an explicit branch or reveal after the first exchange so the room feels like a progressing episode.",
    });
  }

  if (summary.metrics.arenaAiProxyShare < 35 && summary.metrics.arenaPrepSaved) {
    recommendations.push({
      priority: "watch",
      title: locale === "zh" ? "把 AI 托管讲清楚" : "Make AI proxy mode legible",
      why:
        locale === "zh"
          ? `当前保存准备态时，只有 ${summary.metrics.arenaAiProxyShare}% 选择了 AI 托管。`
          : `AI proxy appears in ${summary.metrics.arenaAiProxyShare}% of prep saves.`,
      action:
        locale === "zh"
          ? "开局前先解释 AI 托管会改什么，再预览一条示例意图，让它先变得可信。"
          : "Explain what AI proxy changes before the match begins and preview one sample intent so it feels trustworthy.",
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      priority: "watch",
      title: locale === "zh" ? "先继续放大样本量" : "Increase telemetry volume",
      why:
        locale === "zh"
          ? "当前系统已经能稳定跑通，接下来更重要的是增加样本量，而不是继续拍脑袋调参数。"
          : "The system is stable enough that higher sample size matters more than another intuition-driven tweak.",
      action:
        locale === "zh"
          ? "先推动更多真实房间进入现有流程，再决定要不要动平衡。"
          : "Drive more rooms through the current loops before changing balance.",
    });
  }

  return {
    id: createId("insight"),
    generatedAt: nowIso(),
    windowHours: summary.windowHours,
    eventCount: summary.totalEvents,
    summaryHash: summary.summaryHash,
    source: "heuristic",
    headline:
      locale === "zh"
        ? "当前 telemetry 说明房间主循环已经活了，但首幕摩擦仍然是最主要的漏斗。"
        : "Current telemetry suggests the room loops are alive, but early-scene friction is still the main leak.",
    findings: summary.highlights,
    recommendations,
    watchlist:
      locale === "zh"
        ? [
            "哪些竞技场事件卡会带来复玩，而不是一轮新鲜感？",
            "哪些相亲开场能保住张力，又不会掉进油腻调情？",
            "用户理解 AI 托管之后，它是否真的能提升回合触发率？",
          ]
        : [
            "Which arena event cards correlate with repeat play instead of one-round novelty?",
            "Which dating scene openings preserve tension without collapsing into generic flirting?",
            "Does AI proxy increase round trigger rate after users understand what it does?",
          ],
  };
}
