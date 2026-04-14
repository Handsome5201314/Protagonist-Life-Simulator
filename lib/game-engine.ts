import { getSkillById, rewardTiers, worldToneWeights } from "@/lib/catalog";
import type { Locale } from "@/lib/i18n";
import {
  calculateRefereeOutcome,
  extractPersonaTraitFragments,
  pickRefereeAction,
  type RefereeActionType,
} from "@/lib/referee-engine";
import type {
  ArenaEventCard,
  ArenaMatch,
  ArenaMessage,
  ArenaProxyPlanRecord,
  GameplayConfig,
  MatchParticipant,
  MemoryTrait,
  PersonaSnapshot,
  RoundScore,
  StreamRecord,
  SupportTicket,
  TraitVector,
  UserRecord,
  WorldPack,
} from "@/lib/types";
import { average, clamp, createId, formatList, mergeTraitVector, pick } from "@/lib/utils";

export type ArenaProxyPlan = ArenaProxyPlanRecord;

function t(locale: Locale, en: string, zh: string) {
  return locale === "zh" ? zh : en;
}

function vectorToScore(vector: TraitVector) {
  return average([
    vector.charm,
    vector.resilience,
    vector.focus,
    vector.empathy,
    vector.strategy,
    100 - vector.chaos,
    vector.courage,
  ]);
}

function averageTraitVectors(vectors: TraitVector[], fallback: TraitVector): TraitVector {
  if (!vectors.length) return fallback;

  return {
    charm: average(vectors.map((vector) => vector.charm)),
    resilience: average(vectors.map((vector) => vector.resilience)),
    focus: average(vectors.map((vector) => vector.focus)),
    empathy: average(vectors.map((vector) => vector.empathy)),
    strategy: average(vectors.map((vector) => vector.strategy)),
    chaos: average(vectors.map((vector) => vector.chaos)),
    courage: average(vectors.map((vector) => vector.courage)),
  };
}

function buildArenaEventCard(args: { locale: Locale; world: WorldPack; round: number; config?: GameplayConfig }): ArenaEventCard {
  const survivalDeck = [
    {
      id: "oxygen_bid",
      title: "氧气竞价",
      summary: "资源开始按分钟计价，谁先暴露底牌，谁就会被全桌记住。",
      objective: "争取先手，同时不要让自己的真实意图暴露过早。",
      stakes: "一旦推进过猛，你的弱点会被放大成整个房间的公共情报。",
    },
    {
      id: "trust_fault",
      title: "临时同盟裂缝",
      summary: "有人开始试图把责任转嫁给最不稳定的那一位。",
      objective: "判断是接住联盟，还是及时抽身。",
      stakes: "信错一次，第二回合就可能直接跌出主桌。",
    },
  ];

  const businessDeck = [
    {
      id: "board_vote",
      title: "董事会投票",
      summary: "每一句话都像投票前的站队动作，沉默本身也是立场。",
      objective: "在不暴露全部筹码的前提下争取话语权。",
      stakes: "如果节奏被夺走，后续每一步都只能被动跟牌。",
    },
    {
      id: "price_anchor",
      title: "定价锚点",
      summary: "有人试图抢先设定全桌的判断标准。",
      objective: "要么抢下锚点，要么拆掉它。",
      stakes: "一旦让对方定价成功，你的所有动作都会被重新解释。",
    },
  ];

  const mysteryDeck = [
    {
      id: "false_testimony",
      title: "伪证词",
      summary: "所有人都拿到了一份不完全真实的版本，关键在于谁先意识到它是假的。",
      objective: "读懂房间里的偏差，而不是只回答表面问题。",
      stakes: "如果你把假信息当真，后续会一路踩错节奏。",
    },
    {
      id: "mirror_cross",
      title: "镜面交叉审问",
      summary: "每个人的回答都会反过来成为下一位的压力源。",
      objective: "让自己的话成为武器，而不是把柄。",
      stakes: "失手一次，整轮都会围着你的破绽转。"
    },
  ];

  const intimateDeck = [
    {
      id: "masked_confession",
      title: "面具告白",
      summary: "对话表面在绕圈，但真正的推进发生在谁先说出那句不够安全的话。",
      objective: "让情绪推进有力度，但别把自己一次性暴露完。",
      stakes: "太收着会失去火花，太直接又会被判定为没有边界。",
    },
    {
      id: "silent_offer",
      title: "沉默邀约",
      summary: "这一轮最危险的动作不是说话，而是让沉默替你说话。",
      objective: "判断什么时候应该后撤，什么时候应该逼近。",
      stakes: "节奏判断失误，会让整局温度骤降。",
    },
  ];

  const categoryText = `${args.world.title} ${args.world.theme} ${args.world.tone} ${args.world.sanitizedSummary}`.toLowerCase();
  const deck = /survival|废土|signal|oxygen/i.test(categoryText)
    ? survivalDeck
    : /board|market|财阀|并购/i.test(categoryText)
      ? businessDeck
      : /tarot|love|婚约|相亲|intimate/i.test(categoryText)
        ? intimateDeck
        : mysteryDeck;

  const selected = deck[(args.round - 1) % deck.length];
  const intensity = args.config?.arena.eventIntensity ?? 1;

  if (intensity <= 1) {
    return selected;
  }

  return {
    ...selected,
    summary:
      intensity >= 3
        ? `${selected.summary} 此刻任何礼貌都在失效，桌面正在逼所有人提前摊牌。`
        : `${selected.summary} 桌面的耐心明显变短了。`,
    stakes:
      intensity >= 3
        ? `${selected.stakes} 再慢一步，房间就会把犹豫本身当成你的弱点。`
        : `${selected.stakes} 这轮的容错空间比平时更窄。`,
  };
}

function actionLabel(actionType: RefereeActionType, locale: Locale) {
  const map =
    locale === "zh"
      ? {
          FLIRT: "情绪试探",
          DEBATE: "逻辑压制",
          LEAD: "主导进场",
          RESIST: "稳态抗压",
          DECEIVE: "变线误导",
        }
      : {
          FLIRT: "Emotional Probe",
          DEBATE: "Logic Press",
          LEAD: "Lead Push",
          RESIST: "Resistance Hold",
          DECEIVE: "Misdirect",
        };

  return map[actionType];
}

function successNarrative(actionType: RefereeActionType, locale: Locale) {
  if (locale === "zh") {
    if (actionType === "FLIRT") return "气氛明显被撬动，桌面上的防线先松了一寸。";
    if (actionType === "DEBATE") return "逻辑先一步落桌，对手只能被迫改写自己的节奏。";
    if (actionType === "LEAD") return "主动权被稳稳拿住，房间的视线开始向他倾斜。";
    if (actionType === "DECEIVE") return "假动作生效了，真正的意图被成功藏进了第二层。";
    return "他先把自己稳住，也顺手把场面稳住了。";
  }

  if (actionType === "FLIRT") return "The room gives way first, and the other side has to answer the emotional pressure.";
  if (actionType === "DEBATE") return "Logic lands cleanly, forcing the other side to rewrite their rhythm.";
  if (actionType === "LEAD") return "Control shifts toward them and the room starts to orbit their pace.";
  if (actionType === "DECEIVE") return "The feint lands, and the real move survives one layer deeper.";
  return "They steady themselves first, and the room settles around that decision.";
}

function failureNarrative(actionType: RefereeActionType, locale: Locale) {
  if (locale === "zh") {
    if (actionType === "FLIRT") return "这一手太直了，对手没有接住，反而把距离重新拉开。";
    if (actionType === "DEBATE") return "锋利没有形成压制，反而让自己的意图暴露得更早。";
    if (actionType === "LEAD") return "推进过急，主动权还没立住就先泄了一口气。";
    if (actionType === "DECEIVE") return "假动作被看穿，误导没能成为优势。";
    return "他没能扛住回流压力，局面仍旧不在自己手里。";
  }

  if (actionType === "FLIRT") return "The move lands too directly and the other side widens the distance again.";
  if (actionType === "DEBATE") return "Sharpness turns into exposure before it becomes control.";
  if (actionType === "LEAD") return "The push comes too early and authority slips before it settles.";
  if (actionType === "DECEIVE") return "The feint gets read, so misdirection never becomes leverage.";
  return "They fail to absorb the return pressure, and control stays elsewhere.";
}

function buildArenaActorMessage(args: {
  locale: Locale;
  participant: MatchParticipant;
  persona: PersonaSnapshot;
  actionType: RefereeActionType;
  success: boolean;
  proxyPlan?: ArenaProxyPlan;
}): ArenaMessage {
  const { locale, participant, persona, actionType, success, proxyPlan } = args;
  const sharpStrategist = persona.traitVector.strategy >= 78;
  const highCharm = persona.traitVector.charm >= 72;
  const highCourage = persona.traitVector.courage >= 75;
  const action =
    locale === "zh"
      ? success
        ? actionType === "FLIRT"
          ? highCharm
            ? "他没有急着亮底牌，只把语气压低半寸，像是故意让诱饵先落到桌面中央。"
            : "他没有靠音量抢场，只把靠近这件事做得像一次安静的下注。"
          : actionType === "DEBATE"
            ? sharpStrategist
              ? "他把话锋削得很薄，几乎不给对面留下重新组织立场的空隙。"
              : "他顺着桌面已经露出的破绽补了一刀，逼对面在错误的位置继续发力。"
            : actionType === "LEAD"
              ? highCourage
                ? "他先一步改写了桌上的节奏，逼所有视线都跟着他的手势转向。"
                : "他没有抢得太猛，却在最关键的那一拍把主导权稳稳捏住了。"
              : actionType === "DECEIVE"
                ? "他故意露出一层并不完整的意图，把真正的目标往更深处压了一寸。"
                : "他先把自己稳住，像是在压力上面硬生生钉下一根针。"
        : actionType === "FLIRT"
          ? "他试图把气氛往自己这边拉，但动作刚出手就显得过于明显。"
          : actionType === "DEBATE"
            ? "他把话说得太快，锋利还没形成压制，破绽却先露了出来。"
            : actionType === "LEAD"
              ? "他想抢主导，却在最需要稳住的时候先让节奏滑了一下。"
              : actionType === "DECEIVE"
                ? "他本想藏住真正的意图，可桌面上的人显然没有给他这个机会。"
                : "他撑住了姿态，却没能挡住回流到自己身上的那股压力。"
      : success
        ? "They move with measured control, making the room answer their timing first."
        : "They move early, and the room reads the hesitation before the intent lands.";

  const dialogue =
    locale === "zh"
      ? success
        ? actionType === "FLIRT"
          ? highCharm
            ? "别装作没看见，你其实比他们都更在意谁先失手。"
            : "你现在这副镇定，反而像是在等别人替你先心虚。"
          : actionType === "DEBATE"
            ? sharpStrategist
              ? "你不是没有答案，只是不敢让答案现在就被所有人听见。"
              : "你可以继续嘴硬，但桌上已经有人开始替你补完破绽了。"
            : actionType === "LEAD"
              ? highCourage
                ? "从现在开始，桌上的节奏归我定。"
                : "你们可以不服，但下一拍开始得跟着我走。"
              : actionType === "DECEIVE"
                ? "你看到的那一层，不是我要你真正相信的那一层。"
                : "你们先急，我还没到需要退的时候。"
        : actionType === "FLIRT"
          ? "看来你比我想的还要怕有人把你看穿。"
          : actionType === "DEBATE"
            ? "急着反驳的人，通常最先暴露自己站在哪边。"
            : actionType === "LEAD"
              ? "你们可以不跟，但别假装这不是你们最好的时机。"
              : actionType === "DECEIVE"
                ? "你信得太快了，反而让我开始怀疑自己露得是不是太多。"
                : "你们继续压，我还没准备替谁认输。"
      : success
        ? "You were waiting for me to move first. That was your mistake."
        : "You noticed the slip. That does not make you safe yet.";

  return {
    id: createId("arena_msg"),
    speaker: "participant",
    participantId: participant.id,
    action: proxyPlan?.intent || action,
    dialogue,
    createdAt: new Date().toISOString(),
  };
}

function buildArenaOpeningNarration(args: {
  locale: Locale;
  world: WorldPack;
  eventCard?: ArenaEventCard;
}) {
  const opening =
    args.locale === "zh"
      ? `${args.world.title} 的空气像一张被反复摩挲过的旧赌约，礼貌只是刀锋外面的丝绒。`
      : `${args.world.title} feels like a wager rubbed thin by too many hands; courtesy is only velvet over the blade.`;

  const event =
    args.eventCard
      ? args.locale === "zh"
        ? `${args.eventCard.title} 已经落桌，真正危险的从来不是规则本身，而是谁先被规则逼出破绽。`
        : `${args.eventCard.title} has landed on the table, and the danger is not the rule itself but who breaks under it first.`
      : null;

  return [opening, event].filter(Boolean) as string[];
}

function applySkillSynergy(persona: PersonaSnapshot, skillId: string | undefined, mode: "arena" | "dating") {
  const notes: string[] = [];
  let modifier: Partial<TraitVector> = {};

  if (!skillId) {
    return { modifier, notes };
  }

  const skill = getSkillById(skillId);
  if (!skill) {
    return { modifier, notes: [`Unknown skill ${skillId}`] };
  }

  modifier = { ...skill.modifier };
  notes.push(`${skill.name}: ${skill.flavor}`);

  const hasSocialAnxiety =
    persona.publicTraitTags.some((tag) => /慢热|高敏|社恐/i.test(tag)) ||
    persona.fears.some((fear) => /误解|喧闹/.test(fear));

  if (hasSocialAnxiety && skillId === "spotlight_burst" && mode === "arena") {
    modifier = { ...modifier, charm: -8, resilience: -10 };
    notes.push("Spotlight Burst 对高敏分身形成撕裂反差，放大了失控风险。");
  }

  if (hasSocialAnxiety && skillId === "spotlight_burst" && mode === "dating") {
    modifier = { ...modifier, charm: 6, empathy: 8 };
    notes.push("过亮的开场反而让对方看见了笨拙的真诚。");
  }

  if (skillId === "cold_geometry" && mode === "dating") {
    modifier = { ...modifier, empathy: -12, charm: -6 };
    notes.push("Cold Geometry 让约会气氛迅速降温。");
  }

  return { modifier, notes };
}

function applyMemoryTrait(personaVector: TraitVector, memory?: MemoryTrait) {
  if (!memory) {
    return { vector: personaVector, notes: [] as string[] };
  }

  return {
    vector: mergeTraitVector(personaVector, memory.modifier),
    notes: [`记忆碎片 - ${memory.name}: ${memory.summary}`],
  };
}

function buildRoundNarrativeParagraphs(args: {
  locale: Locale;
  world: WorldPack;
  round: number;
  scoreBoard: RoundScore[];
  participants: MatchParticipant[];
  proxyPlans?: ArenaProxyPlan[];
  eventCard?: ArenaEventCard;
  elimination?: string;
  winnerId?: string;
}) {
  const paragraphs: string[] = [];

  paragraphs.push(
    t(
      args.locale,
      `Round ${args.round} opens inside ${args.world.title}. ${args.world.sanitizedSummary}`,
      `第 ${args.round} 回合在 ${args.world.title} 展开。${args.world.sanitizedSummary}`
    )
  );

  if (args.eventCard) {
    paragraphs.push(
      t(
        args.locale,
        `${args.eventCard.title}: ${args.eventCard.summary} Objective: ${args.eventCard.objective} Stakes: ${args.eventCard.stakes}`,
        `${args.eventCard.title}：${args.eventCard.summary} 目标是${args.eventCard.objective}，代价是${args.eventCard.stakes}`
      )
    );
  }

  for (const score of args.scoreBoard) {
    const participant = args.participants.find((item) => item.id === score.participantId);
    if (!participant) continue;
    const proxyPlan = args.proxyPlans?.find((plan) => plan.participantId === participant.id);
    const referee = score.referee;
    if (!referee) continue;

    const moveLine = proxyPlan
      ? t(
          args.locale,
          `${participant.displayName} enters the round intending to ${proxyPlan.intent}`,
          `${participant.displayName} 这一回合的出手意图是：${proxyPlan.intent}`
        )
      : t(
          args.locale,
          `${participant.displayName} chooses ${actionLabel(referee.actionType as RefereeActionType, args.locale)} as the opening move.`,
          `${participant.displayName} 选择以${actionLabel(referee.actionType as RefereeActionType, args.locale)}作为这一手的开场。`
        );

    const resultLine = referee.success
      ? successNarrative(referee.actionType as RefereeActionType, args.locale)
      : failureNarrative(referee.actionType as RefereeActionType, args.locale);

    const scoreLine = t(
      args.locale,
      `The round shifts by ${score.delta >= 0 ? "+" : ""}${score.delta}, bringing their total to ${score.total}.`,
      `这一手带来 ${score.delta >= 0 ? "+" : ""}${score.delta} 的势头变化，总分来到 ${score.total}。`
    );

    paragraphs.push([moveLine, resultLine, scoreLine].join(" "));
  }

  if (args.elimination) {
    const loser = args.participants.find((item) => item.id === args.elimination);
    if (loser) {
      paragraphs.push(
        t(
          args.locale,
          `${loser.displayName} loses the room at the worst possible moment and is pushed out of the visible table.`,
          `${loser.displayName} 在最糟糕的时刻失去了这间房的节奏，被正式推出公开牌桌。`
        )
      );
    }
  }

  if (args.winnerId) {
    const winner = args.participants.find((item) => item.id === args.winnerId);
    if (winner) {
      paragraphs.push(
        t(
          args.locale,
          `${winner.displayName} takes the final seal of the table and leaves the round as the one everyone else has to explain.`,
          `${winner.displayName} 拿走了这一桌的终局封印，成了全场都得重新解释的人。`
        )
      );
    }
  }

  return paragraphs;
}

export function buildMatchParticipants(
  personas: PersonaSnapshot[],
  personaIds: string[],
  memoryTraits: MemoryTrait[],
  matchId: string
) {
  return personaIds.map((personaId) => {
    const persona = personas.find((item) => item.id === personaId);
    if (!persona) {
      throw new Error(`Missing persona ${personaId}`);
    }

    const memory = memoryTraits.find((item) => item.personaId === persona.id);

    return {
      id: createId("participant"),
      matchId,
      personaId: persona.id,
      displayName: persona.deletedAt ? "[Destroyed Data Ghost]" : persona.name,
      supportTotal: 0,
      skillLoadout: [],
      memoryTraitId: memory?.id,
      isUserOwned: persona.source !== "legend",
      eliminated: false,
      roundScore: 0,
      totalScore: 0,
      ghosted: Boolean(persona.deletedAt || persona.dataGhost),
    } satisfies MatchParticipant;
  });
}

export function evaluateRound(args: {
  locale?: Locale;
  match: ArenaMatch;
  round: number;
  participants: MatchParticipant[];
  personas: PersonaSnapshot[];
  world: WorldPack;
  memoryTraits: MemoryTrait[];
  proxyPlans?: ArenaProxyPlan[];
  eventCard?: ArenaEventCard;
  config?: GameplayConfig;
}) {
  const locale = args.locale || "en";
  const toneModifier = worldToneWeights[args.world.tone] ?? {};
  const scores: RoundScore[] = [];
  const storyLines: string[] = [];
  const messages: ArenaMessage[] = [];
  let elimination: string | undefined;

  const preparedParticipants = args.participants
    .filter((participant) => !participant.eliminated)
    .map((participant) => {
      const persona = args.personas.find((item) => item.id === participant.personaId);
      if (!persona) return null;

      const memory = args.memoryTraits.find((item) => item.id === participant.memoryTraitId);
      const skillId = participant.skillLoadout.at(-1);
      const memoryBlend = applyMemoryTrait(persona.traitVector, memory);
      const synergy = applySkillSynergy(persona, skillId, "arena");
      const vector = mergeTraitVector(mergeTraitVector(memoryBlend.vector, toneModifier), synergy.modifier);
      const proxyPlan = args.proxyPlans?.find((plan) => plan.participantId === participant.id);
      const actionType = proxyPlan?.actionType || pickRefereeAction(vector, args.world.tone);

      return {
        participant,
        persona,
        memoryBlend,
        synergy,
        vector,
        actionType,
        proxyPlan,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  for (const current of preparedParticipants) {
    const oppositionVector = averageTraitVectors(
      preparedParticipants
        .filter((entry) => entry.participant.id !== current.participant.id)
        .map((entry) => entry.vector),
      current.vector
    );
    const referee = calculateRefereeOutcome({
      actionType: current.actionType,
      actorVector: current.vector,
      targetVector: oppositionVector,
      activeTraitIds: extractPersonaTraitFragments(current.persona),
      seed: args.match.seed + args.round * 97 + current.participant.displayName.length,
    });

    const baseScore = vectorToScore(current.vector);
    const rollSwing = Math.round((referee.roll - 0.5) * 10);
    const delta = clamp(
      Math.round(
        baseScore / 12 +
          referee.heartbeatDelta / 3 -
          referee.pressureDelta / 4 +
          rollSwing +
          (args.round === 1 ? args.config?.arena.openingPressureBoost || 0 : 0)
      ),
      -5,
      24
    );
    const total = current.participant.totalScore + delta;

    const notes = [
      t(locale, `${current.persona.name} enters ${args.world.title} carrying ${formatList(current.persona.publicTraitTags.slice(0, 3))}.`, `${current.persona.name} 带着 ${formatList(current.persona.publicTraitTags.slice(0, 3))} 踏入 ${args.world.title}。`),
      ...current.memoryBlend.notes,
      ...current.synergy.notes,
      t(
        locale,
        `${actionLabel(current.actionType, locale)} ${referee.success ? "succeeds" : "fails"} with roll ${referee.roll.toFixed(2)} against ${referee.threshold.toFixed(2)}.`,
        `${actionLabel(current.actionType, locale)} 判定${referee.success ? "成功" : "失败"}，掷骰 ${referee.roll.toFixed(2)}，阈值 ${referee.threshold.toFixed(2)}。`
      ),
      ...(current.proxyPlan
        ? [t(locale, `Auto-pilot intent: ${current.proxyPlan.intent}`, `托管意图：${current.proxyPlan.intent}`)]
        : []),
      ...referee.directives.slice(0, 2).map((directive) =>
        t(locale, `Referee directive: ${directive}`, `裁判指令：${directive}`)
      ),
      t(
        locale,
        `World tone ${args.world.tone} pushes the scene toward ${formatList(args.world.conflicts.slice(0, 2))}.`,
        `世界氛围 ${args.world.tone} 正把剧情推向 ${formatList(args.world.conflicts.slice(0, 2))}。`
      ),
    ];

    current.participant.roundScore = delta;
    current.participant.totalScore = total;

    scores.push({
      participantId: current.participant.id,
      delta,
      total,
      notes,
      referee: {
        actionType: current.actionType,
        success: referee.success,
        roll: referee.roll,
        threshold: referee.threshold,
        heartbeatDelta: referee.heartbeatDelta,
        pressureDelta: referee.pressureDelta,
        summary: referee.summary,
        directives: referee.directives,
      },
    });

    storyLines.push(
      t(
        locale,
        `${current.participant.displayName} shifts by ${delta >= 0 ? "+" : ""}${delta} in round ${args.round}.`,
        `${current.participant.displayName} 在第 ${args.round} 回合的势头变化为 ${delta >= 0 ? "+" : ""}${delta}。`
      )
    );

    messages.push(
      buildArenaActorMessage({
        locale,
        participant: current.participant,
        persona: current.persona,
        actionType: current.actionType,
        success: referee.success,
        proxyPlan: current.proxyPlan,
      })
    );
  }

  const activeScores = scores
    .map((score) => ({ ...score, participant: args.participants.find((item) => item.id === score.participantId)! }))
    .sort((a, b) => a.total - b.total);

  if (args.round === 2 && activeScores.length > 2) {
    const loser = activeScores[0];
    loser.participant.eliminated = true;
    elimination = loser.participant.id;
  }

  if (args.round === 3) {
    const sorted = [...activeScores].sort((a, b) => b.total - a.total);
    const winner = sorted[0]?.participant;
    if (winner) {
      args.match.winnerId = winner.id;
      args.match.publicStoryStatus = "complete";
    }
  }

  const chapterParagraphs = buildRoundNarrativeParagraphs({
    locale,
    world: args.world,
    round: args.round,
    scoreBoard: scores,
    participants: args.participants,
    proxyPlans: args.proxyPlans,
    eventCard: args.eventCard,
    elimination,
    winnerId: args.match.winnerId,
  });

  const narrativeMessages = buildArenaOpeningNarration({
    locale,
    world: args.world,
    eventCard: args.eventCard,
  }).map((text) => ({
    id: createId("arena_msg"),
    speaker: "system" as const,
    text,
    createdAt: new Date().toISOString(),
  }));

  if (elimination) {
    const loser = args.participants.find((item) => item.id === elimination);
    if (loser) {
      messages.push({
        id: createId("arena_msg"),
        speaker: "system",
        text:
          locale === "zh"
            ? `${loser.displayName} 被推出了主牌桌，房间里所有人的呼吸都跟着空了一拍。`
            : `${loser.displayName} is pushed off the main table, and the room loses a beat with them.`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return {
    scores,
    storyLines: chapterParagraphs,
    messages: [...narrativeMessages, ...messages],
    elimination,
  };
}

export function buildStreamRecord(args: {
  locale?: Locale;
  match: ArenaMatch;
  round: number;
  world: WorldPack;
  participants: MatchParticipant[];
  scoreBoard: RoundScore[];
  storyLines: string[];
  messages?: ArenaMessage[];
  elimination?: string;
  proxyPlans?: ArenaProxyPlan[];
  eventCard?: ArenaEventCard;
}) {
  const title = t(args.locale || "en", args.round === 1 ? "Opening Stake" : args.round === 2 ? "Reverse Ledger" : "Final Seal", args.round === 1 ? "开局落注" : args.round === 2 ? "反转账本" : "终局封印");
  const finalChapter = [title, ...args.storyLines].join("\n\n");
  const segments = finalChapter.split(/\n\n/).map((segment) => segment.trim()).filter(Boolean);

  return {
    id: createId("stream"),
    matchId: args.match.id,
    round: args.round,
    phase: "queued",
    segments,
    finalChapter,
    messages: args.messages || [],
    elimination: args.elimination,
    scoreBoard: args.scoreBoard,
    proxyPlans: args.proxyPlans,
    eventCard: args.eventCard,
    winnerId: args.match.winnerId,
  } satisfies StreamRecord;
}

export { buildArenaEventCard };

export function settleSupportRewards(args: {
  user: UserRecord;
  match: ArenaMatch;
  supportTickets: SupportTicket[];
}) {
  if (!args.match.winnerId) return;

  for (const ticket of args.supportTickets.filter((item) => item.matchId === args.match.id && item.status === "active")) {
    if (ticket.participantId === args.match.winnerId) {
      const reward = [...rewardTiers].reverse().find((tier) => ticket.renownSpent >= tier.threshold) ?? rewardTiers[0];
      ticket.status = "won";
      args.user.wallet.renown += reward.renownBonus;
      args.user.wallet.seasonPoints += reward.seasonPoints;
    } else {
      ticket.status = "lost";
    }
  }
}

export function createMemoryTrait(args: {
  userId: string;
  personaId: string;
  matchId: string;
  match: ArenaMatch;
  participants: MatchParticipant[];
}) {
  const participant = args.participants.find((item) => item.id === args.match.winnerId);
  const triggerType = participant?.personaId === args.personaId ? "champion" : "survivor";
  const rarity = triggerType === "champion" ? "legendary" : "rare";
  const modifier = triggerType === "champion" ? { courage: 8, strategy: 7 } : { resilience: 6, empathy: 4 };

  return {
    id: createId("memory"),
    userId: args.userId,
    personaId: args.personaId,
    originMatchId: args.matchId,
    name: triggerType === "champion" ? "Crown Echo" : "Survivor's Hush",
    triggerType,
    modifier,
    rarity,
    seasonId: "season_founders",
    summary:
      triggerType === "champion"
        ? "上一代在残局里把命运往自己这边扳了半寸。"
        : "上一代在高压场里学会了怎样把心跳压进呼吸里。",
  } satisfies MemoryTrait;
}
