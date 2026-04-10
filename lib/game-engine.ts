import { getSkillById, rewardTiers, worldToneWeights } from "@/lib/catalog";
import type {
  ArenaMatch,
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
import { average, clamp, createId, formatList, mergeTraitVector, pick, seededNumber } from "@/lib/utils";

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

function applySkillSynergy(
  persona: PersonaSnapshot,
  skillId: string | undefined,
  mode: "arena" | "dating"
) {
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

  const hasSocialAnxiety = persona.publicTraitTags.some((tag) => /慢热|高敏|社恐/i.test(tag)) || persona.fears.some((fear) => /误解|喧嚣/.test(fear));

  if (hasSocialAnxiety && skillId === "spotlight_burst" && mode === "arena") {
    modifier = { ...modifier, charm: -8, resilience: -10 };
    notes.push("撕裂的反差: Spotlight Burst 把社恐主角直接推向失控边缘。");
  }

  if (hasSocialAnxiety && skillId === "spotlight_burst" && mode === "dating") {
    modifier = { ...modifier, charm: 6, empathy: 8 };
    notes.push("笨拙的真诚: 过亮的开场反而让对方看见了真实心跳。");
  }

  if (skillId === "cold_geometry" && mode === "dating") {
    modifier = { ...modifier, empathy: -12, charm: -6 };
    notes.push("理性过载: 约会不是审讯，Cold Geometry 让气氛立刻降温。");
  }

  return { modifier, notes };
}

function applyMemoryTrait(personaVector: TraitVector, memory?: MemoryTrait) {
  if (!memory) {
    return { vector: personaVector, notes: [] as string[] };
  }

  return {
    vector: mergeTraitVector(personaVector, memory.modifier),
    notes: [`Memory Trait - ${memory.name}: ${memory.summary}`],
  };
}

export function buildMatchParticipants(
  personas: PersonaSnapshot[],
  participantIds: string[],
  memoryTraits: MemoryTrait[]
) {
  return participantIds.map((personaId) => {
    const persona = personas.find((item) => item.id === personaId);
    if (!persona) {
      throw new Error(`Missing persona ${personaId}`);
    }

    const memory = memoryTraits.find((item) => item.personaId === persona.id);

    const participant: MatchParticipant = {
      id: createId("participant"),
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
    };

    return participant;
  });
}

export function evaluateRound(args: {
  match: ArenaMatch;
  round: number;
  participants: MatchParticipant[];
  personas: PersonaSnapshot[];
  world: WorldPack;
  memoryTraits: MemoryTrait[];
}) {
  const toneModifier = worldToneWeights[args.world.tone] ?? {};
  const scores: RoundScore[] = [];
  const storyLines: string[] = [];
  let elimination: string | undefined;

  for (const participant of args.participants) {
    if (participant.eliminated) {
      continue;
    }

    const persona = args.personas.find((item) => item.id === participant.personaId);
    if (!persona) {
      continue;
    }

    const memory = args.memoryTraits.find((item) => item.id === participant.memoryTraitId);
    const skillId = participant.skillLoadout.at(-1);
    const memoryBlend = applyMemoryTrait(persona.traitVector, memory);
    const synergy = applySkillSynergy(persona, skillId, "arena");
    const vector = mergeTraitVector(mergeTraitVector(memoryBlend.vector, toneModifier), synergy.modifier);

    const baseScore = vectorToScore(vector);
    const seededSwing = Math.floor(seededNumber(args.match.seed + args.round + participant.displayName.length, args.round) * 18) - 8;
    const delta = clamp(Math.round(baseScore / 8 + seededSwing), -3, 22);
    const total = participant.totalScore + delta;
    const notes = [
      `${persona.name} enters ${args.world.title} carrying ${formatList(persona.publicTraitTags.slice(0, 3))}.`,
      ...memoryBlend.notes,
      ...synergy.notes,
      `World tone ${args.world.tone} nudges the scene toward ${formatList(args.world.conflicts.slice(0, 2))}.`,
    ];

    participant.roundScore = delta;
    participant.totalScore = total;

    scores.push({
      participantId: participant.id,
      delta,
      total,
      notes,
    });

    storyLines.push(
      `${participant.displayName} pushes through round ${args.round} with a momentum shift of ${delta >= 0 ? "+" : ""}${delta}. ${pick(
        notes,
        total
      )}`
    );
  }

  const activeScores = scores
    .map((score) => ({ ...score, participant: args.participants.find((item) => item.id === score.participantId)! }))
    .sort((a, b) => a.total - b.total);

  if (args.round === 2 && activeScores.length > 2) {
    const loser = activeScores[0];
    loser.participant.eliminated = true;
    elimination = loser.participant.id;
    storyLines.push(
      `${loser.participant.displayName} misreads the room at the worst moment possible and falls into the shadow ledger.`
    );
  }

  if (args.round === 3) {
    const sorted = [...activeScores].sort((a, b) => b.total - a.total);
    const winner = sorted[0]?.participant;
    if (winner) {
      args.match.winnerId = winner.id;
      args.match.publicStoryStatus = "complete";
      storyLines.push(
        `${winner.displayName} takes the final line of the chapter and seals the table with the sort of ending that gets screenshotted across time zones.`
      );
    }
  }

  return {
    scores,
    storyLines,
    elimination,
  };
}

export function buildStreamRecord(args: {
  match: ArenaMatch;
  round: number;
  world: WorldPack;
  participants: MatchParticipant[];
  scoreBoard: RoundScore[];
  storyLines: string[];
  elimination?: string;
}) {
  const title = args.round === 1 ? "Opening Stake" : args.round === 2 ? "Reverse Ledger" : "Final Seal";
  const opening = `${title}\n${args.world.title} opens another velvet wound. ${args.world.sanitizedSummary}`;
  const scoreLines = args.scoreBoard.map((score) => {
    const participant = args.participants.find((item) => item.id === score.participantId);
    return `${participant?.displayName}: ${score.delta >= 0 ? "+" : ""}${score.delta} this round, total ${score.total}.`;
  });

  const finalChapter = [opening, ...args.storyLines, ...scoreLines].join("\n\n");

  const segments = finalChapter
    .split(/\n\n/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const stream: StreamRecord = {
    id: createId("stream"),
    matchId: args.match.id,
    round: args.round,
    phase: "queued",
    segments,
    finalChapter,
    elimination: args.elimination,
    scoreBoard: args.scoreBoard,
    winnerId: args.match.winnerId,
  };

  return stream;
}

export function settleSupportRewards(args: {
  user: UserRecord;
  match: ArenaMatch;
  supportTickets: SupportTicket[];
}) {
  if (!args.match.winnerId) {
    return;
  }

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
