import type {
  DatingActionType,
  DatingBeat,
  GameplayConfig,
  DatingMatch,
  DatingMatchOption,
  DatingSceneCard,
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

function otherAttachmentArchetype(other: PersonaSnapshot) {
  if (other.traitVector.empathy >= 76 && other.traitVector.resilience >= 68) return "secure";
  if (other.traitVector.empathy >= 70 && other.traitVector.courage < 50) return "anxious";
  if (other.traitVector.strategy >= 76 && other.traitVector.charm < 55) return "avoidant";
  return "mixed";
}

export function buildDatingScene(
  self: PersonaSnapshot,
  other: PersonaSnapshot,
  turnCount: number,
  backdropTitle: string,
  config?: GameplayConfig
): DatingSceneCard {
  const attachment = otherAttachmentArchetype(other);
  const stage = Math.min(turnCount, 4);
  const pressure = config?.dating.environmentPressure || 0;

  const deck: DatingSceneCard[] = [
    {
      id: "first_glance",
      title: `${backdropTitle} · 初次对视`,
      summary: "刚坐下的前两分钟，决定你们是走向舒展还是走向礼貌性防御。",
      objective: "给对方一个可接住的开场，不要把全部情绪一次性砸过去。",
      risk: attachment === "avoidant" ? "推进太猛会触发后撤。" : "太保守会让气氛一直停在表层。",
    },
    {
      id: "shared_topic",
      title: `${backdropTitle} · 共同话题`,
      summary: "话题正在从天气和场景转向真正的兴趣与价值判断。",
      objective: "找到一个能让两个人都投入的主题，把对话从寒暄拉进真实。",
      risk: "如果你只顾着展示自己，房间会迅速失去互动感。",
    },
    {
      id: "trust_crisis",
      title: `${backdropTitle} / 信任危机`,
      summary: pressure >= 2 ? "刚建立起来的温度被一条危险信号打断，任何安逸都显得可疑。" : "某个细节让这场相遇突然不再安全，轻松气氛开始裂开。",
      objective: "判断现在该继续靠近，还是先验证对方是不是在藏牌。",
      risk: pressure >= 2 ? "如果你继续按温柔模板推进，场面会立刻把你当成最容易失手的人。" : "这一步若误判，对方会把你的靠近理解成轻率和失控。",
    },
    {
      id: "boundary_test",
      title: `${backdropTitle} · 边界试探`,
      summary: "现在轮到双方判断彼此的边界感与风险承受力。",
      objective: "既要表达自己，也要证明你能尊重对方的速度和底线。",
      risk: attachment === "anxious" ? "冷处理会被误读成兴趣不足。" : "暧昧过量会被看成没有边界。",
    },
    {
      id: "private_signal",
      title: `${backdropTitle} · 私人信号`,
      summary: "对话开始出现只能被你们两个人理解的细微信号。",
      objective: "制造属于这一局的独特默契，而不是继续重复通用模板。",
      risk: "如果这一轮失手，前面的火花会被迅速拉回到安全社交距离。",
    },
    {
      id: "closing_choice",
      title: `${backdropTitle} · 收束选择`,
      summary: "局面已经足够清楚，最后一轮更像是在决定是否把关系继续带走。",
      objective: "给出清晰但不压迫的态度，让对方知道下一步值不值得发生。",
      risk: "模糊拖延会削弱之前积累的全部张力。",
    },
  ];

  if (config?.dating.forceTrustCrisisAfterFirstTurn && turnCount >= 1) {
    const sequence = [deck[0], deck[2], deck[3], deck[4], deck[5]];
    return sequence[Math.min(turnCount, sequence.length - 1)] ?? deck[deck.length - 1];
  }

  return deck[stage] ?? deck[deck.length - 1];
}

export function buildDefaultDatingOptions(
  match: DatingMatch,
  self: PersonaSnapshot,
  other: PersonaSnapshot,
  config?: GameplayConfig
) {
  const scene = match.scene;
  const attachment = otherAttachmentArchetype(other);

  const flirtFlavor =
    scene.id === "first_glance"
      ? "用一句轻一点的好奇，把气氛往心动方向拨动。"
      : scene.id === "private_signal"
        ? "把前几轮积攒下来的默契推成真正的私人信号。"
        : self.traitVector.charm >= 65
          ? "直接给对方一点心动信号。"
          : "往前走半步，别总停在观察位。";

  const logicFlavor =
    scene.id === "shared_topic"
      ? "顺着当前话题往深处切，让你们的价值观真的碰一下。"
      : self.traitVector.strategy >= 65
        ? "从兴趣和观点入手，更容易稳住气氛。"
        : "先找一个真正能聊下去的话题。";

  const pullBackFlavor =
    scene.id === "boundary_test"
      ? "留一点空间，看对方会不会主动靠近。"
      : attachment === "avoidant"
        ? "对慢热与回避型对象，适度后撤反而更有效。"
        : "这一步风险更高，容易被误读成兴趣不足。";

  const skillLabel =
    scene.id === "closing_choice" ? "使用技能：终局直球" : scene.id === "boundary_test" ? "使用技能：真心喷涌" : "使用技能：情绪加速";

  return [
    {
      id: createId("opt"),
      actionType: "FLIRT",
      label: "热感回应",
      flavor: flirtFlavor,
    },
    {
      id: createId("opt"),
      actionType: "LOGIC_TALK",
      label: "理性切入",
      flavor: logicFlavor,
    },
    {
      id: createId("opt"),
      actionType: "PULL_BACK",
      label: "收束试探",
      flavor: pullBackFlavor,
    },
    {
      id: createId("opt"),
      actionType: "USE_SKILL",
      label: skillLabel,
      flavor: "消耗钻石，强行把这一回合推向更高张力的方向。",
      costDiamonds: config?.dating.skillCostDiamonds ?? 3,
    },
  ] satisfies DatingMatchOption[];
}

export function resolveDatingTurn(input: {
  actionType: DatingActionType;
  self: PersonaSnapshot;
  other: PersonaSnapshot;
  scene: DatingSceneCard;
  heartbeat: number;
  vibe: number;
  usedSkill?: boolean;
  config?: GameplayConfig;
}) {
  const attachment = otherAttachmentArchetype(input.other);
  const tensionBoost = input.config?.dating.tensionBoost || 0;
  const environmentPressure = input.config?.dating.environmentPressure || 0;
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
    if (input.scene.id === "private_signal") {
      heartbeatDelta += 6;
      vibeDelta += 3;
    }
    if (input.scene.id === "trust_crisis") {
      heartbeatDelta -= 4;
      vibeDelta += 2;
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
    if (input.scene.id === "shared_topic") {
      heartbeatDelta += 5;
      vibeDelta += 5;
    }
    if (input.scene.id === "trust_crisis") {
      heartbeatDelta += 4;
      vibeDelta += 8;
    }
  }

  if (input.actionType === "PULL_BACK") {
    heartbeatDelta = -6;
    vibeDelta = attachment === "avoidant" ? 8 : -7;
    if (attachment !== "avoidant") {
      success = false;
    }
    if (input.scene.id === "boundary_test") {
      vibeDelta += 6;
    }
    if (input.scene.id === "trust_crisis") {
      vibeDelta += 4;
    }
  }

  if (input.actionType === "USE_SKILL") {
    heartbeatDelta = input.scene.id === "closing_choice" ? 16 : 12;
    vibeDelta = input.scene.id === "boundary_test" ? 10 : 8;
    success = true;
  }

  heartbeatDelta += Math.round(tensionBoost / 3);
  vibeDelta += tensionBoost > 0 ? Math.round(tensionBoost / 4) : 0;
  if (environmentPressure > 0) {
    vibeDelta -= environmentPressure;
    if (input.actionType === "PULL_BACK") {
      heartbeatDelta -= environmentPressure;
    }
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

export function fallbackOpeningLine(self: PersonaSnapshot, other: PersonaSnapshot, scene?: DatingSceneCard) {
  if (scene?.id === "first_glance") {
    return `${other.name} 看着你落座时，先给了一个不急不缓的眼神，像是在判断你会不会把这场相遇演成模板。`;
  }

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
  scene: DatingSceneCard;
  self: PersonaSnapshot;
  other: PersonaSnapshot;
}) {
  if (args.scene.id === "trust_crisis") {
    return args.success
      ? `${args.other.name} 没有躲开这次危险信号，反而顺着你的处理方式把局面稳住了。这个房间第一次像真正有代价地靠近。`
      : `空气里忽然出现了不该被忽略的裂缝。${args.other.name} 没有顺着你的动作靠近，反而先把距离和警惕一起拉了出来。`;
  }

  if (args.actionType === "FLIRT" && args.success) {
    return `在「${args.scene.title}」这一幕里，你把气氛往前推了一步。${args.other.name} 没有退开，反而顺着你的节奏把那点暧昧接住了。`;
  }

  if (args.actionType === "FLIRT" && !args.success) {
    return `这一幕本来需要温柔推进，但你的信号太直接了。${args.other.name} 明显有些招架不住，话锋也不自觉往后撤了一点。`;
  }

  if (args.actionType === "LOGIC_TALK") {
    return `你把对话拉回更稳的轨道，从观点和细节切入。「${args.scene.title}」开始像一场真正发生在两个人之间的谈话，而不只是礼貌寒暄。`;
  }

  if (args.actionType === "PULL_BACK" && args.success) {
    return `你故意留出一点距离，反而让 ${args.other.name} 愿意往前迈一步。沉默这次没有变冷，而是在「${args.scene.title}」里形成了张力。`;
  }

  if (args.actionType === "PULL_BACK" && !args.success) {
    return `你后撤得太快了。${args.other.name} 把这理解成兴趣不足，「${args.scene.title}」这一幕的温度明显降了下来。`;
  }

  return `你花了一点代价，把「${args.scene.title}」这一回合推向更坦白的方向。空气一下子比刚才更真实了。`;
}

export function buildFallbackOpeningBeat(args: {
  self: PersonaSnapshot;
  other: PersonaSnapshot;
  scene: DatingSceneCard;
}): DatingBeat {
  const cautious = args.self.traitVector.strategy >= 65 || args.self.traitVector.focus >= 65;
  return {
    narration: `${args.scene.title} 的灯影在桌面上轻轻晃了一下，牌面和雾气把第一次对视切得比真实更慢。`,
    other: {
      action: cautious
        ? `${args.other.name} 没急着抢话，只是顺手把桌边那张牌拨开，给你留出一个不被逼近的开场。`
        : `${args.other.name} 先把语气放轻，像是在故意把这场相遇从紧绷里拽回来。`,
      dialogue:
        args.other.traitVector.empathy >= 70
          ? "别急着把我看穿，先坐稳一点，我们慢慢聊。"
          : "这桌牌不急着翻底，我们先看看彼此会不会说真话。",
    },
  };
}

export function buildFallbackTurnBeat(args: {
  actionType: DatingActionType;
  success: boolean;
  scene: DatingSceneCard;
  self: PersonaSnapshot;
  other: PersonaSnapshot;
}): DatingBeat {
  const narration = args.success
    ? `${args.scene.title} 里原本绷着的空气终于松开了一寸，但那一寸也足够把局势推向更危险的靠近。`
    : `${args.scene.title} 的灯影没有替任何人圆场，话刚落地，距离就先被重新量了一遍。`;

  if (args.actionType === "FLIRT") {
    return {
      narration,
      self: {
        action: "他把身体微微前倾，语气放缓，却没有彻底交出自己的底牌。",
        dialogue: args.success ? "你一直这么会装作若无其事吗？" : "我还以为，你会比现在更愿意让我靠近一点。",
      },
      other: {
        action: args.success
          ? `${args.other.name} 没有躲开，只是把视线停在你脸上，像在重新估算这句话的代价。`
          : `${args.other.name} 把椅背往后挪开了一点，动作不大，却足够把警惕摆上桌面。`,
        dialogue: args.success ? "那要看你想靠近的是我，还是你自己脑子里的版本。" : "太快了，我不习惯替别人补完他们没说出口的东西。",
      },
    };
  }

  if (args.actionType === "LOGIC_TALK") {
    return {
      narration,
      self: {
        action: "他把话题从暧昧里拎出来，故意落回更稳的切入口。",
        dialogue: "比起试探，我更想知道你到底在回避什么。",
      },
      other: {
        action: args.success
          ? `${args.other.name} 终于接住了这个问题，语气里的轻松被收起了一半。`
          : `${args.other.name} 没跟着你的逻辑走，只是把沉默留得更长了一点。`,
        dialogue: args.success ? "回避不一定是拒绝，有时候只是还不想被谁定义。" : "你把话说得太整齐了，像是早就替我留好了结论。",
      },
    };
  }

  if (args.actionType === "PULL_BACK") {
    return {
      narration,
      self: {
        action: "他故意把节奏收住，把刚刚那点要越界的东西压回句子后面。",
        dialogue: args.success ? "行，那就先到这里，我不抢你的答案。" : "算了，当我刚才没说。",
      },
      other: {
        action: args.success
          ? `${args.other.name} 反而顺着你留下的空隙靠近了半步。`
          : `${args.other.name} 也跟着沉了下去，像是默认让这段气氛就此散掉。`,
        dialogue: args.success ? "现在这样，反而比较像能继续谈下去的样子。" : "你看，收回去的东西，通常也很难再捡回来。",
      },
    };
  }

  return {
    narration,
    self: {
      action: "他没有再给这场相遇留缓冲，而是硬生生把话题推向更危险的中心。",
      dialogue: "那我们别绕了，你总得给我一点真的东西。",
    },
    other: {
      action: args.success
        ? `${args.other.name} 被这下突然的逼近打断了原本的节奏，却没有退。`
        : `${args.other.name} 的表情先冷了下来，像是在提醒你这条线不是随便就能踩过去的。`,
      dialogue: args.success ? "你这一下倒是终于像在跟我说话，不像在试卷上做题。" : "你想要真话，也得先证明你接得住。",
    },
  };
}

export function buildMarketStatusLine(score: number) {
  if (score >= 85) return "高匹配，建议马上开场。";
  if (score >= 72) return "存在明显火花，值得直接进房。";
  if (score >= 60) return "可聊，靠操作。";
  return "高风险局，适合想看反差的人。";
}
