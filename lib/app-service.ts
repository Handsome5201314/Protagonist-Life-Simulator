import { z } from "zod";

import {
  createPersonaFromAiliangbiaoProfile,
  fetchPartnerImportPayload,
  fetchPrototypeImportPayload,
  fetchSinglePartnerPersona,
} from "@/lib/ai-liangbiao";
import { getSkillById, rewardTiers } from "@/lib/catalog";
import { getDb, updateDb } from "@/lib/db";
import { createDatingDossier, runDatingRehearsal } from "@/lib/dating";
import {
  buildFallbackOpeningBeat,
  buildFallbackTurnBeat,
  buildDatingScene,
  buildDefaultDatingOptions,
  buildDatingMarketCandidates,
  buildMarketStatusLine,
  buildQuickPersonaFromAnswers,
  createDatingBackdrop,
  getPrimaryDatingPersona,
  resolveDatingTurn,
} from "@/lib/dating-market";
import {
  digitalGeneToPersonaSnapshot,
  looksLikeDigitalGeneProtocol,
  verifyDigitalGeneProtocol,
} from "@/lib/digital-gene-protocol";
import {
  buildArenaEventCard,
  buildMatchParticipants,
  buildStreamRecord,
  createMemoryTrait,
  evaluateRound,
  settleSupportRewards,
  type ArenaProxyPlan,
} from "@/lib/game-engine";
import { sanitizeWorldInput } from "@/lib/guardrails";
import type { Locale } from "@/lib/i18n";
import {
  generateArenaChapterWithGemini,
  generateArenaProxyPlansWithGemini,
  generateDirectorInsightsWithGemini,
  askDirectorWithGemini,
  generateDatingOpeningBeatWithGemini,
  generateDatingOpeningWithGemini,
  generateDatingRehearsalWithGemini,
  generateDatingTurnBeatWithGemini,
  generateDatingTurnWithGemini,
  generateWorldPackWithGemini,
} from "@/lib/llm-features";
import {
  applyGameplayConfigPatch,
  buildGameplayConfigProposals,
  createGameplayConfigHistoryEntry,
} from "@/lib/gameplay-config";
import { pickRefereeAction, type RefereeActionType } from "@/lib/referee-engine";
import { buildHeuristicDirectorInsightForLocale, summarizeTelemetry, trackTelemetry } from "@/lib/telemetry";
import type {
  ArenaMatch,
  DirectorInsightSnapshot,
  DatingBeat,
  DatingMatch,
  DatingMatchOption,
  DatingMessage,
  DatingStreamRecord,
  GameplayConfigPatch,
  GameplayConfigHistoryEntry,
  GameplayConfigProposal,
  MatchParticipant,
  PersonaOverlay,
  PersonaSnapshot,
  StreamRecord,
  TelemetrySummary,
  WorldPack,
} from "@/lib/types";
import { addDays, addHours, createId, createLockedHash, nowIso, normalizeDigest } from "@/lib/utils";

const overlaySchema = z.object({
  resumeSummary: z.string().min(1),
  publicBio: z.string().min(1),
  datingPreferences: z.array(z.string()).default([]),
  visualSkin: z.string().default("fortune-ink"),
  tonePreset: z.string().default("measured-poetic"),
  privacyLevel: z.enum(["public", "private"]).default("public"),
});

const personaImportSchema = z.object({
  source: z.enum(["upload", "ailiangbiao"]).default("upload"),
  name: z.string().min(1).optional(),
  profileId: z.string().optional(),
  ageBand: z.enum(["adult", "teen", "child"]).default("adult"),
  relation: z.enum(["SELF", "OTHER"]).default("SELF"),
  interests: z.array(z.string()).default([]),
  fears: z.array(z.string()).default([]),
  publicTraitTags: z.array(z.string()).default([]),
  communicationStyle: z.string().default("quiet-precise"),
  careerTilt: z.string().default("strategy-led"),
  rawText: z.string().default(""),
});

const matchSchema = z.object({
  mode: z.enum(["public", "private"]).default("public"),
  worldPackId: z.string(),
  participantPersonaIds: z.array(z.string()).min(1).max(4),
  maxParticipants: z.number().int().min(2).max(4).optional(),
});

const supportSchema = z.object({
  participantId: z.string(),
  renownSpent: z.number().int().min(1).max(24),
});

const skillEquipSchema = z.object({
  participantId: z.string(),
  skillId: z.string(),
});

const prepSchema = z.object({
  mode: z.enum(["rapid", "immersive"]),
  seatOrder: z.array(z.string()).min(1).max(4),
  reservePersonaIds: z.array(z.string()).max(8).default([]),
  proxyMode: z.enum(["self", "ai"]).default("self"),
  briefing: z.string().max(1500).default(""),
});

const dossierSchema = z.object({
  personaId: z.string(),
  resumeText: z.string().min(10),
});

const rehearsalSchema = z.object({
  personaId: z.string(),
  dossierId: z.string(),
  modeId: z.string(),
  prompt: z.string().min(5),
  locale: z.enum(["en", "zh"]).optional(),
});

const quickPersonaSchema = z.object({
  nickname: z.string().min(1),
  socialStyle: z.enum(["warm", "quiet", "playful"]),
  pace: z.enum(["slow", "balanced", "fast"]),
  logic: z.enum(["heart", "mixed", "logic"]),
});

const createDatingMatchSchema = z.object({
  selfPersonaId: z.string(),
  counterpartPersonaId: z.string(),
  locale: z.enum(["en", "zh"]).optional(),
});

const datingInteractSchema = z.object({
  locale: z.enum(["en", "zh"]).optional(),
  actionType: z.enum(["FLIRT", "LOGIC_TALK", "PULL_BACK", "USE_SKILL"]),
  skillId: z.string().optional(),
});

const userProfileSchema = z.object({
  displayName: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().min(1),
  bio: z.string().max(400).optional().default(""),
});

function ensureDemoUserId() {
  return "user_demo";
}

function resolveDefaultMatchCapacity(world: WorldPack) {
  const text = `${world.title} ${world.theme} ${world.conflicts.join(" ")} ${world.sanitizedSummary}`.toLowerCase();
  return /(romance|date|tarot|love|embassy)/i.test(text) ? 2 : 4;
}

function buildDefaultPrepBriefing(world: WorldPack, personas: PersonaSnapshot[]) {
  const castLine = personas.map((persona) => persona.name).join("、");
  return `舞台设定：${world.title}。${world.sanitizedSummary} 当前首发分身为 ${castLine}，先用一轮试探确认权力结构，再决定是否亮出真正底牌。`;
}

function inferActionFromBriefing(defaultAction: RefereeActionType, briefing: string) {
  const text = briefing.toLowerCase();
  if (/(告白|暧昧|拉近|heart|flirt|亲密)/i.test(text)) return "FLIRT";
  if (/(辩论|逻辑|质询|debate|argument|proof)/i.test(text)) return "DEBATE";
  if (/(主导|带节奏|推进|压场|lead|push)/i.test(text)) return "LEAD";
  if (/(稳住|抗压|守住|resist|hold)/i.test(text)) return "RESIST";
  if (/(误导|陷阱|诱导|诈|deceive|fake)/i.test(text)) return "DECEIVE";
  return defaultAction;
}

function buildFallbackArenaProxyPlans(args: {
  locale: Locale;
  round: number;
  briefing: string;
  world: WorldPack;
  participants: MatchParticipant[];
  personas: PersonaSnapshot[];
}) {
  return args.participants.map((participant) => {
    const persona = args.personas.find((item) => item.id === participant.personaId);
    const baseAction = persona ? pickRefereeAction(persona.traitVector, args.world.tone) : "RESIST";
    const actionType = inferActionFromBriefing(baseAction, args.briefing);
    const leadTags = persona?.publicTraitTags.slice(0, 2).join(" / ") || "未公开标签";
    const intent =
      args.locale === "zh"
        ? `第 ${args.round} 回合优先执行${actionType}，沿着“${args.briefing.slice(0, 36)}”推进，并利用 ${leadTags} 制造局面差。`
        : `Round ${args.round} should lean on ${actionType}, follow "${args.briefing.slice(0, 36)}", and weaponize ${leadTags}.`;

    return {
      participantId: participant.id,
      actionType,
      intent,
    } satisfies ArenaProxyPlan;
  });
}

async function resolveArenaProxyPlans(args: {
  locale: Locale;
  match: ArenaMatch;
  round: number;
  world: WorldPack;
  participants: MatchParticipant[];
  personas: PersonaSnapshot[];
}) {
  const briefing = args.match.prep.briefing?.trim() || args.world.sanitizedSummary;
  const fallbackPlans = buildFallbackArenaProxyPlans({
    locale: args.locale,
    round: args.round,
    briefing,
    world: args.world,
    participants: args.participants,
    personas: args.personas,
  });

  if (args.match.prep.proxyMode !== "ai") {
    return fallbackPlans;
  }

  const llmPlans = await generateArenaProxyPlansWithGemini({
    locale: args.locale,
    round: args.round,
    world: args.world,
    briefing,
    participants: fallbackPlans.map((plan) => {
      const participant = args.participants.find((item) => item.id === plan.participantId);
      const persona = args.personas.find((item) => item.id === participant?.personaId);
      return {
        participantId: plan.participantId,
        displayName: participant?.displayName || plan.participantId,
        tags: persona?.publicTraitTags.slice(0, 3) || [],
        fallbackActionType: plan.actionType,
        fallbackIntent: plan.intent,
      };
    }),
  });

  if (!llmPlans?.plans?.length) {
    return fallbackPlans;
  }

  return fallbackPlans.map((fallbackPlan) => {
    const matched = llmPlans.plans?.find((plan) => plan.participantId === fallbackPlan.participantId);
    const nextAction = matched?.actionType && ["FLIRT", "DEBATE", "LEAD", "RESIST", "DECEIVE"].includes(matched.actionType)
      ? (matched.actionType as RefereeActionType)
      : fallbackPlan.actionType;
    const nextIntent = matched?.intent?.trim() || fallbackPlan.intent;

    return {
      participantId: fallbackPlan.participantId,
      actionType: nextAction,
      intent: nextIntent,
    } satisfies ArenaProxyPlan;
  });
}

function normalizeInsightSnapshot(
  summary: TelemetrySummary,
  locale: Locale,
  llmInsight: Awaited<ReturnType<typeof generateDirectorInsightsWithGemini>> | null
): DirectorInsightSnapshot {
  const fallback = buildHeuristicDirectorInsightForLocale(summary, locale);
  if (!llmInsight) {
    return fallback;
  }

  return {
    ...fallback,
    source: "openclaw",
    headline: llmInsight.headline?.trim() || fallback.headline,
    findings: llmInsight.findings?.filter(Boolean).slice(0, 5) || fallback.findings,
    recommendations:
      llmInsight.recommendations
        ?.filter((item) => item?.title && item?.why && item?.action)
        .slice(0, 4)
        .map((item) => ({
          title: item.title!.trim(),
          why: item.why!.trim(),
          action: item.action!.trim(),
          priority: item.priority === "now" || item.priority === "next" || item.priority === "watch" ? item.priority : "next",
        })) || fallback.recommendations,
    watchlist: llmInsight.watchlist?.filter(Boolean).slice(0, 4) || fallback.watchlist,
  };
}

function buildFallbackDirectorReply(summary: TelemetrySummary, question: string, locale: Locale) {
  const focus =
    summary.metrics.datingContinuationRate < summary.metrics.arenaActivationRate
      ? locale === "zh"
        ? "相亲开场场景"
        : "dating opening scenes"
      : locale === "zh"
        ? "竞技场准备到开局的转化"
        : "arena prep-to-round conversion";

  if (locale === "zh") {
    return [
      `当前最该盯住的是${focus}，因为这里还在持续漏掉最多的推进动能。`,
      `你刚才问的是：${question}`,
      `这个窗口里系统记录到 ${summary.metrics.arenaMatchesCreated} 局竞技场创建、${summary.metrics.arenaRoomsActivated} 局真正开打，以及 ${summary.metrics.datingRoomsCreated} 个相亲房启动。`,
      `我会先只改一个高摩擦点，然后继续看下一轮 telemetry，而不是一次性叠很多改动把判断搅乱。`,
    ].join("");
  }

  return [
    `The immediate focus should be ${focus}, because that is where the current telemetry is leaking the most momentum.`,
    `You asked: ${question}`,
    `Right now the system is seeing ${summary.metrics.arenaMatchesCreated} arena rooms, ${summary.metrics.arenaRoomsActivated} activated arena rooms, and ${summary.metrics.datingRoomsCreated} dating rooms in the selected window.`,
    `My next move would be to change one high-friction surface only, then compare the next telemetry window instead of stacking multiple design changes at once.`,
  ].join(" ");
}

function buildDatingMessagesFromBeat(args: {
  beat: DatingBeat;
  heartbeat: number;
  vibe: number;
  createdAt?: string;
}) {
  const createdAt = args.createdAt || nowIso();
  const messages: DatingMessage[] = [];

  if (args.beat.narration) {
    messages.push({
      id: createId("msg"),
      speaker: "system",
      text: args.beat.narration,
      heartbeat: args.heartbeat,
      vibe: args.vibe,
      createdAt,
    });
  }

  if (args.beat.self?.action || args.beat.self?.dialogue) {
    messages.push({
      id: createId("msg"),
      speaker: "self",
      action: args.beat.self?.action,
      dialogue: args.beat.self?.dialogue,
      heartbeat: args.heartbeat,
      vibe: args.vibe,
      createdAt,
    });
  }

  if (args.beat.other?.action || args.beat.other?.dialogue) {
    messages.push({
      id: createId("msg"),
      speaker: "other",
      action: args.beat.other?.action,
      dialogue: args.beat.other?.dialogue,
      heartbeat: args.heartbeat,
      vibe: args.vibe,
      createdAt,
    });
  }

  return messages;
}

function createUploadPersona(input: z.infer<typeof personaImportSchema>): PersonaSnapshot {
  const adultOnlyEligible = input.relation === "SELF" && input.ageBand === "adult";
  const digest = normalizeDigest(input.rawText || input.name || "persona");
  const publicTraitTags = input.publicTraitTags.length
    ? input.publicTraitTags
    : [
        "\u4E0A\u4F20\u5FEB\u7167",
        digest.includes("quiet") ? "\u6162\u70ED" : "\u53D9\u4E8B\u578B",
        digest.includes("leader") ? "\u9886\u822A\u8005" : "\u955C\u9762\u89C2\u5BDF\u8005",
      ];

  return {
    id: createId("persona"),
    userId: ensureDemoUserId(),
    source: input.source,
    assessmentVersion: input.source === "upload" ? "upload-draft" : "partner-import",
    name: input.name || "Uploaded Hero",
    relation: input.relation,
    ageBand: input.ageBand,
    adultOnlyEligible,
    traitVector: {
      charm: digest.length % 40 + 40,
      resilience: digest.length % 28 + 52,
      focus: digest.length % 24 + 56,
      empathy: digest.length % 22 + 54,
      strategy: digest.length % 26 + 51,
      chaos: digest.length % 18 + 24,
      courage: digest.length % 31 + 49,
    },
    publicTraitTags,
    fears: input.fears,
    interests: input.interests,
    communicationStyle: input.communicationStyle,
    careerTilt: input.careerTilt,
    riskFlags: adultOnlyEligible ? [] : ["private_only"],
    traitFragmentIds: [],
    lockedHash: createLockedHash(input),
    expiresAt: addDays(input.source === "upload" ? 7 : 30),
  };
}

function getMatchWithParticipants(matchId: string, participants: MatchParticipant[]) {
  return participants.filter((item) => item.matchId === matchId || item.id);
}

function buildReservePersonas(
  db: import("@/lib/types").AppDatabase,
  selectedPersonaIds: string[],
  mode: "public" | "private",
  limit: number
) {
  const eligible = db.personas.filter((persona) => {
    if (selectedPersonaIds.includes(persona.id) || persona.deletedAt) return false;
    if (mode === "private") return persona.ageBand === "adult" || persona.source === "legend";
    return persona.adultOnlyEligible || persona.source === "legend";
  });

  const selfOwned = eligible.filter((persona) => persona.source !== "legend");
  const legends = eligible.filter((persona) => persona.source === "legend");
  return [...selfOwned, ...legends].slice(0, limit);
}

function ensureArenaParticipant(db: import("@/lib/types").AppDatabase, matchId: string, personaId: string) {
  const existing = db.participants.find((participant) => participant.matchId === matchId && participant.personaId === personaId);
  if (existing) return existing;

  const persona = db.personas.find((item) => item.id === personaId);
  if (!persona) {
    throw new Error("Persona not found");
  }

  const memoryTraits = db.memoryTraits.filter((trait) => trait.personaId === persona.id);
  const participant = buildMatchParticipants([persona], [persona.id], memoryTraits, matchId)[0];
  db.participants.push(participant);
  return participant;
}

function syncMatchParticipantsFromPrep(db: import("@/lib/types").AppDatabase, match: ArenaMatch) {
  match.participantIds = match.prep.seatOrder.map((personaId) => ensureArenaParticipant(db, match.id, personaId).id);
  match.updatedAt = nowIso();
  return match.participantIds;
}

export async function completeAiliangbiaoLink() {
  const payload = (await fetchPartnerImportPayload()) || (await fetchPrototypeImportPayload());

  return updateDb(async (db) => {
    const user = db.users[0];
    user.linkedAiliangbiao = {
      status: "linked",
      linkedAt: nowIso(),
      externalUserId: payload.externalUserId,
    };
    user.updatedAt = nowIso();

    const imported: PersonaSnapshot[] = [];

    for (const profile of payload.profiles) {
      const persona = await createPersonaFromAiliangbiaoProfile(user.id, profile);
      const existing = db.personas.find((item) => item.sourceProfileId === persona.sourceProfileId);
      if (!existing) {
        db.personas.unshift(persona);
        trackTelemetry(db, {
          type: "persona.imported",
          userId: user.id,
          entityId: persona.id,
          metadata: {
            source: persona.source,
            relation: persona.relation,
            ageBand: persona.ageBand,
            name: persona.name,
          },
        });
        imported.push(persona);
      }
    }

    return {
      linked: user.linkedAiliangbiao,
      imported,
    };
  });
}

export async function updateUserProfile(input: unknown) {
  const data = userProfileSchema.parse(input);

  return updateDb((db) => {
    const user = db.users[0];
    user.displayName = data.displayName;
    user.profile = {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || "",
      city: data.city,
      bio: data.bio || "",
    };
    user.updatedAt = nowIso();
    trackTelemetry(db, {
      type: "user.profile_updated",
      userId: user.id,
      entityId: user.id,
      metadata: {
        city: data.city,
        hasEmail: Boolean(data.email),
      },
    });
    return user;
  });
}

export async function importPersona(input: unknown) {
  if (looksLikeDigitalGeneProtocol(input)) {
    const payload = verifyDigitalGeneProtocol(input);
    return updateDb((db) => {
      const persona = digitalGeneToPersonaSnapshot({
        userId: ensureDemoUserId(),
        payload,
        source: "upload",
      });
      db.personas.unshift(persona);
      trackTelemetry(db, {
        type: "persona.imported",
        userId: persona.userId,
        entityId: persona.id,
        metadata: {
          source: "digital-gene",
          relation: persona.relation,
          ageBand: persona.ageBand,
          name: persona.name,
        },
      });
      return persona;
    });
  }

  const data = personaImportSchema.parse(input);

  if (data.source === "ailiangbiao" && data.profileId) {
    const partnerProfile = await fetchSinglePartnerPersona(data.profileId);
    if (!partnerProfile) {
      throw new Error("Partner profile could not be fetched");
    }

    return updateDb(async (db) => {
      const persona = await createPersonaFromAiliangbiaoProfile(ensureDemoUserId(), partnerProfile);
      db.personas.unshift(persona);
      trackTelemetry(db, {
        type: "persona.imported",
        userId: persona.userId,
        entityId: persona.id,
        metadata: {
          source: persona.source,
          relation: persona.relation,
          ageBand: persona.ageBand,
          name: persona.name,
        },
      });
      return persona;
    });
  }

  return updateDb((db) => {
    const persona = createUploadPersona(data);
    db.personas.unshift(persona);
    trackTelemetry(db, {
      type: "persona.imported",
      userId: persona.userId,
      entityId: persona.id,
      metadata: {
        source: data.source,
        relation: persona.relation,
        ageBand: persona.ageBand,
        name: persona.name,
      },
    });

    return persona;
  });
}

export async function createQuickPersona(input: unknown) {
  const data = quickPersonaSchema.parse(input);
  return importPersona(buildQuickPersonaFromAnswers(data));
}

export async function updatePersonaOverlay(personaId: string, input: unknown) {
  const data = overlaySchema.parse(input);

  return updateDb((db) => {
    const persona = db.personas.find((item) => item.id === personaId);
    if (!persona) {
      throw new Error("Persona not found");
    }

    let overlay = db.overlays.find((item) => item.personaId === personaId);

    if (!overlay) {
      overlay = {
        id: createId("overlay"),
        personaId,
        resumeSummary: data.resumeSummary,
        publicBio: data.publicBio,
        datingPreferences: data.datingPreferences,
        visualSkin: data.visualSkin,
        tonePreset: data.tonePreset,
        privacyLevel: data.privacyLevel,
        updatedAt: nowIso(),
      } satisfies PersonaOverlay;
      db.overlays.unshift(overlay);
      persona.overlayId = overlay.id;
    } else {
      overlay.resumeSummary = data.resumeSummary;
      overlay.publicBio = data.publicBio;
      overlay.datingPreferences = data.datingPreferences;
      overlay.visualSkin = data.visualSkin;
      overlay.tonePreset = data.tonePreset;
      overlay.privacyLevel = data.privacyLevel;
      overlay.updatedAt = nowIso();
    }

    trackTelemetry(db, {
      type: "persona.overlay_updated",
      userId: persona.userId,
      entityId: personaId,
      metadata: {
        privacyLevel: data.privacyLevel,
        visualSkin: data.visualSkin,
        tonePreset: data.tonePreset,
      },
    });

    return overlay;
  });
}

export async function uploadWorldPack(args: {
  locale?: Locale;
  title: string;
  text: string;
  originalName?: string;
}) {
  const sanitized = sanitizeWorldInput(args.text);

  const llmWorld = await generateWorldPackWithGemini({
    locale: args.locale || "zh",
    title: args.title,
    sourceText: args.text,
    sanitizedSummary: sanitized.sanitizedSummary,
    factions: sanitized.factions,
    conflicts: sanitized.conflicts,
    tabooRules: sanitized.tabooRules,
    tone: sanitized.tone,
  });

  return updateDb((db) => {
    const uploadId = createId("upload");
    db.scratchUploads.unshift({
      id: uploadId,
      userId: ensureDemoUserId(),
      kind: "world",
      originalName: args.originalName || `${args.title}.txt`,
      cachedText: normalizeDigest(args.text).slice(0, 3000),
      createdAt: nowIso(),
      deleteAfter: addHours(24),
    });

    const world: WorldPack = {
      id: createId("world"),
      userId: ensureDemoUserId(),
      title: args.title,
      theme: args.title,
      factions: llmWorld?.factions?.length ? llmWorld.factions.slice(0, 6) : sanitized.factions,
      conflicts: llmWorld?.conflicts?.length ? llmWorld.conflicts.slice(0, 6) : sanitized.conflicts,
      tone: llmWorld?.tone || sanitized.tone,
      tabooRules: llmWorld?.tabooRules?.length ? llmWorld.tabooRules.slice(0, 6) : sanitized.tabooRules,
      derivedFrom: "upload",
      safetyStatus: sanitized.safetyStatus,
      sanitizedSummary: llmWorld?.sanitizedSummary || sanitized.sanitizedSummary,
      sourceDigest: normalizeDigest(args.text).slice(0, 250),
      expiresAt: addDays(30),
    };

    db.worldPacks.unshift(world);
    trackTelemetry(db, {
      type: "worldpack.uploaded",
      userId: world.userId,
      entityId: world.id,
      metadata: {
        title: world.title,
        tone: world.tone,
        safetyStatus: world.safetyStatus,
      },
    });
    return world;
  });
}

export async function sanitizeExistingWorldPack(worldId: string, locale: Locale = "zh") {
  const dbSnapshot = await getDb();
  const worldSnapshot = dbSnapshot.worldPacks.find((item) => item.id === worldId);
  if (!worldSnapshot) {
    throw new Error("World pack not found");
  }

  const sanitized = sanitizeWorldInput(`${worldSnapshot.theme}. ${worldSnapshot.sourceDigest}`);
  const llmWorld = await generateWorldPackWithGemini({
    locale,
    title: worldSnapshot.title,
    sourceText: worldSnapshot.sourceDigest,
    sanitizedSummary: sanitized.sanitizedSummary,
    factions: sanitized.factions,
    conflicts: sanitized.conflicts,
    tabooRules: sanitized.tabooRules,
    tone: sanitized.tone,
  });

  return updateDb((db) => {
    const world = db.worldPacks.find((item) => item.id === worldId);
    if (!world) {
      throw new Error("World pack not found");
    }

    world.factions = llmWorld?.factions?.length ? llmWorld.factions.slice(0, 6) : sanitized.factions;
    world.conflicts = llmWorld?.conflicts?.length ? llmWorld.conflicts.slice(0, 6) : sanitized.conflicts;
    world.tabooRules = llmWorld?.tabooRules?.length ? llmWorld.tabooRules.slice(0, 6) : sanitized.tabooRules;
    world.tone = llmWorld?.tone || sanitized.tone;
    world.safetyStatus = sanitized.safetyStatus;
    world.sanitizedSummary = llmWorld?.sanitizedSummary || sanitized.sanitizedSummary;
    return world;
  });
}

export async function createMatch(input: unknown) {
  const data = matchSchema.parse(input);

  return updateDb((db) => {
    const user = db.users[0];
    const world = db.worldPacks.find((item) => item.id === data.worldPackId);
    if (!world) {
      throw new Error("World pack not found");
    }

    const targetParticipants = data.maxParticipants ?? resolveDefaultMatchCapacity(world);
    const selectedPersonas = data.participantPersonaIds
      .map((id) => db.personas.find((persona) => persona.id === id))
      .filter((persona): persona is PersonaSnapshot => Boolean(persona))
      .slice(0, targetParticipants);

    if (!selectedPersonas.length) {
      throw new Error("No participants selected");
    }

    const eligiblePublic = selectedPersonas.every((persona) => persona.adultOnlyEligible || data.mode === "private" || persona.source === "legend");
    if (data.mode === "public" && !eligiblePublic) {
      throw new Error("Public arena only accepts adult SELF personas or legends");
    }

    const reservePersonas = buildReservePersonas(
      db,
      selectedPersonas.map((persona) => persona.id),
      data.mode,
      Math.max(0, Math.min(8, targetParticipants + 2))
    );

    const matchId = createId("match");
    const match: ArenaMatch = {
      id: matchId,
      userId: user.id,
      seed: Math.floor(Math.random() * 999999),
      mode: data.mode,
      worldPackId: world.id,
      maxParticipants: targetParticipants,
      participantIds: [],
      publicStoryStatus: "draft",
      supportPool: 0,
      prep: {
        mode: "rapid",
        seatOrder: selectedPersonas.map((persona) => persona.id),
        reservePersonaIds: reservePersonas.map((persona) => persona.id),
        proxyMode: db.gameplayConfig.arena.defaultProxyMode,
        briefing: buildDefaultPrepBriefing(world, selectedPersonas),
        updatedAt: nowIso(),
      },
      roundStates: [
        { round: 1, title: "Opening Stake", status: "pending", checkpointCount: 0, scores: [], skillEquips: [] },
        { round: 2, title: "Reverse Ledger", status: "pending", checkpointCount: 0, scores: [], skillEquips: [] },
        { round: 3, title: "Final Seal", status: "pending", checkpointCount: 0, scores: [], skillEquips: [] },
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    } satisfies ArenaMatch;

    const activeMemoryTraits = db.memoryTraits.filter((trait) => selectedPersonas.some((persona) => persona.id === trait.personaId));
    const reserveMemoryTraits = db.memoryTraits.filter((trait) => reservePersonas.some((persona) => persona.id === trait.personaId));
    const activeParticipants = buildMatchParticipants(selectedPersonas, selectedPersonas.map((persona) => persona.id), activeMemoryTraits, matchId);
    const reserveParticipants = reservePersonas.length
      ? buildMatchParticipants(reservePersonas, reservePersonas.map((persona) => persona.id), reserveMemoryTraits, matchId)
      : [];

    db.participants.push(...activeParticipants, ...reserveParticipants);
    match.participantIds = activeParticipants.map((participant) => participant.id);
    db.matches.unshift(match);
    trackTelemetry(db, {
      type: "arena.match_created",
      userId: user.id,
      entityId: match.id,
      metadata: {
        worldTitle: world.title,
        mode: match.mode,
        maxParticipants: match.maxParticipants,
        selectedSeats: selectedPersonas.length,
      },
    });

    return {
      match,
      participants: activeParticipants,
    };
  });
}

export async function supportMatch(matchId: string, input: unknown) {
  const data = supportSchema.parse(input);

  return updateDb((db) => {
    const user = db.users[0];
    const match = db.matches.find((item) => item.id === matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (user.wallet.renown < data.renownSpent) {
      throw new Error("Not enough Renown");
    }

    const participant = db.participants.find((item) => item.id === data.participantId);
    if (!participant || !match.participantIds.includes(participant.id)) {
      throw new Error("Participant not found");
    }

    const reward = [...rewardTiers].reverse().find((tier) => data.renownSpent >= tier.threshold) ?? rewardTiers[0];

    user.wallet.renown -= data.renownSpent;
    user.wallet.supportStreak += 1;
    participant.supportTotal += data.renownSpent;
    match.supportPool += data.renownSpent;
    match.updatedAt = nowIso();

    const ticket = {
      id: createId("support"),
      userId: user.id,
      matchId,
      participantId: participant.id,
      renownSpent: data.renownSpent,
      rewardTier: reward.tier,
      status: "active",
      createdAt: nowIso(),
    } as const;

    db.supportTickets.unshift(ticket);
    trackTelemetry(db, {
      type: "arena.support_added",
      userId: user.id,
      entityId: match.id,
      metadata: {
        participantId: participant.id,
        renownSpent: data.renownSpent,
        rewardTier: reward.tier,
      },
    });
    return ticket;
  });
}

export async function joinMatch(matchId: string, input: unknown) {
  const data = z.object({ personaId: z.string() }).parse(input);

  return updateDb((db) => {
    const match = db.matches.find((item) => item.id === matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (match.publicStoryStatus !== "draft") {
      throw new Error("Only recruiting rooms can accept new clones");
    }

    const persona = db.personas.find((item) => item.id === data.personaId);
    if (!persona) {
      throw new Error("Persona not found");
    }

    if (!persona.adultOnlyEligible && match.mode === "public") {
      throw new Error("Public rooms only accept adult SELF personas");
    }

    if (match.prep.seatOrder.includes(persona.id)) {
      throw new Error("This clone is already seated in the room");
    }

    if (match.prep.seatOrder.length >= match.maxParticipants) {
      throw new Error("Room is already full");
    }

    ensureArenaParticipant(db, match.id, persona.id);
    match.prep.seatOrder.push(persona.id);
    match.prep.reservePersonaIds = match.prep.reservePersonaIds.filter((personaId) => personaId !== persona.id);
    match.prep.updatedAt = nowIso();
    syncMatchParticipantsFromPrep(db, match);
    trackTelemetry(db, {
      type: "arena.match_joined",
      userId: db.users[0].id,
      entityId: match.id,
      metadata: {
        personaId: persona.id,
        currentParticipants: match.participantIds.length,
        maxParticipants: match.maxParticipants,
      },
    });

    return {
      matchId: match.id,
      participant: db.participants.find((item) => item.matchId === match.id && item.personaId === persona.id),
      currentParticipants: match.participantIds.length,
      maxParticipants: match.maxParticipants,
    };
  });
}

export async function updateMatchPrep(matchId: string, input: unknown) {
  const data = prepSchema.parse(input);

  return updateDb((db) => {
    const match = db.matches.find((item) => item.id === matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (match.publicStoryStatus !== "draft") {
      throw new Error("Only draft rooms can update prep state");
    }

    const allowedPersonaIds = new Set([...match.prep.seatOrder, ...match.prep.reservePersonaIds]);
    const seatOrder = Array.from(new Set(data.seatOrder));
    const reservePersonaIds = Array.from(new Set(data.reservePersonaIds)).filter((personaId) => !seatOrder.includes(personaId));

    if (seatOrder.length > match.maxParticipants) {
      throw new Error("Seat order exceeds room capacity");
    }

    if (!seatOrder.every((personaId) => allowedPersonaIds.has(personaId))) {
      throw new Error("Seat order contains unknown personas");
    }

    if (!reservePersonaIds.every((personaId) => allowedPersonaIds.has(personaId))) {
      throw new Error("Reserve list contains unknown personas");
    }

    seatOrder.forEach((personaId) => ensureArenaParticipant(db, match.id, personaId));
    reservePersonaIds.forEach((personaId) => ensureArenaParticipant(db, match.id, personaId));

    match.prep = {
      mode: data.mode,
      seatOrder,
      reservePersonaIds,
      proxyMode: data.proxyMode,
      briefing: data.briefing.trim() || match.prep.briefing || "",
      updatedAt: nowIso(),
    };
    syncMatchParticipantsFromPrep(db, match);
    trackTelemetry(db, {
      type: "arena.prep_saved",
      userId: db.users[0].id,
      entityId: match.id,
      metadata: {
        mode: data.mode,
        proxyMode: data.proxyMode,
        seatCount: seatOrder.length,
        reserveCount: reservePersonaIds.length,
      },
    });

    return {
      matchId: match.id,
      prep: match.prep,
      participantIds: match.participantIds,
    };
  });
}

export async function equipSkill(matchId: string, round: number, input: unknown) {
  const data = skillEquipSchema.parse(input);

  return updateDb((db) => {
    const match = db.matches.find((item) => item.id === matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const roundState = match.roundStates.find((item) => item.round === round);
    if (!roundState) {
      throw new Error("Round not found");
    }

    const participant = db.participants.find((item) => item.id === data.participantId);
    if (!participant || !match.participantIds.includes(participant.id)) {
      throw new Error("Participant not found");
    }

    const skill = getSkillById(data.skillId);
    if (!skill || !skill.allowedModes.includes("arena")) {
      throw new Error("Skill not allowed");
    }

    const user = db.users[0];
    if (user.wallet.renown < skill.costRenown) {
      throw new Error("Not enough Renown to rent this skill");
    }

    user.wallet.renown -= skill.costRenown;
    participant.skillLoadout.push(skill.id);
    roundState.skillEquips.push({
      participantId: participant.id,
      skillId: skill.id,
      appliedAt: nowIso(),
    });
    match.updatedAt = nowIso();
    trackTelemetry(db, {
      type: "arena.skill_equipped",
      userId: db.users[0].id,
      entityId: match.id,
      metadata: {
        participantId: participant.id,
        skillId: skill.id,
        round,
      },
    });

    return {
      participantId: participant.id,
      skillId: skill.id,
      remainingRenown: user.wallet.renown,
    };
  });
}

export async function triggerRound(matchId: string, round: number, locale: Locale = "zh") {
  return updateDb(async (db) => {
    const match = db.matches.find((item) => item.id === matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const roundState = match.roundStates.find((item) => item.round === round);
    if (!roundState) {
      throw new Error("Round not found");
    }

    const participants = db.participants.filter((item) => match.participantIds.includes(item.id));
    const personas = participants
      .map((participant) => db.personas.find((persona) => persona.id === participant.personaId))
      .filter(Boolean) as PersonaSnapshot[];
    const world = db.worldPacks.find((item) => item.id === match.worldPackId);
    if (!world) {
      throw new Error("World pack not found");
    }

    const proxyPlans = await resolveArenaProxyPlans({
      locale,
      match,
      round,
      world,
      participants,
      personas,
    });
    const eventCard = buildArenaEventCard({ locale, world, round, config: db.gameplayConfig });

    const result = evaluateRound({
      locale,
      match,
      round,
      participants,
      personas,
      world,
      memoryTraits: db.memoryTraits,
      proxyPlans: match.prep.proxyMode === "ai" ? proxyPlans : undefined,
      eventCard,
      config: db.gameplayConfig,
    });

    roundState.status = "done";
    roundState.chapter = result.storyLines.join("\n\n");
    roundState.messages = result.messages;
    roundState.checkpointCount = result.storyLines.length;
    roundState.scores = result.scores;
    roundState.elimination = result.elimination;
    roundState.proxyPlans = match.prep.proxyMode === "ai" ? proxyPlans : [];
    roundState.eventCard = eventCard;
    match.updatedAt = nowIso();
    match.publicStoryStatus = round === 3 ? "complete" : "streaming";

    const stream = buildStreamRecord({
      locale,
      match,
      round,
      world,
      participants,
      scoreBoard: result.scores,
      storyLines: result.storyLines,
      messages: result.messages,
      elimination: result.elimination,
      proxyPlans: match.prep.proxyMode === "ai" ? proxyPlans : [],
      eventCard,
    });
    roundState.chapter = stream.finalChapter;
    roundState.checkpointCount = stream.segments.length;

    const llmChapter = await generateArenaChapterWithGemini({
      locale,
      world,
      round,
      participants,
      personas,
      scoreBoard: result.scores,
      deterministicNotes: [
        ...(match.prep.proxyMode === "ai"
          ? proxyPlans.map((plan) => {
              const participant = participants.find((item) => item.id === plan.participantId);
              return `${participant?.displayName || plan.participantId} / ${plan.actionType} / ${plan.intent}`;
            })
          : []),
        `${eventCard.title} / ${eventCard.summary} / objective: ${eventCard.objective}`,
        ...result.storyLines,
      ],
      elimination: result.elimination,
      winnerId: match.winnerId,
    });

    if (llmChapter?.chapter?.length) {
      stream.segments = llmChapter.chapter;
      stream.finalChapter = llmChapter.chapter.join("\n\n");
      roundState.chapter = stream.finalChapter;
      roundState.checkpointCount = llmChapter.chapter.length;
    }
    db.streams.unshift(stream);
    trackTelemetry(db, {
      type: "arena.round_triggered",
      userId: db.users[0].id,
      entityId: match.id,
      metadata: {
        round,
        worldTitle: world.title,
        proxyMode: match.prep.proxyMode,
        eventCardTitle: eventCard.title,
        elimination: result.elimination || null,
      },
    });

    if (round === 3) {
      settleSupportRewards({
        user: db.users[0],
        match,
        supportTickets: db.supportTickets,
      });

      const userPersona = personas.find((persona) => persona.source !== "legend" && persona.adultOnlyEligible);
      if (userPersona) {
        db.memoryTraits.unshift(
          createMemoryTrait({
            userId: db.users[0].id,
            personaId: userPersona.id,
            matchId: match.id,
            match,
            participants,
          })
        );
      }
    }

    return {
      status: 202,
      streamId: stream.id,
      matchId: match.id,
      round,
      proxyMode: match.prep.proxyMode,
    };
  });
}

export async function getMatchBundle(matchId: string) {
  const db = await getDb();
  const match = db.matches.find((item) => item.id === matchId);
  if (!match) {
    throw new Error("Match not found");
  }

  const participants = db.participants.filter((item) => match.participantIds.includes(item.id));
  const personas = participants
    .map((participant) => db.personas.find((persona) => persona.id === participant.personaId))
    .filter((item): item is PersonaSnapshot => Boolean(item));
  const world = db.worldPacks.find((item) => item.id === match.worldPackId);
  const tickets = db.supportTickets.filter((item) => item.matchId === match.id);

  return {
    match,
    world,
    participants,
    personas,
    tickets,
  };
}

export async function getStream(streamId: string) {
  const db = await getDb();
  const stream = db.streams.find((item) => item.id === streamId);
  if (!stream) {
    throw new Error("Stream not found");
  }

  return stream as StreamRecord;
}

export async function createDossier(input: unknown) {
  const data = dossierSchema.parse(input);

  return updateDb((db) => {
    const persona = db.personas.find((item) => item.id === data.personaId);
    if (!persona) {
      throw new Error("Persona not found");
    }

    if (!persona.adultOnlyEligible) {
      throw new Error("Only adult SELF personas can enter dating mode");
    }

    const overlay = db.overlays.find((item) => item.personaId === persona.id);
    const dossier = createDatingDossier({
      userId: ensureDemoUserId(),
      persona,
      overlay,
      resumeText: data.resumeText,
    });

    db.scratchUploads.unshift({
      id: createId("upload"),
      userId: ensureDemoUserId(),
      kind: "resume",
      originalName: "resume.txt",
      cachedText: normalizeDigest(data.resumeText),
      createdAt: nowIso(),
      deleteAfter: addHours(24),
    });

    db.datingDossiers.unshift(dossier);
    trackTelemetry(db, {
      type: "dating.dossier_created",
      userId: dossier.userId,
      entityId: dossier.id,
      metadata: {
        personaId: data.personaId,
        strengthCount: dossier.strengths.length,
        redFlagCount: dossier.redFlags.length,
      },
    });
    return dossier;
  });
}

export async function rehearseDating(input: unknown) {
  const data = rehearsalSchema.parse(input);
  const db = await getDb();
  const persona = db.personas.find((item) => item.id === data.personaId);
  const dossier = db.datingDossiers.find((item) => item.id === data.dossierId);
  if (!persona || !dossier) {
    throw new Error("Persona or dossier not found");
  }

  const overlay = db.overlays.find((item) => item.personaId === persona.id);

  const fallback = runDatingRehearsal({
    locale: data.locale,
    persona,
    overlay,
    dossier,
    modeId: data.modeId,
    prompt: data.prompt,
  });

  const llmDraft = await generateDatingRehearsalWithGemini({
    locale: data.locale || "en",
    persona,
    overlay,
    dossier,
    modeLabel: fallback.mode.label,
    prompt: data.prompt,
    fallbackAnalysis: fallback.analysis,
    fallbackScript: fallback.script,
  });

  return {
    ...fallback,
    analysis: llmDraft?.analysis?.length ? llmDraft.analysis : fallback.analysis,
    script: llmDraft?.script?.length ? llmDraft.script : fallback.script,
    poweredBy: llmDraft ? "gemini" : "rules",
  };
}

export async function deleteMe() {
  return updateDb((db) => {
    const user = db.users[0];
    user.deleteRequestedAt = nowIso();
    user.updatedAt = nowIso();

    for (const persona of db.personas.filter((item) => item.userId === user.id && item.source !== "legend")) {
      persona.deletedAt = nowIso();
      persona.destroyScheduledAt = addDays(1);
      persona.dataGhost = {
        displayAlias: "[Destroyed Data Ghost]",
        reason: "User requested erasure",
        publicOnly: true,
      };
      persona.fears = [];
      persona.interests = [];
      persona.publicTraitTags = ["Destroyed Data Ghost"];
      persona.riskFlags = [];
    }

    db.overlays = db.overlays.filter((overlay) => {
      const persona = db.personas.find((item) => item.id === overlay.personaId);
      return persona?.source === "legend";
    });

    db.datingDossiers = [];
    db.scratchUploads = [];

    return {
      requestedAt: user.deleteRequestedAt,
      personasGhosted: db.personas.filter((item) => item.deletedAt).length,
    };
  });
}

export async function processPartnerAccountDeleted(body: { externalUserId?: string }) {
  if (!body.externalUserId) {
    throw new Error("externalUserId is required");
  }
  return deleteMe();
}

export async function processPartnerProfileRevoked(body: { profileId?: string }) {
  if (!body.profileId) {
    throw new Error("profileId is required");
  }

  return updateDb((db) => {
    const persona = db.personas.find((item) => item.sourceProfileId === body.profileId);
    if (!persona) {
      throw new Error("Profile snapshot not found");
    }

    persona.deletedAt = nowIso();
    persona.destroyScheduledAt = addDays(1);
    persona.dataGhost = {
      displayAlias: "[Destroyed Data Ghost]",
      reason: "Partner profile revoked",
      publicOnly: true,
    };
    persona.fears = [];
    persona.interests = [];
    persona.publicTraitTags = ["Destroyed Data Ghost"];

    return persona;
  });
}

export async function getAdminInsights(input?: { locale?: Locale; windowHours?: number }) {
  const locale = input?.locale || "zh";
  const windowHours = input?.windowHours ?? 168;
  const db = await getDb();
  const summary = summarizeTelemetry(db, windowHours);
  const cached = db.insightSnapshots.find(
    (item) => item.windowHours === windowHours && item.summaryHash === summary.summaryHash
  );
  const openClawReady = Boolean(process.env.OPENCLAW_GATEWAY_BASE_URL && process.env.OPENCLAW_GATEWAY_TOKEN);

  if (cached && (cached.source === "openclaw" || !openClawReady)) {
    const proposals = buildGameplayConfigProposals({
      summary,
      insight: cached,
      config: db.gameplayConfig,
    });
    return {
      summary,
      insight: cached,
      config: db.gameplayConfig,
      proposals,
      history: db.gameplayConfigHistory.slice(0, 8),
    };
  }

  const llmInsight = await generateDirectorInsightsWithGemini({ locale, summary });
  const insight = normalizeInsightSnapshot(summary, locale, llmInsight);

  await updateDb((mutableDb) => {
    mutableDb.insightSnapshots = mutableDb.insightSnapshots.filter(
      (item) => !(item.windowHours === insight.windowHours && item.summaryHash === insight.summaryHash)
    );
    mutableDb.insightSnapshots.unshift(insight);
    mutableDb.insightSnapshots = mutableDb.insightSnapshots.slice(0, 24);
  });

  const proposals = buildGameplayConfigProposals({
    summary,
    insight,
    config: db.gameplayConfig,
  });

  return {
    summary,
    insight,
    config: db.gameplayConfig,
    proposals,
    history: db.gameplayConfigHistory.slice(0, 8),
  };
}

export async function askDirectorQuestion(input: { question: string; locale?: Locale; windowHours?: number }) {
  const question = input.question.trim();
  if (!question) {
    throw new Error("Question is required");
  }

  const locale = input.locale || "zh";
  const summary = summarizeTelemetry(await getDb(), input.windowHours ?? 168);
  const answer = await askDirectorWithGemini({
    locale,
    summary,
    question,
  });

  return {
    summary,
    answer: answer || buildFallbackDirectorReply(summary, question, locale),
  };
}

export async function updateGameplayConfig(input: {
  patch?: GameplayConfigPatch;
  proposalId?: string;
  locale?: Locale;
  windowHours?: number;
}) {
  const locale = input.locale || "zh";
  const windowHours = input.windowHours ?? 168;
  const snapshot = await getAdminInsights({ locale, windowHours });

  const selectedProposal = input.proposalId
    ? snapshot.proposals.find((proposal) => proposal.id === input.proposalId)
    : null;
  const patch = input.patch || selectedProposal?.patch;

  if (!patch) {
    throw new Error("Gameplay config patch is required");
  }

  const nextConfig = applyGameplayConfigPatch(snapshot.config, patch);
  const historyEntry = createGameplayConfigHistoryEntry({
    action: "apply",
    proposalId: selectedProposal?.id,
    proposalTitle: selectedProposal?.title,
    reason: selectedProposal?.reason || "Manual gameplay config update",
    patch,
    previousConfig: snapshot.config,
    nextConfig,
  });

  await updateDb((db) => {
    db.gameplayConfig = nextConfig;
    db.gameplayConfigHistory.unshift(historyEntry);
    db.gameplayConfigHistory = db.gameplayConfigHistory.slice(0, 50);
    trackTelemetry(db, {
      type: "admin.config_updated",
      userId: db.users[0].id,
      entityId: db.users[0].id,
      metadata: {
        proposalId: input.proposalId || null,
        action: "apply",
        patch: JSON.stringify(patch).slice(0, 800),
      },
    });
  });

  const refreshed = await getAdminInsights({ locale, windowHours });

  return {
    config: nextConfig,
    appliedPatch: patch,
    proposal: selectedProposal || null,
    summary: refreshed.summary,
    insight: refreshed.insight,
    proposals: refreshed.proposals,
    history: refreshed.history,
  };
}

export async function rollbackGameplayConfig(input?: {
  historyId?: string;
  locale?: Locale;
  windowHours?: number;
}) {
  const locale = input?.locale || "zh";
  const windowHours = input?.windowHours ?? 168;
  const db = await getDb();
  const historyEntry =
    (input?.historyId
      ? db.gameplayConfigHistory.find((item) => item.id === input.historyId)
      : db.gameplayConfigHistory[0]) || null;

  if (!historyEntry) {
    throw new Error("No gameplay config history is available for rollback");
  }

  const rollbackPatch = historyEntry.diff.reduce<GameplayConfigPatch>((acc, item) => {
    const [scope, key] = item.path.split(".") as ["dating" | "arena", string];
    if (!acc[scope]) {
      acc[scope] = {};
    }
    (acc[scope] as Record<string, string | number | boolean | null>)[key] = item.before;
    return acc;
  }, {});

  const nextConfig = historyEntry.previousConfig;
  const rollbackEntry = createGameplayConfigHistoryEntry({
    action: "rollback",
    proposalId: historyEntry.proposalId,
    proposalTitle: historyEntry.proposalTitle,
    reason: `Rollback ${historyEntry.id}`,
    patch: rollbackPatch,
    previousConfig: db.gameplayConfig,
    nextConfig,
  });

  await updateDb((mutableDb) => {
    mutableDb.gameplayConfig = nextConfig;
    mutableDb.gameplayConfigHistory.unshift(rollbackEntry);
    mutableDb.gameplayConfigHistory = mutableDb.gameplayConfigHistory.slice(0, 50);
    trackTelemetry(mutableDb, {
      type: "admin.config_updated",
      userId: mutableDb.users[0].id,
      entityId: mutableDb.users[0].id,
      metadata: {
        action: "rollback",
        historyId: historyEntry.id,
        patch: JSON.stringify(rollbackPatch).slice(0, 800),
      },
    });
  });

  const refreshed = await getAdminInsights({ locale, windowHours });

  return {
    restoredFrom: historyEntry.id,
    config: nextConfig,
    summary: refreshed.summary,
    insight: refreshed.insight,
    proposals: refreshed.proposals,
    history: refreshed.history,
  };
}

export async function getA2AState(matchId: string) {
  return getMatchBundle(matchId);
}

export async function getDatingMarket(input?: { locale?: Locale }) {
  const db = await getDb();
  const locale = input?.locale || "zh";
  const owned = db.personas.filter((persona) => persona.source !== "legend" && !persona.deletedAt);
  const self = getPrimaryDatingPersona(owned);

  return {
    user: db.users[0],
    locale,
    selfPersona: self || null,
    quickBindRequired: !self,
    candidates: self ? buildDatingMarketCandidates(self, db.personas).map((candidate) => ({
      ...candidate,
      statusLine: buildMarketStatusLine(candidate.matchScore),
    })) : [],
  };
}

export async function createDatingMatch(input: unknown) {
  const data = createDatingMatchSchema.parse(input);
  const locale = data.locale || "zh";
  const db = await getDb();
  const self = db.personas.find((persona) => persona.id === data.selfPersonaId);
  const other = db.personas.find((persona) => persona.id === data.counterpartPersonaId);

  if (!self || !other) {
    throw new Error("Persona not found");
  }

  if (!self.adultOnlyEligible || self.relation !== "SELF") {
    throw new Error("Only adult SELF personas can enter the dating market");
  }

  const backdrop = createDatingBackdrop(self, other);
  const openingScene = buildDatingScene(self, other, 0, backdrop.title, db.gameplayConfig);
  const openingFallbackBeat = buildFallbackOpeningBeat({
    self,
    other,
    scene: openingScene,
  });
  const openingBeat =
    (await generateDatingOpeningBeatWithGemini({
      locale,
      self,
      other,
      backdropTitle: backdrop.title,
      backdropSummary: backdrop.summary,
      fallbackBeat: openingFallbackBeat,
    })) || openingFallbackBeat;

  return updateDb((mutableDb) => {
    const selfPersona = mutableDb.personas.find((persona) => persona.id === self.id)!;
    const otherPersona = mutableDb.personas.find((persona) => persona.id === other.id)!;
    const matchId = createId("dating");
    const transcript = buildDatingMessagesFromBeat({
      beat: openingBeat,
      heartbeat: 50,
      vibe: 50,
    });
    const options = buildDefaultDatingOptions(
      {
        id: matchId,
        userId: ensureDemoUserId(),
        selfPersonaId: selfPersona.id,
        counterpartPersonaId: otherPersona.id,
        backdropTitle: backdrop.title,
        backdropSummary: backdrop.summary,
        scene: openingScene,
        heartbeat: 50,
        vibe: 50,
        turnCount: 0,
        status: "active",
        transcript,
        currentOptions: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      selfPersona,
      otherPersona,
      mutableDb.gameplayConfig
    );

    const match: DatingMatch = {
      id: matchId,
      userId: ensureDemoUserId(),
      selfPersonaId: selfPersona.id,
      counterpartPersonaId: otherPersona.id,
      backdropTitle: backdrop.title,
      backdropSummary: backdrop.summary,
      scene: openingScene,
      heartbeat: 50,
      vibe: 50,
      turnCount: 0,
      status: "active",
      transcript,
      currentOptions: options,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    mutableDb.datingMatches.unshift(match);
    trackTelemetry(mutableDb, {
      type: "dating.room_created",
      userId: match.userId,
      entityId: match.id,
      metadata: {
        selfPersona: selfPersona.name,
        counterpartPersona: otherPersona.name,
        backdropTitle: backdrop.title,
        sceneTitle: openingScene.title,
      },
    });
    return match;
  });
}

export async function getDatingMatchBundle(roomId: string) {
  const db = await getDb();
  const room = db.datingMatches.find((match) => match.id === roomId);
  if (!room) {
    throw new Error("Dating room not found");
  }

  const selfPersona = db.personas.find((persona) => persona.id === room.selfPersonaId);
  const counterpartPersona = db.personas.find((persona) => persona.id === room.counterpartPersonaId);
  const selfOverlay = db.overlays.find((overlay) => overlay.personaId === room.selfPersonaId);
  const counterpartOverlay = db.overlays.find((overlay) => overlay.personaId === room.counterpartPersonaId);

  if (!selfPersona || !counterpartPersona) {
    throw new Error("Dating room personas are missing");
  }

  return {
    room,
    selfPersona,
    counterpartPersona,
    selfOverlay: selfOverlay || null,
    counterpartOverlay: counterpartOverlay || null,
    wallet: db.users[0].wallet,
  };
}

export async function interactDatingMatch(roomId: string, input: unknown) {
  const data = datingInteractSchema.parse(input);
  const locale = data.locale || "zh";

  return updateDb(async (db) => {
    const room = db.datingMatches.find((match) => match.id === roomId);
    if (!room) {
      throw new Error("Dating room not found");
    }

    if (room.status !== "active") {
      throw new Error("This dating room is no longer active");
    }

    const self = db.personas.find((persona) => persona.id === room.selfPersonaId);
    const other = db.personas.find((persona) => persona.id === room.counterpartPersonaId);
    if (!self || !other) {
      throw new Error("Dating personas not found");
    }

    const user = db.users[0];
    if (data.actionType === "USE_SKILL") {
      const cost = db.gameplayConfig.dating.skillCostDiamonds;
      if (user.wallet.diamonds < cost) {
        throw new Error("Not enough Diamonds");
      }
      user.wallet.diamonds -= cost;
    }

    const result = resolveDatingTurn({
      actionType: data.actionType,
      self,
      other,
      scene: room.scene,
      heartbeat: room.heartbeat,
      vibe: room.vibe,
      usedSkill: data.actionType === "USE_SKILL",
      config: db.gameplayConfig,
    });

    const fallbackBeat = buildFallbackTurnBeat({
      actionType: data.actionType,
      success: result.success,
      scene: room.scene,
      self,
      other,
    });

    const llmBeat =
      (await generateDatingTurnBeatWithGemini({
        locale,
        self,
        other,
        backdropTitle: room.backdropTitle,
        sceneTitle: room.scene.title,
        actionType: data.actionType,
        heartbeat: result.heartbeat,
        vibe: result.vibe,
        heartbeatDelta: result.heartbeatDelta,
        vibeDelta: result.vibeDelta,
        success: result.success,
        fallbackBeat,
      })) || fallbackBeat;

    room.heartbeat = result.heartbeat;
    room.vibe = result.vibe;
    room.status = result.status;
    room.turnCount += 1;
    room.scene = buildDatingScene(self, other, room.turnCount, room.backdropTitle, db.gameplayConfig);
    room.updatedAt = nowIso();

    const generatedMessages = buildDatingMessagesFromBeat({
      beat: llmBeat,
      heartbeat: result.heartbeat,
      vibe: result.vibe,
    });

    room.transcript.push(...generatedMessages);

    room.currentOptions = buildDefaultDatingOptions(room, self, other, db.gameplayConfig);

    // 按句子分割文本，用于流式输出打字机效果
    const narrationText = llmBeat.narration || "";
    const segments = narrationText
      .split(/(?<=[。！？.?!])(?=\s*[^。！？.?!])/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    const stream: DatingStreamRecord = {
      id: createId("dating_stream"),
      roomId: room.id,
      phase: "queued",
      segments: segments.length ? segments : [narrationText || " "],
      finalText: narrationText,
      messages: generatedMessages,
      heartbeat: room.heartbeat,
      vibe: room.vibe,
      status: room.status,
      scene: room.scene,
      options: room.currentOptions,
    };

    db.datingStreams.unshift(stream);
    trackTelemetry(db, {
      type: "dating.turn_played",
      userId: room.userId,
      entityId: room.id,
      metadata: {
        actionType: data.actionType,
        success: result.success,
        heartbeatDelta: result.heartbeatDelta,
        vibeDelta: result.vibeDelta,
        turnCount: room.turnCount,
        roomStatus: room.status,
        sceneTitle: room.scene.title,
      },
    });

    return {
      status: 202,
      roomId: room.id,
      streamId: stream.id,
      heartbeat: room.heartbeat,
      vibe: room.vibe,
      roomStatus: room.status,
    };
  });
}

export async function getDatingStream(streamId: string) {
  const db = await getDb();
  const stream = db.datingStreams.find((item) => item.id === streamId);
  if (!stream) {
    throw new Error("Dating stream not found");
  }
  return stream;
}
