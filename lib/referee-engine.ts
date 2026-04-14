import { traitVectorToCoreDimensions } from "@/lib/digital-gene-protocol";
import type { CoreDimensionVector, PersonaSnapshot, TraitVector } from "@/lib/types";
import { clamp, seededNumber } from "@/lib/utils";

export type RefereeActionType = "FLIRT" | "DEBATE" | "LEAD" | "RESIST" | "DECEIVE";

type TraitFragmentDefinition = {
  id: string;
  label: string;
  targetDimension: keyof CoreDimensionVector;
  modifier: number;
  hint: string;
  counterAction?: RefereeActionType;
};

export type RefereeOutcome = {
  actionType: RefereeActionType;
  success: boolean;
  roll: number;
  threshold: number;
  heartbeatDelta: number;
  pressureDelta: number;
  summary: string;
  directives: string[];
};

const traitFragmentLibrary: Record<string, TraitFragmentDefinition> = {
  T001: {
    id: "T001",
    label: "反 PUA 专家",
    targetDimension: "empathy_resonance",
    modifier: 0.18,
    hint: "先判断对方是否在操纵情绪，再决定是否接招。",
    counterAction: "DECEIVE",
  },
  T002: {
    id: "T002",
    label: "量子比喻",
    targetDimension: "rational_logic",
    modifier: 0.16,
    hint: "擅长把复杂逻辑包装成一句带攻击性的优雅隐喻。",
  },
  T003: {
    id: "T003",
    label: "厚脸皮",
    targetDimension: "social_energy",
    modifier: 0.14,
    hint: "即使吃了闭门羹，也能把尴尬转成下一轮试探。",
  },
  T004: {
    id: "T004",
    label: "稳态呼吸",
    targetDimension: "stress_resilience",
    modifier: 0.2,
    hint: "越到高压局，越能把表情和节奏稳住。",
  },
  T005: {
    id: "T005",
    label: "侧写直觉",
    targetDimension: "behavioral_flexibility",
    modifier: 0.16,
    hint: "擅长根据房间反馈临场改道，不会一直沿用一套打法。",
  },
};

const actionDimensionMap: Record<RefereeActionType, keyof CoreDimensionVector> = {
  FLIRT: "empathy_resonance",
  DEBATE: "rational_logic",
  LEAD: "social_energy",
  RESIST: "stress_resilience",
  DECEIVE: "behavioral_flexibility",
};

function buildDefenseScore(actionType: RefereeActionType, target: CoreDimensionVector) {
  if (actionType === "FLIRT") {
    return target.stress_resilience * 0.52 + target.behavioral_flexibility * 0.18;
  }
  if (actionType === "DEBATE") {
    return target.rational_logic * 0.48 + target.stress_resilience * 0.16;
  }
  if (actionType === "LEAD") {
    return target.social_energy * 0.28 + target.stress_resilience * 0.38;
  }
  if (actionType === "DECEIVE") {
    return target.rational_logic * 0.34 + target.empathy_resonance * 0.18;
  }
  return target.stress_resilience * 0.6;
}

export function pickRefereeAction(vector: TraitVector, worldTone?: string): RefereeActionType {
  if (vector.empathy >= 74 || vector.charm >= 76) return "FLIRT";
  if (vector.strategy >= 74 || vector.focus >= 76) return "DEBATE";
  if (vector.resilience >= 72 || vector.courage >= 75) return "LEAD";
  if (vector.chaos >= 68) return "DECEIVE";
  return /intimate|tender|danger/i.test(worldTone || "") ? "FLIRT" : "RESIST";
}

export function resolveRefereeCoreDimensions(vector: TraitVector) {
  return traitVectorToCoreDimensions(vector);
}

export function calculateRefereeOutcome(args: {
  actionType: RefereeActionType;
  actorVector: TraitVector;
  targetVector: TraitVector;
  activeTraitIds?: string[];
  seed: number;
}) {
  const actorDimensions = resolveRefereeCoreDimensions(args.actorVector);
  const targetDimensions = resolveRefereeCoreDimensions(args.targetVector);
  const targetDimension = actionDimensionMap[args.actionType];

  let traitBonus = 0;
  const directives: string[] = [];

  for (const traitId of args.activeTraitIds ?? []) {
    const fragment = traitFragmentLibrary[traitId];
    if (!fragment) continue;

    if (fragment.targetDimension === targetDimension) {
      traitBonus += fragment.modifier;
    }

    if (fragment.counterAction === args.actionType) {
      traitBonus -= 0.12;
    }

    directives.push(fragment.hint);
  }

  const actorBase = actorDimensions[targetDimension];
  const defenseScore = buildDefenseScore(args.actionType, targetDimensions);
  const threshold = clamp(actorBase * 0.72 + traitBonus - defenseScore * 0.24 + 0.18, 0.05, 0.95);
  const roll = seededNumber(args.seed, Math.round(actorBase * 100) + (args.activeTraitIds?.length ?? 0));
  const success = roll < threshold;
  const heartbeatDelta = success ? Math.round(8 + actorBase * 10 + traitBonus * 20) : -Math.round(5 + defenseScore * 12);
  const pressureDelta = success ? -Math.round(4 + actorDimensions.stress_resilience * 8) : Math.round(6 + defenseScore * 10);
  const summary = `裁判判定 ${success ? "成功" : "失败"}：roll ${roll.toFixed(2)} vs threshold ${threshold.toFixed(2)}.`;

  directives.push(success ? "旁白必须体现对手明显被撬动或被迫应对。" : "旁白必须体现对手没有被说服，并让压力回流到行动者身上。");

  return {
    actionType: args.actionType,
    success,
    roll,
    threshold,
    heartbeatDelta,
    pressureDelta,
    summary,
    directives,
  } satisfies RefereeOutcome;
}

export function extractPersonaTraitFragments(persona: PersonaSnapshot) {
  return persona.traitFragmentIds ?? [];
}
