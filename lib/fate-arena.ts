import type { ArenaMatch, MatchParticipant, PersonaSnapshot, WorldPack } from "@/lib/types";

export type FateCategory = "romance" | "survival" | "business" | "mystery";
export type FateRoomStatus = "recruiting" | "running" | "replay";
export type FateModeId = "rapid" | "immersive";

export type FateSeat = {
  id: string;
  name: string;
  role: string;
  tags: string[];
  hue: "pink" | "violet" | "cyan" | "amber";
  isUserOwned: boolean;
};

export type FateRoomCard = {
  id: string;
  title: string;
  category: FateCategory;
  typeTags: string[];
  hook: string;
  description: string;
  players: number;
  maxPlayers: number;
  spectators: number;
  prizePool: number;
  status: FateRoomStatus;
  statusLabel: string;
  ctaLabel: string;
  prepHref: string;
  roomHref: string;
  roster: FateSeat[];
  signalLine: string;
  worldPackId?: string;
};

type BuildLobbyInput = {
  worldPacks: WorldPack[];
  matches: ArenaMatch[];
  participants: MatchParticipant[];
  personas: PersonaSnapshot[];
};

type RoomBlueprint = Omit<FateRoomCard, "prepHref" | "roomHref" | "roster"> & {
  rosterOffset: number;
};

const traitLabels = {
  charm: "高魅",
  resilience: "稳场",
  focus: "冷静",
  empathy: "高敏",
  strategy: "谋定",
  chaos: "野路",
  courage: "破局",
} as const;

const fallbackBlueprints: RoomBlueprint[] = [
  {
    id: "world_curated_tarot",
    title: "塔罗使团·婚约外交",
    category: "romance",
    typeTags: ["相亲", "秘仪"],
    hook: "每一次眨眼都是一张暗牌，每一句客套都在争夺婚约主导权。",
    description: "使团宴会厅已经升温，三位数字分身就位，剩下一席等你注入。",
    players: 3,
    maxPlayers: 4,
    spectators: 2684,
    prizePool: 82000,
    status: "recruiting",
    statusLabel: "招募中",
    ctaLabel: "注入分身",
    signalLine: "礼仪越完美，越说明有人已经准备翻桌。",
    rosterOffset: 1,
  },
  {
    id: "wasteland-signal",
    title: "废土信号塔·第七次相亲",
    category: "survival",
    typeTags: ["废土", "相亲"],
    hook: "氧气只够四个人活到黎明，爱意和物资只能保住一样。",
    description: "塔顶广播正在招募最后的共生对象，谁先坦白底牌，谁就先暴露弱点。",
    players: 2,
    maxPlayers: 4,
    spectators: 1432,
    prizePool: 38600,
    status: "recruiting",
    statusLabel: "招募中",
    ctaLabel: "注入分身",
    signalLine: "夜风会先吹灭火堆，还是先吹散同盟。",
    rosterOffset: 3,
  },
  {
    id: "boardroom-eclipse",
    title: "财阀月蚀·并购告白局",
    category: "business",
    typeTags: ["财阀", "博弈"],
    hook: "董事会灯光只照亮桌面，不照亮每个人真正想拿走的心脏。",
    description: "四席已满，观众正在押注谁会先用温柔完成一次资本级收网。",
    players: 4,
    maxPlayers: 4,
    spectators: 5012,
    prizePool: 146000,
    status: "running",
    statusLabel: "进行中",
    ctaLabel: "立即围观",
    signalLine: "最危险的人从来不是最会说话的人，而是最会等待的人。",
    rosterOffset: 5,
  },
  {
    id: "mirror-hearing",
    title: "镜像法庭·心动听证会",
    category: "mystery",
    typeTags: ["悬疑", "秘审"],
    hook: "每位当事人都有一份被篡改过的记忆证词，真相只在裂缝里发光。",
    description: "审判席仍空着两位证人，你的分身可以决定这场听证会更像告白还是围猎。",
    players: 2,
    maxPlayers: 4,
    spectators: 1988,
    prizePool: 62400,
    status: "recruiting",
    statusLabel: "招募中",
    ctaLabel: "注入分身",
    signalLine: "最先说出真心的人，未必是最诚实的人。",
    rosterOffset: 2,
  },
  {
    id: "orbital-salon",
    title: "深潜轨道·零重力晚宴",
    category: "romance",
    typeTags: ["赛博", "相亲"],
    hook: "失重让谎言浮起来，也让克制失去最后一层重力约束。",
    description: "观景舱中已经有三位分身互探底牌，围观席的弹幕正在逼近峰值。",
    players: 3,
    maxPlayers: 4,
    spectators: 3276,
    prizePool: 93400,
    status: "running",
    statusLabel: "进行中",
    ctaLabel: "立即围观",
    signalLine: "当心动开始漂浮，理性也会失重。",
    rosterOffset: 4,
  },
];

function inferCategory(world?: WorldPack): FateCategory {
  const text = `${world?.title ?? ""} ${world?.theme ?? ""} ${world?.sanitizedSummary ?? ""}`.toLowerCase();
  if (/(tarot|婚约|相亲|date|embassy|love|romance)/.test(text)) return "romance";
  if (/(casino|capital|board|debt|财阀|并购|market)/.test(text)) return "business";
  if (/(waste|survival|废土|signal|oxygen)/.test(text)) return "survival";
  return "mystery";
}

function normalizeTitle(world?: WorldPack) {
  if (!world) return "未知剧本";
  if (world.id === "world_curated_clock") return "钟楼翡翠赌局";
  if (world.id === "world_curated_tarot") return "塔罗使团·婚约外交";
  return world.title;
}

function normalizeTags(category: FateCategory, world?: WorldPack) {
  if (category === "romance") return ["相亲", "羁绊"];
  if (category === "survival") return ["废土", "求生"];
  if (category === "business") return ["财阀", "博弈"];
  if (world?.id === "world_curated_clock") return ["悬疑", "赌局"];
  return ["秘仪", "悬疑"];
}

function toneToSignal(world?: WorldPack, category?: FateCategory) {
  if (world?.id === "world_curated_clock") return "所有礼貌都在发光，也都在藏刀。";
  if (world?.id === "world_curated_tarot") return "外交辞令的尽头，往往是更危险的告白。";
  if (category === "survival") return "资源短缺会让亲密关系提前暴露结构。";
  if (category === "business") return "情绪只是筹码，沉默才是定价权。";
  return "命运从不公开答案，只公开下注窗口。";
}

function getTopTraits(persona: PersonaSnapshot) {
  return Object.entries(persona.traitVector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key as keyof typeof persona.traitVector);
}

function deriveSeat(persona: PersonaSnapshot, index: number): FateSeat {
  const topTraits = getTopTraits(persona);
  const lead = topTraits[0];

  const role =
    lead === "empathy"
      ? "高敏共振"
      : lead === "strategy"
        ? "谋定试探"
        : lead === "focus"
          ? "冷静观察"
          : lead === "charm"
            ? "霓光撩拨"
            : lead === "resilience"
              ? "稳场压舱"
              : lead === "courage"
                ? "破局直给"
                : "野路引爆";

  const hue: FateSeat["hue"] =
    lead === "strategy"
      ? "violet"
      : lead === "focus"
        ? "cyan"
        : lead === "resilience"
          ? "amber"
          : index % 2 === 0
            ? "pink"
            : "violet";

  return {
    id: persona.id,
    name: persona.name,
    role,
    tags: topTraits.map((trait) => traitLabels[trait]),
    hue,
    isUserOwned: persona.relation === "SELF",
  };
}

function buildSeatPool(personas: PersonaSnapshot[]) {
  const adultPool = personas.filter((persona) => persona.adultOnlyEligible);
  return adultPool.map((persona, index) => deriveSeat(persona, index));
}

function rotateSeats(pool: FateSeat[], offset: number, count: number) {
  if (!pool.length) return [];
  return Array.from({ length: count }, (_, index) => pool[(offset + index) % pool.length]);
}

function buildMatchRoom(match: ArenaMatch, input: BuildLobbyInput, seatPool: FateSeat[]): FateRoomCard {
  const world = input.worldPacks.find((item) => item.id === match.worldPackId);
  const category = inferCategory(world);
  const roomParticipants = input.participants.filter((participant) => match.participantIds.includes(participant.id));
  const roster = roomParticipants
    .map((participant, index) => {
      const persona = input.personas.find((item) => item.id === participant.personaId);
      if (!persona) {
        return {
          id: participant.id,
          name: participant.displayName,
          role: participant.isUserOwned ? "玩家分身" : "剧情分身",
          tags: ["在场", "活跃", "同步"],
          hue: index % 2 === 0 ? "pink" : "violet",
          isUserOwned: participant.isUserOwned,
        } satisfies FateSeat;
      }

      return {
        ...deriveSeat(persona, index),
        id: participant.id,
        name: participant.displayName,
        isUserOwned: participant.isUserOwned,
      };
    })
    .concat(rotateSeats(seatPool, 2, 6))
    .filter((seat, index, collection) => collection.findIndex((item) => item.id === seat.id) === index)
    .slice(0, Math.max(6, roomParticipants.length));

  const status: FateRoomStatus =
    match.publicStoryStatus === "complete"
      ? "replay"
      : match.publicStoryStatus === "streaming"
        ? "running"
        : "recruiting";

  const prizePool = Math.max(24600, match.supportPool * 120 + roomParticipants.length * 8800);
  const spectators = 900 + roomParticipants.length * 260 + (status === "running" ? 1800 : 420);

  return {
    id: match.id,
    title: normalizeTitle(world),
    category,
    typeTags: normalizeTags(category, world),
    hook: world?.theme || "命运正在重组剧本结构。",
    description: world?.sanitizedSummary || "故事核心尚未公开，但所有下注都已经开始流动。",
    players: roomParticipants.length,
    maxPlayers: match.maxParticipants,
    spectators,
    prizePool,
    status,
    statusLabel: status === "running" ? "进行中" : status === "replay" ? "可回放" : "招募中",
    ctaLabel: status === "recruiting" ? "注入分身" : status === "replay" ? "打开回放" : "立即围观",
    prepHref: `/arena/prep/${match.id}`,
    roomHref: `/arena/room/${match.id}`,
    roster,
    signalLine: toneToSignal(world, category),
    worldPackId: world?.id,
  };
}

function buildBlueprintRoom(blueprint: RoomBlueprint, seatPool: FateSeat[]): FateRoomCard {
  return {
    ...blueprint,
    prepHref: `/arena/prep/${blueprint.id}`,
    roomHref: blueprint.status === "recruiting" ? `/arena/prep/${blueprint.id}` : `/arena/room/${blueprint.id}`,
    roster: rotateSeats(seatPool, blueprint.rosterOffset, 6),
  };
}

export function buildFateLobbyRooms(input: BuildLobbyInput) {
  const seatPool = buildSeatPool(input.personas);
  const matchRooms = input.matches.map((match) => buildMatchRoom(match, input, seatPool));
  const existingIds = new Set(matchRooms.map((room) => room.id));
  const extraRooms = fallbackBlueprints
    .filter((blueprint) => !existingIds.has(blueprint.id))
    .map((blueprint) => buildBlueprintRoom(blueprint, seatPool));

  return [...matchRooms, ...extraRooms];
}

export function findFateRoomById(roomId: string, input: BuildLobbyInput) {
  return buildFateLobbyRooms(input).find((room) => room.id === roomId) ?? null;
}
