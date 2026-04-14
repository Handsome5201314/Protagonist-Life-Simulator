import type {
  DirectorInsightSnapshot,
  GameplayConfig,
  GameplayConfigDiffEntry,
  GameplayConfigHistoryEntry,
  GameplayConfigPatch,
  GameplayConfigProposal,
  TelemetrySummary,
} from "@/lib/types";
import { createId, nowIso } from "@/lib/utils";

export function applyGameplayConfigPatch(config: GameplayConfig, patch: GameplayConfigPatch): GameplayConfig {
  return {
    dating: {
      ...config.dating,
      ...(patch.dating || {}),
    },
    arena: {
      ...config.arena,
      ...(patch.arena || {}),
    },
  };
}

function patchChanged<T extends object>(current: T, patch?: Partial<T>) {
  if (!patch) return false;
  return Object.entries(patch).some(([key, value]) => current[key as keyof T] !== value);
}

function normalizeValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  return JSON.stringify(value);
}

export function buildGameplayConfigDiff(config: GameplayConfig, patch: GameplayConfigPatch): GameplayConfigDiffEntry[] {
  const nextConfig = applyGameplayConfigPatch(config, patch);
  const entries: GameplayConfigDiffEntry[] = [];

  (["dating", "arena"] as const).forEach((scope) => {
    const current = config[scope];
    const next = nextConfig[scope];
    const patchScope = patch[scope];
    if (!patchScope) return;

    Object.keys(patchScope).forEach((key) => {
      const typedKey = key as keyof typeof current;
      entries.push({
        path: `${scope}.${key}`,
        before: normalizeValue(current[typedKey] as unknown),
        after: normalizeValue(next[typedKey] as unknown),
      });
    });
  });

  return entries;
}

export function createGameplayConfigHistoryEntry(input: {
  action: "apply" | "rollback";
  proposalId?: string;
  proposalTitle?: string;
  reason: string;
  patch: GameplayConfigPatch;
  previousConfig: GameplayConfig;
  nextConfig: GameplayConfig;
}): GameplayConfigHistoryEntry {
  return {
    id: createId("config_history"),
    createdAt: nowIso(),
    action: input.action,
    proposalId: input.proposalId,
    proposalTitle: input.proposalTitle,
    reason: input.reason,
    patch: input.patch,
    diff: buildGameplayConfigDiff(input.previousConfig, input.patch),
    previousConfig: input.previousConfig,
    nextConfig: input.nextConfig,
  };
}

function proposal(id: string, args: Omit<GameplayConfigProposal, "id" | "diff">, config: GameplayConfig): GameplayConfigProposal {
  return {
    id,
    ...args,
    diff: buildGameplayConfigDiff(config, args.patch),
  };
}

export function buildGameplayConfigProposals(args: {
  summary: TelemetrySummary;
  insight: DirectorInsightSnapshot;
  config: GameplayConfig;
}) {
  const proposals: GameplayConfigProposal[] = [];
  const { summary, config } = args;

  const datingEscalationPatch: GameplayConfigPatch = {
    dating: {
      forceTrustCrisisAfterFirstTurn: true,
      tensionBoost: Math.min(18, Math.max(config.dating.tensionBoost, 8)),
      environmentPressure: Math.min(3, Math.max(config.dating.environmentPressure, 2)),
    },
  };

  if (summary.metrics.datingContinuationRate < 70 || summary.metrics.datingSecondTurnRate < 50) {
    if (patchChanged(config.dating, datingEscalationPatch.dating)) {
      proposals.push(
        proposal(
          "dating_escalation_boost",
          {
            title: "强化相亲第一幕与第二幕升级",
            reason: `当前相亲一回合延续率为 ${summary.metrics.datingContinuationRate}% ，二回合留存为 ${summary.metrics.datingSecondTurnRate}%。`,
            target: "dating",
            priority: "now",
            patch: datingEscalationPatch,
          },
          config
        )
      );
    }
  }

  const datingSkillCostPatch: GameplayConfigPatch = {
    dating: {
      skillCostDiamonds: 2,
    },
  };

  if (summary.metrics.datingRoomsCreated && summary.metrics.datingTurnsPlayed <= summary.metrics.datingRoomsCreated) {
    if (patchChanged(config.dating, datingSkillCostPatch.dating)) {
      proposals.push(
        proposal(
          "dating_skill_cost_relief",
          {
            title: "降低相亲技能试错成本",
            reason: "当前大多数相亲房只停留在首轮，降低技能成本能更快逼出高张力互动。",
            target: "dating",
            priority: "next",
            patch: datingSkillCostPatch,
          },
          config
        )
      );
    }
  }

  const arenaPressurePatch: GameplayConfigPatch = {
    arena: {
      openingPressureBoost: Math.min(8, Math.max(config.arena.openingPressureBoost, 4)),
      eventIntensity: Math.min(3, Math.max(config.arena.eventIntensity, 2)),
    },
  };

  if (summary.metrics.arenaActivationRate < 75 && summary.metrics.arenaMatchesCreated) {
    if (patchChanged(config.arena, arenaPressurePatch.arena)) {
      proposals.push(
        proposal(
          "arena_pressure_boost",
          {
            title: "提高竞技场开局压迫感",
            reason: `竞技场准备到开局的转化率只有 ${summary.metrics.arenaActivationRate}%。`,
            target: "arena",
            priority: "next",
            patch: arenaPressurePatch,
          },
          config
        )
      );
    }
  }

  const proxyPatch: GameplayConfigPatch = {
    arena: {
      defaultProxyMode: "ai",
    },
  };

  if (summary.metrics.arenaPrepSaved && summary.metrics.arenaAiProxyShare < 45) {
    if (patchChanged(config.arena, proxyPatch.arena)) {
      proposals.push(
        proposal(
          "arena_default_ai_proxy",
          {
            title: "默认打开 AI 托管",
            reason: `AI 托管使用率当前只有 ${summary.metrics.arenaAiProxyShare}%，默认打开能减少空转准备态。`,
            target: "arena",
            priority: "watch",
            patch: proxyPatch,
          },
          config
        )
      );
    }
  }

  if (!proposals.length && args.insight.recommendations.length) {
    const recommendation = args.insight.recommendations[0];
    proposals.push(
      proposal(
        "watch_only",
        {
          title: `根据 director 建议保持观测：${recommendation.title}`,
          reason: recommendation.why,
          target: recommendation.title.includes("相亲") ? "dating" : "arena",
          priority: "watch",
          patch: {},
        },
        config
      )
    );
  }

  return proposals.slice(0, 4);
}
