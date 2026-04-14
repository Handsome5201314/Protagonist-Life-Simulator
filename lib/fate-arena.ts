import type {
  ArenaMatch,
  ArenaProxyMode,
  MatchParticipant,
  PersonaSnapshot,
  WorldPack,
} from "@/lib/types";

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
  personaId: string;
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
  ctaHref: string;
  prepHref: string;
  roomHref: string;
  roster: FateSeat[];
  signalLine: string;
  worldPackId?: string;
  isPreviewRoom: boolean;
};

export type FatePrepView = {
  id: string;
  title: string;
  description: string;
  signalLine: string;
  typeTags: string[];
  statusLabel: string;
  maxPlayers: number;
  selectedMode: FateModeId;
  proxyMode: ArenaProxyMode;
  briefing: string;
  activeSeats: FateSeat[];
  reserveSeats: FateSeat[];
  roomHref: string;
  prepHref: string;
  canPersist: boolean;
  helperText?: string;
};

type BuildLobbyInput = {
  worldPacks: WorldPack[];
  matches: ArenaMatch[];
  participants: MatchParticipant[];
  personas: PersonaSnapshot[];
};

type RoomBlueprint = Omit<FateRoomCard, "ctaHref" | "prepHref" | "roomHref" | "roster" | "isPreviewRoom"> & {
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
    id: "wasteland-signal",
    title: "废土信号塔·第七次求生广播",
    category: "survival",
    typeTags: ["废土", "生存"],
    hook: "氧气只够四个人活到黎明，任何信任都带着倒计时。",
    description: "塔顶广播正在招募最后的共生对象，谁先暴露底牌，谁就会被风沙记住。",
    players: 2,
    maxPlayers: 4,
    spectators: 1432,
    prizePool: 38600,
    status: "recruiting",
    statusLabel: "房间预览",
    ctaLabel: "查看准备室",
    signalLine: "夜风会先吹灭火堆，还是先吹散临时同盟。",
    rosterOffset: 2,
  },
  {
    id: "boardroom-eclipse",
    title: "财阀月蚀·并购告白局",
    category: "business",
    typeTags: ["财阀", "博弈"],
    hook: "董事会灯光只照亮桌面，不照亮每个人真正想拿走的心脏。",
    description: "牌桌已经搭好，危险的人正在等一个愿意先开口的人。",
    players: 3,
    maxPlayers: 4,
    spectators: 5012,
    prizePool: 146000,
    status: "running",
    statusLabel: "房间预览",
    ctaLabel: "查看准备室",
    signalLine: "最危险的人从来不是最会说话的人，而是最会等待的人。",
    rosterOffset: 4,
  },
  {
    id: "mirror-hearing",
    title: "镜像法庭·心动听证会",
    category: "mystery",
    typeTags: ["悬疑", "秘审"],
    hook: "每位当事人都有一份被篡改过的证词，真相只在裂缝里发光。",
    description: "审判席仍空着两位证人，你的分身可以决定这场听证会更像告白还是围猎。",
    players: 2,
    maxPlayers: 4,
    spectators: 1988,
    prizePool: 62400,
    status: "recruiting",
    statusLabel: "房间预览",
    ctaLabel: "查看准备室",
    signalLine: "最先说出真心的人，未必是最诚实的人。",
    rosterOffset: 1,
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

function deriveSeat(persona: PersonaSnapshot, index: number, participantId?: string): FateSeat {
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
    id: participantId || persona.id,
    personaId: persona.id,
    name: persona.dataGhost?.displayAlias || persona.name,
    role,
    tags: topTraits.map((trait) => traitLabels[trait]),
    hue,
    isUserOwned: persona.relation === "SELF",
  };
}

function buildSeatPool(personas: PersonaSnapshot[]) {
  const adultPool = personas.filter((persona) => persona.adultOnlyEligible || persona.source === "legend");
  return adultPool.map((persona, index) => deriveSeat(persona, index));
}

function rotateSeats(pool: FateSeat[], offset: number, count: number) {
  if (!pool.length) return [];
  return Array.from({ length: count }, (_, index) => pool[(offset + index) % pool.length]);
}

function buildMatchRoom(match: ArenaMatch, input: BuildLobbyInput): FateRoomCard {
  const world = input.worldPacks.find((item) => item.id === match.worldPackId);
  const category = inferCategory(world);
  const matchParticipants = input.participants.filter(
    (participant) => participant.matchId === match.id || match.participantIds.includes(participant.id)
  );
  const participantByPersona = new Map(matchParticipants.map((participant) => [participant.personaId, participant] as const));
  const roster = match.prep.seatOrder
    .map((personaId, index) => {
      const persona = input.personas.find((item) => item.id === personaId);
      const participant = participantByPersona.get(personaId);
      return persona && participant ? deriveSeat(persona, index, participant.id) : null;
    })
    .filter((seat): seat is FateSeat => Boolean(seat));

  const status: FateRoomStatus =
    match.publicStoryStatus === "complete"
      ? "replay"
      : match.publicStoryStatus === "streaming"
        ? "running"
        : "recruiting";

  const prizePool = Math.max(24600, match.supportPool * 120 + roster.length * 8800);
  const spectators = 900 + roster.length * 260 + (status === "running" ? 1800 : 420);
  const ctaLabel = status === "recruiting" ? "查看准备室" : status === "replay" ? "打开回放" : "立即围观";
  const prepHref = `/arena/prep/${match.id}`;
  const roomHref = `/arena/room/${match.id}`;

  return {
    id: match.id,
    title: normalizeTitle(world),
    category,
    typeTags: normalizeTags(category, world),
    hook: world?.theme || "命运正在重组剧本结构。",
    description: world?.sanitizedSummary || "故事核心尚未公开，但所有下注都已经开始流动。",
    players: roster.length,
    maxPlayers: match.maxParticipants,
    spectators,
    prizePool,
    status,
    statusLabel: status === "running" ? "进行中" : status === "replay" ? "可回放" : "招募中",
    ctaLabel,
    ctaHref: status === "recruiting" ? prepHref : roomHref,
    prepHref,
    roomHref,
    roster,
    signalLine: toneToSignal(world, category),
    worldPackId: world?.id,
    isPreviewRoom: false,
  };
}

function buildBlueprintRoom(blueprint: RoomBlueprint, seatPool: FateSeat[]): FateRoomCard {
  const prepHref = `/arena/prep/${blueprint.id}`;
  return {
    ...blueprint,
    ctaHref: prepHref,
    prepHref,
    roomHref: `/arena/room/${blueprint.id}`,
    roster: rotateSeats(seatPool, blueprint.rosterOffset, 6),
    isPreviewRoom: true,
  };
}

export function buildFateLobbyRooms(input: BuildLobbyInput) {
  const seatPool = buildSeatPool(input.personas);
  const matchRooms = input.matches.map((match) => buildMatchRoom(match, input));
  const existingIds = new Set(matchRooms.map((room) => room.id));
  const previewRooms = fallbackBlueprints
    .filter((blueprint) => !existingIds.has(blueprint.id))
    .map((blueprint) => buildBlueprintRoom(blueprint, seatPool));

  return [...matchRooms, ...previewRooms];
}

export function findFateRoomById(roomId: string, input: BuildLobbyInput) {
  return buildFateLobbyRooms(input).find((room) => room.id === roomId) ?? null;
}

export function buildFatePrepView(roomId: string, input: BuildLobbyInput): FatePrepView | null {
  const match = input.matches.find((item) => item.id === roomId);
  if (match) {
    const world = input.worldPacks.find((item) => item.id === match.worldPackId);
    const participants = input.participants.filter(
      (participant) => participant.matchId === match.id || match.participantIds.includes(participant.id)
    );
    const participantByPersona = new Map(participants.map((participant) => [participant.personaId, participant] as const));
    const activeSeats = match.prep.seatOrder
      .map((personaId, index) => {
        const persona = input.personas.find((item) => item.id === personaId);
        const participant = participantByPersona.get(personaId);
        return persona && participant ? deriveSeat(persona, index, participant.id) : null;
      })
      .filter((seat): seat is FateSeat => Boolean(seat));
    const reserveSeats = match.prep.reservePersonaIds
      .map((personaId, index) => {
        const persona = input.personas.find((item) => item.id === personaId);
        const participant = participantByPersona.get(personaId);
        return persona ? deriveSeat(persona, index + activeSeats.length, participant?.id) : null;
      })
      .filter((seat): seat is FateSeat => Boolean(seat));

    return {
      id: match.id,
      title: normalizeTitle(world),
      description: world?.sanitizedSummary || "这个房间仍在凝结自己的命运规则。",
      signalLine: toneToSignal(world, inferCategory(world)),
      typeTags: normalizeTags(inferCategory(world), world),
      statusLabel: match.publicStoryStatus === "draft" ? "待开始" : match.publicStoryStatus === "streaming" ? "进行中" : "已封存",
      maxPlayers: match.maxParticipants,
      selectedMode: match.prep.mode,
      proxyMode: match.prep.proxyMode === "ai" ? "ai" : "self",
      briefing: match.prep.briefing || world?.sanitizedSummary || "这个房间仍在凝结自己的命运规则。",
      activeSeats,
      reserveSeats,
      roomHref: `/arena/${match.id}`,
      prepHref: `/arena/prep/${match.id}`,
      canPersist: match.publicStoryStatus === "draft",
      helperText:
        match.publicStoryStatus === "draft"
          ? "当前编排会实时写回房间状态，刷新后仍会保留。"
          : "该房间已经开始推演，准备室只保留只读视图。",
    };
  }

  const blueprint = fallbackBlueprints.find((item) => item.id === roomId);
  if (!blueprint) return null;

  const seatPool = buildSeatPool(input.personas);
  return {
    id: blueprint.id,
    title: blueprint.title,
    description: blueprint.description,
    signalLine: blueprint.signalLine,
    typeTags: blueprint.typeTags,
    statusLabel: blueprint.statusLabel,
    maxPlayers: blueprint.maxPlayers,
    selectedMode: "rapid",
    proxyMode: "self",
    briefing: blueprint.description,
    activeSeats: rotateSeats(seatPool, blueprint.rosterOffset, blueprint.players),
    reserveSeats: rotateSeats(seatPool, blueprint.rosterOffset + blueprint.players, 6),
    roomHref: `/arena/room/${blueprint.id}`,
    prepHref: `/arena/prep/${blueprint.id}`,
    canPersist: false,
    helperText: "这是一个大厅预览房间。注入分身并创建真实牌桌后，才会启用持久化编排。",
  };
}
