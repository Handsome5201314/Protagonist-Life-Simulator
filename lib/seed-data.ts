import type { AppDatabase, PersonaOverlay, PersonaSnapshot, TraitVector, UserRecord, WorldPack } from "@/lib/types";
import { addDays, createId, createLockedHash, nowIso } from "@/lib/utils";

function vector(values: Partial<TraitVector>): TraitVector {
  return {
    charm: values.charm ?? 50,
    resilience: values.resilience ?? 50,
    focus: values.focus ?? 50,
    empathy: values.empathy ?? 50,
    strategy: values.strategy ?? 50,
    chaos: values.chaos ?? 50,
    courage: values.courage ?? 50,
  };
}

const demoUser: UserRecord = {
  id: "user_demo",
  displayName: "Vault Keeper",
  seasonId: "season_founders",
  wallet: {
    renown: 120,
    diamonds: 36,
    seasonPoints: 0,
    supportStreak: 0,
  },
  linkedAiliangbiao: {
    status: "unlinked",
  },
  createdAt: nowIso(),
  updatedAt: nowIso(),
};

const personaA: PersonaSnapshot = {
  id: "persona_demo_self",
  userId: demoUser.id,
  source: "upload",
  assessmentVersion: "1.0",
  name: "Crimson Archivist",
  relation: "SELF",
  ageBand: "adult",
  adultOnlyEligible: true,
  traitVector: vector({
    charm: 61,
    resilience: 74,
    focus: 66,
    empathy: 57,
    strategy: 69,
    chaos: 28,
    courage: 64,
  }),
  publicTraitTags: ["慎密", "压场感", "故事脑", "先观察后出手"],
  fears: ["被彻底误解", "喧嚣失控"],
  interests: ["长篇小说", "赛博民俗", "塔罗意象"],
  communicationStyle: "slow-burn tactician",
  careerTilt: "strategy & storytelling",
  riskFlags: [],
  lockedHash: createLockedHash("persona_demo_self"),
  overlayId: "overlay_demo_self",
  expiresAt: addDays(30),
};

const overlayA: PersonaOverlay = {
  id: "overlay_demo_self",
  personaId: personaA.id,
  resumeSummary:
    "内容策略与产品叙事双栖，擅长把复杂能力包装成强体验；在压力场景里更容易从沉默中积蓄反击。",
  publicBio: "一个把世界观拆成齿轮、再把人性装回命运钟表里的主角。",
  datingPreferences: ["真诚", "边界感", "能一起做项目", "不爱表演型社交"],
  visualSkin: "fortune-ink",
  tonePreset: "measured-poetic",
  privacyLevel: "public",
  updatedAt: nowIso(),
};

const legends: PersonaSnapshot[] = [
  {
    id: "persona_legend_lamplight",
    userId: demoUser.id,
    source: "legend",
    assessmentVersion: "legend-1.0",
    name: "Lamplight Lin Daiyu.exe",
    relation: "OTHER",
    ageBand: "adult",
    adultOnlyEligible: true,
    traitVector: vector({
      charm: 82,
      resilience: 48,
      focus: 60,
      empathy: 88,
      strategy: 58,
      chaos: 41,
      courage: 44,
    }),
    publicTraitTags: ["脆感美学", "高敏锐", "台词杀伤", "情绪穿透"],
    fears: ["粗暴现实", "被消费式欣赏"],
    interests: ["诗歌", "黑雨都市", "纸灯庭院"],
    communicationStyle: "blade-soft confessional",
    careerTilt: "cultural icon",
    riskFlags: [],
    lockedHash: createLockedHash("persona_legend_lamplight"),
    expiresAt: addDays(30),
  },
  {
    id: "persona_legend_tycoon",
    userId: demoUser.id,
    source: "legend",
    assessmentVersion: "legend-1.0",
    name: "Orbital Tycoon Muskcore",
    relation: "OTHER",
    ageBand: "adult",
    adultOnlyEligible: true,
    traitVector: vector({
      charm: 72,
      resilience: 79,
      focus: 63,
      empathy: 26,
      strategy: 85,
      chaos: 57,
      courage: 92,
    }),
    publicTraitTags: ["高压推进", "赌徒勇气", "争议引力", "场面控制"],
    fears: ["停滞", "平庸会议"],
    interests: ["火箭", "野心叙事", "极限赌注"],
    communicationStyle: "volatile visionary",
    careerTilt: "frontier builder",
    riskFlags: [],
    lockedHash: createLockedHash("persona_legend_tycoon"),
    expiresAt: addDays(30),
  },
];

const worlds: WorldPack[] = [
  {
    id: "world_curated_clock",
    userId: demoUser.id,
    title: "Clockwork Jade Casino",
    theme: "命运赌桌与东方蒸汽城",
    factions: ["翡翠庄家", "赤墨执笔人", "失落皇票猎手"],
    conflicts: ["谁能改写命运本金", "旧王朝债券即将到期"],
    tone: "opulent-pressure",
    tabooRules: ["不可明说真正愿望", "不可在月蚀钟响后撒谎"],
    derivedFrom: "curated",
    safetyStatus: "clean",
    sanitizedSummary:
      "一座以命运筹码为能源的蒸汽都城，所有人都戴着礼貌，所有礼貌都藏着刀。",
    sourceDigest: "curated",
    expiresAt: addDays(365),
  },
  {
    id: "world_curated_tarot",
    userId: demoUser.id,
    title: "Tarot Embassy",
    theme: "塔罗使团与婚约外交",
    factions: ["恋契司礼院", "逆位先知团", "沉默婚盟局"],
    conflicts: ["政治婚约背后的真正目标", "谁在修改配对星图"],
    tone: "intimate-danger",
    tabooRules: ["第一眼不可暴露全部底牌"],
    derivedFrom: "curated",
    safetyStatus: "clean",
    sanitizedSummary:
      "每一场相亲都像一场外交仪式，微笑是最便宜的盾牌，沉默才是最高级的武器。",
    sourceDigest: "curated",
    expiresAt: addDays(365),
  },
];

export function createSeedDatabase(): AppDatabase {
  return {
    users: [demoUser],
    personas: [personaA, ...legends],
    overlays: [overlayA],
    memoryTraits: [],
    worldPacks: worlds,
    matches: [],
    participants: [],
    supportTickets: [],
    datingDossiers: [],
    streams: [],
    scratchUploads: [],
    webhooks: [],
  };
}
