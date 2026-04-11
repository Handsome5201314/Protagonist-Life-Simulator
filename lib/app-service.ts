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
  buildDefaultDatingOptions,
  buildDatingMarketCandidates,
  buildMarketStatusLine,
  buildQuickPersonaFromAnswers,
  createDatingBackdrop,
  fallbackOpeningLine,
  fallbackTurnNarrative,
  getPrimaryDatingPersona,
  resolveDatingTurn,
} from "@/lib/dating-market";
import { buildMatchParticipants, buildStreamRecord, createMemoryTrait, evaluateRound, settleSupportRewards } from "@/lib/game-engine";
import { sanitizeWorldInput } from "@/lib/guardrails";
import type { Locale } from "@/lib/i18n";
import {
  generateArenaChapterWithGemini,
  generateDatingOpeningWithGemini,
  generateDatingRehearsalWithGemini,
  generateDatingTurnWithGemini,
  generateWorldPackWithGemini,
} from "@/lib/llm-features";
import type {
  ArenaMatch,
  DatingMatch,
  DatingMatchOption,
  DatingStreamRecord,
  MatchParticipant,
  PersonaOverlay,
  PersonaSnapshot,
  StreamRecord,
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
    return user;
  });
}

export async function importPersona(input: unknown) {
  const data = personaImportSchema.parse(input);

  if (data.source === "ailiangbiao" && data.profileId) {
    const partnerProfile = await fetchSinglePartnerPersona(data.profileId);
    if (!partnerProfile) {
      throw new Error("Partner profile could not be fetched");
    }

    return updateDb(async (db) => {
      const persona = await createPersonaFromAiliangbiaoProfile(ensureDemoUserId(), partnerProfile);
      db.personas.unshift(persona);
      return persona;
    });
  }

  return updateDb((db) => {
    const persona = createUploadPersona(data);
    db.personas.unshift(persona);

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
      updatedAt: nowIso(),
    };
    syncMatchParticipantsFromPrep(db, match);

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

    return {
      participantId: participant.id,
      skillId: skill.id,
      remainingRenown: user.wallet.renown,
    };
  });
}

export async function triggerRound(matchId: string, round: number, locale: Locale = "en") {
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

    const result = evaluateRound({
      locale,
      match,
      round,
      participants,
      personas,
      world,
      memoryTraits: db.memoryTraits,
    });

    roundState.status = "done";
    roundState.chapter = result.storyLines.join("\n\n");
    roundState.checkpointCount = result.storyLines.length + 2;
    roundState.scores = result.scores;
    roundState.elimination = result.elimination;
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
      elimination: result.elimination,
    });

    const llmChapter = await generateArenaChapterWithGemini({
      locale,
      world,
      round,
      participants,
      personas,
      scoreBoard: result.scores,
      deterministicNotes: result.storyLines,
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

export async function getA2AState(matchId: string) {
  return getMatchBundle(matchId);
}

export async function getDatingMarket(input?: { locale?: Locale }) {
  const db = await getDb();
  const locale = input?.locale || "en";
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
  const locale = data.locale || "en";
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
  const openingFallback = fallbackOpeningLine(self, other);
  const openingLine =
    (await generateDatingOpeningWithGemini({
      locale,
      self,
      other,
      backdropTitle: backdrop.title,
      backdropSummary: backdrop.summary,
      fallbackLine: openingFallback,
    })) || openingFallback;

  return updateDb((mutableDb) => {
    const selfPersona = mutableDb.personas.find((persona) => persona.id === self.id)!;
    const otherPersona = mutableDb.personas.find((persona) => persona.id === other.id)!;
    const matchId = createId("dating");
    const transcript = [
      {
        id: createId("msg"),
        speaker: "other" as const,
        text: openingLine,
        heartbeat: 50,
        vibe: 50,
        createdAt: nowIso(),
      },
    ];
    const options = buildDefaultDatingOptions(
      {
        id: matchId,
        userId: ensureDemoUserId(),
        selfPersonaId: selfPersona.id,
        counterpartPersonaId: otherPersona.id,
        backdropTitle: backdrop.title,
        backdropSummary: backdrop.summary,
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
      otherPersona
    );

    const match: DatingMatch = {
      id: matchId,
      userId: ensureDemoUserId(),
      selfPersonaId: selfPersona.id,
      counterpartPersonaId: otherPersona.id,
      backdropTitle: backdrop.title,
      backdropSummary: backdrop.summary,
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
  const locale = data.locale || "en";

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
      const cost = 3;
      if (user.wallet.diamonds < cost) {
        throw new Error("Not enough Diamonds");
      }
      user.wallet.diamonds -= cost;
    }

    const result = resolveDatingTurn({
      actionType: data.actionType,
      self,
      other,
      heartbeat: room.heartbeat,
      vibe: room.vibe,
      usedSkill: data.actionType === "USE_SKILL",
    });

    const fallbackLine = fallbackTurnNarrative({
      actionType: data.actionType,
      success: result.success,
      heartbeatDelta: result.heartbeatDelta,
      vibeDelta: result.vibeDelta,
      self,
      other,
    });

    const llmLine =
      (await generateDatingTurnWithGemini({
        locale,
        self,
        other,
        backdropTitle: room.backdropTitle,
        actionType: data.actionType,
        heartbeat: result.heartbeat,
        vibe: result.vibe,
        heartbeatDelta: result.heartbeatDelta,
        vibeDelta: result.vibeDelta,
        success: result.success,
        fallbackLine,
      })) || fallbackLine;

    room.heartbeat = result.heartbeat;
    room.vibe = result.vibe;
    room.status = result.status;
    room.turnCount += 1;
    room.updatedAt = nowIso();

    room.transcript.push(
      {
        id: createId("msg"),
        speaker: "self",
        text:
          data.actionType === "FLIRT"
            ? "\u4F60\u628A\u6C14\u6C1B\u5F80\u5FC3\u52A8\u65B9\u5411\u63A8\u8FD1\u4E86\u4E00\u6B65\u3002"
            : data.actionType === "LOGIC_TALK"
              ? "\u4F60\u628A\u8BDD\u9898\u62C9\u56DE\u4E00\u4E2A\u66F4\u7A33\u7684\u5207\u5165\u53E3\u3002"
              : data.actionType === "PULL_BACK"
                ? "\u4F60\u6545\u610F\u6162\u4E0B\u6765\uFF0C\u89C2\u5BDF\u8FD9\u4EFD\u6C89\u9ED8\u4F1A\u4E0D\u4F1A\u56DE\u6D41\u3002"
                : "\u4F60\u7528\u4E86\u4E00\u6B21\u6280\u80FD\uFF0C\u8BA9\u8FD9\u4E00\u56DE\u5408\u53D8\u5F97\u66F4\u5766\u767D\u3002",
        heartbeat: result.heartbeat,
        vibe: result.vibe,
        createdAt: nowIso(),
      },
      {
        id: createId("msg"),
        speaker: "other",
        text: llmLine,
        heartbeat: result.heartbeat,
        vibe: result.vibe,
        createdAt: nowIso(),
      }
    );

    room.currentOptions = buildDefaultDatingOptions(room, self, other);

    // 按句子分割文本，用于流式输出打字机效果
    const segments = llmLine
      .split(/(?<=[。！？.?!])(?=\s*[^。！？.?!])/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    const stream: DatingStreamRecord = {
      id: createId("dating_stream"),
      roomId: room.id,
      phase: "queued",
      segments: segments.length ? segments : [llmLine],
      finalText: llmLine,
      heartbeat: room.heartbeat,
      vibe: room.vibe,
      status: room.status,
      options: room.currentOptions,
    };

    db.datingStreams.unshift(stream);

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
