import type {
  DatingActionType,
  DatingMatch,
  DatingMatchOption,
  PersonaSnapshot,
} from "@/lib/types";
import { clamp, createId } from "@/lib/utils";

export type DatingMarketCandidate = {
  personaId: string;
  name: string;
  tagline: string;
  matchScore: number;
  tags: string[];
  vibeHint: string;
};

export function getPrimaryDatingPersona(personas: PersonaSnapshot[]) {
  return personas.find((persona) => persona.adultOnlyEligible && persona.relation === "SELF" && !persona.deletedAt);
}

export function calculateDatingMatchScore(self: PersonaSnapshot, other: PersonaSnapshot) {
  const charmSync = 100 - Math.abs(self.traitVector.charm - other.traitVector.charm);
  const empathySync = 100 - Math.abs(self.traitVector.empathy - other.traitVector.empathy);
  const strategyTension = 100 - Math.abs(self.traitVector.strategy - other.traitVector.strategy);
  const paceTension = 100 - Math.abs(self.traitVector.chaos - other.traitVector.chaos);
  const courageBlend = Math.min(100, (self.traitVector.courage + other.traitVector.courage) / 2);

  return Math.round(charmSync * 0.28 + empathySync * 0.24 + strategyTension * 0.18 + paceTension * 0.15 + courageBlend * 0.15);
}

function deriveTagline(score: number, other: PersonaSnapshot) {
  if (score >= 84) return `你和 ${other.name} 之间有一种会让人立刻上头的强共振。`;
  if (score >= 72) return `你们之间已经带着明显拉扯感，适合直接试探。`;
  if (score >= 60) return `未必一见钟情，但很可能聊出意料之外的火花。`;
  return `危险又不稳定，不过也正因如此值得点开看看。`;
}

function deriveVibeHint(other: PersonaSnapshot) {
  if (other.traitVector.empathy >= 75) return "高共情，能很快读到你的情绪变化。";
  if (other.traitVector.strategy >= 78) return "高逻辑，更吃聪明和稳住节奏的对话。";
  if (other.traitVector.charm >= 80) return "强吸引力，擅长把气氛一路拉高。";
  if (other.traitVector.resilience >= 78) return "稳定安全，不喜欢没有意义的反复试探。";
  return "偏慢热，需要你先走近一点。";
}

export function buildDatingMarketCandidates(selfPersona: PersonaSnapshot, others: PersonaSnapshot[]) {
  return others
    .filter((candidate) => candidate.id !== selfPersona.id && candidate.adultOnlyEligible && !candidate.deletedAt)
    .map((candidate) => {
      const matchScore = calculateDatingMatchScore(selfPersona, candidate);
      return {
        personaId: candidate.id,
        name: candidate.name,
        tagline: deriveTagline(matchScore, candidate),
        matchScore,
        tags: candidate.publicTraitTags.slice(0, 3),
        vibeHint: deriveVibeHint(candidate),
      } satisfies DatingMarketCandidate;
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);
}

export function buildQuickPersonaFromAnswers(input: {
  nickname: string;
  socialStyle: "warm" | "quiet" | "playful";
  pace: "slow" | "balanced" | "fast";
  logic: "heart" | "mixed" | "logic";
}) {
  const publicTraitTags = [
    input.socialStyle === "warm" ? "亲和力强" : input.socialStyle === "quiet" ? "慢热" : "调情感强",
    input.pace === "slow" ? "低刺激" : input.pace === "balanced" ? "节奏稳定" : "推进快",
    input.logic === "heart" ? "感受优先" : input.logic === "logic" ? "逻辑优先" : "理性感性平衡",
  ];

  const communicationStyle =
    input.socialStyle === "warm"
      ? "warm and grounding"
      : input.socialStyle === "quiet"
        ? "precise and reserved"
        : "playful flirt";

  const careerTilt =
    input.logic === "logic"
      ? "research and systems"
      : input.logic === "heart"
        ? "people and care"
        : "strategy and creativity";

  const fears =
    input.pace === "slow"
      ? ["被催促推进", "被要求快速表态"]
      : input.pace === "fast"
        ? ["气氛过冷", "对方始终不给反馈"]
        : ["无效寒暄"];

  const rawText = `${input.nickname} / ${publicTraitTags.join(" / ")} / ${communicationStyle} / ${careerTilt}`;

  return {
    source: "upload" as const,
    name: input.nickname,
    ageBand: "adult" as const,
    relation: "SELF" as const,
    publicTraitTags,
    communicationStyle,
    careerTilt,
    fears,
    interests: ["相亲市场", "关系探索", "人格匹配"],
    rawText,
  };
}

export function createDatingBackdrop(self: PersonaSnapshot, other: PersonaSnapshot) {
  const pairEnergy = (self.traitVector.charm + other.traitVector.charm + self.traitVector.empathy + other.traitVector.empathy) / 4;
  const logicEnergy = (self.traitVector.strategy + other.traitVector.strategy) / 2;

  if (pairEnergy > 72) {
    return {
      title: "霓虹天台茶馆",
      summary: "夜雨刚从城市上空撤走，你们坐在半空茶馆发光的窗边，霓虹像故意替这次见面调过色温。",
    };
  }

  if (logicEnergy > 72) {
    return {
      title: "档案咖啡馆·闭馆后",
      summary: "闭馆后的档案咖啡馆只剩两盏桌灯，空气里全是旧纸和浓缩咖啡的味道，适合一场安静却锋利的试探。",
    };
  }

  return {
    title: "塔罗夜市巷口",
    summary: "夜市尽头的塔罗摊位刚好空出一张双人桌，纸牌、雾气和灯光把你们的第一次对视推得更像命运安排。",
  };
}

export function buildDefaultDatingOptions(match: DatingMatch, self: PersonaSnapshot, other: PersonaSnapshot) {
  const options: DatingMatchOption[] = [
    {
      id: createId("opt"),
      actionType: "FLIRT",
      label: "热感回应",
      flavor: self.traitVector.charm >= 65 ? "直接给对方一点心动信号。" : "往前走半步，别总停在观察位。",
    },
    {
      id: createId("opt"),
      actionType: "LOGIC_TALK",
      label: "理性切入",
      flavor: self.traitVector.strategy >= 65 ? "从兴趣和观点入手，更容易稳住气氛。" : "先找一个真正能聊下去的话题。",
    },
    {
      id: createId("opt"),
      actionType: "PULL_BACK",
      label: "收束试探",
      flavor: other.traitVector.empathy >= 72 ? "对高敏感对象来说，这可能是一种危险信号。" : "对慢热的人，也许适度后撤反而更有效。",
    },
    {
      id: createId("opt"),
      actionType: "USE_SKILL",
      label: "使用技能：真心喷涌",
      flavor: "消耗钻石，强行把这一回合推向更真诚的方向。",
      costDiamonds: 3,
    },
  ];

  return options;
}

function otherAttachmentArchetype(other: PersonaSnapshot) {
  if (other.traitVector.empathy >= 76 && other.traitVector.resilience >= 68) return "secure";
  if (other.traitVector.empathy >= 70 && other.traitVector.courage < 50) return "anxious";
  if (other.traitVector.strategy >= 76 && other.traitVector.charm < 55) return "avoidant";
  return "mixed";
}

export function resolveDatingTurn(input: {
  actionType: DatingActionType;
  self: PersonaSnapshot;
  other: PersonaSnapshot;
  heartbeat: number;
  vibe: number;
  usedSkill?: boolean;
}) {
  const attachment = otherAttachmentArchetype(input.other);
  let heartbeatDelta = 0;
  let vibeDelta = 0;
  let success = true;

  if (input.actionType === "FLIRT") {
    heartbeatDelta = Math.round((input.self.traitVector.charm - 55) / 8);
    vibeDelta = Math.round((input.self.traitVector.empathy - 50) / 10);
    if (attachment === "avoidant") {
      heartbeatDelta -= 10;
      vibeDelta -= 5;
      success = false;
    }
  }

  if (input.actionType === "LOGIC_TALK") {
    heartbeatDelta = Math.round((input.self.traitVector.strategy - 50) / 10);
    vibeDelta = Math.round((input.self.traitVector.focus - 52) / 10);
    if (attachment === "secure" || attachment === "avoidant") {
      heartbeatDelta += 4;
      vibeDelta += 6;
    }
  }

  if (input.actionType === "PULL_BACK") {
    heartbeatDelta = -6;
    vibeDelta = attachment === "avoidant" ? 8 : -7;
    if (attachment !== "avoidant") {
      success = false;
    }
  }

  if (input.actionType === "USE_SKILL") {
    heartbeatDelta = 12;
    vibeDelta = 8;
    success = true;
  }

  return {
    success,
    heartbeat: clamp(input.heartbeat + heartbeatDelta, 0, 100),
    vibe: clamp(input.vibe + vibeDelta, 0, 100),
    heartbeatDelta,
    vibeDelta,
    attachment,
    status:
      input.heartbeat + heartbeatDelta >= 86 && input.vibe + vibeDelta >= 80
        ? ("soulmatch" as const)
        : input.heartbeat + heartbeatDelta <= 10 || input.vibe + vibeDelta <= 8
          ? ("collapsed" as const)
          : ("active" as const),
  };
}

export function fallbackOpeningLine(self: PersonaSnapshot, other: PersonaSnapshot) {
  if (other.traitVector.charm >= 78) {
    return `${other.name} 先笑了一下，像是已经提前猜到你会比看起来更谨慎。`;
  }

  if (other.traitVector.strategy >= 78) {
    return `${other.name} 把杯子放得很轻，像是在等你先暴露一点自己的逻辑。`;
  }

  return `${other.name} 先打了个招呼，语气不重，却足够让这张桌子开始有了温度。`;
}

export function fallbackTurnNarrative(args: {
  actionType: DatingActionType;
  success: boolean;
  heartbeatDelta: number;
  vibeDelta: number;
  self: PersonaSnapshot;
  other: PersonaSnapshot;
}) {
  if (args.actionType === "FLIRT" && args.success) {
    return `你把气氛往前推了一步。${args.other.name} 没有退开，反而顺着你的节奏把那点暧昧接住了。`;
  }

  if (args.actionType === "FLIRT" && !args.success) {
    return `你给出的信号太直接了。${args.other.name} 明显有些招架不住，话锋也不自觉往后撤了一点。`;
  }

  if (args.actionType === "LOGIC_TALK") {
    return `你把话题拉回更稳的轨道，从观点和细节切入。桌上的紧张感没有消失，但开始变得更可控。`;
  }

  if (args.actionType === "PULL_BACK" && args.success) {
    return `你故意留出一点距离，反而让 ${args.other.name} 愿意往前迈一步。沉默这次没有变冷，而是有了张力。`;
  }

  if (args.actionType === "PULL_BACK" && !args.success) {
    return `你后撤得太快了。${args.other.name} 把这理解成兴趣不足，桌上的温度明显降了下来。`;
  }

  return `你花了一点代价，把这一回合推向更坦白的方向。空气一下子比刚才更真实了。`;
}

export function buildMarketStatusLine(score: number) {
  if (score >= 85) return "高匹配，建议马上开场。";
  if (score >= 72) return "存在明显火花，值得直接进房。";
  if (score >= 60) return "可聊，靠操作。";
  return "高风险局，适合想看反差的人。";
}
