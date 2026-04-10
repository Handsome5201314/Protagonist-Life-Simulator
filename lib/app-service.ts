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
import { buildMatchParticipants, buildStreamRecord, createMemoryTrait, evaluateRound, settleSupportRewards } from "@/lib/game-engine";
import { sanitizeWorldInput } from "@/lib/guardrails";
import type {
  ArenaMatch,
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
});

const supportSchema = z.object({
  participantId: z.string(),
  renownSpent: z.number().int().min(1).max(24),
});

const skillEquipSchema = z.object({
  participantId: z.string(),
  skillId: z.string(),
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
});

function ensureDemoUserId() {
  return "user_demo";
}

function createUploadPersona(input: z.infer<typeof personaImportSchema>): PersonaSnapshot {
  const adultOnlyEligible = input.relation === "SELF" && input.ageBand === "adult";
  const digest = normalizeDigest(input.rawText || input.name || "persona");
  const publicTraitTags = input.publicTraitTags.length
    ? input.publicTraitTags
    : ["上传快照", digest.includes("quiet") ? "慢热" : "叙事型", digest.includes("leader") ? "领航者" : "镜面观察者"];

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
  return participants.filter((item) => item.id && true);
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
  title: string;
  text: string;
  originalName?: string;
}) {
  const sanitized = sanitizeWorldInput(args.text);

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
      factions: sanitized.factions,
      conflicts: sanitized.conflicts,
      tone: sanitized.tone,
      tabooRules: sanitized.tabooRules,
      derivedFrom: "upload",
      safetyStatus: sanitized.safetyStatus,
      sanitizedSummary: sanitized.sanitizedSummary,
      sourceDigest: normalizeDigest(args.text).slice(0, 250),
      expiresAt: addDays(30),
    };

    db.worldPacks.unshift(world);
    return world;
  });
}

export async function sanitizeExistingWorldPack(worldId: string) {
  return updateDb((db) => {
    const world = db.worldPacks.find((item) => item.id === worldId);
    if (!world) {
      throw new Error("World pack not found");
    }

    const sanitized = sanitizeWorldInput(`${world.theme}. ${world.sourceDigest}`);
    world.factions = sanitized.factions;
    world.conflicts = sanitized.conflicts;
    world.tabooRules = sanitized.tabooRules;
    world.tone = sanitized.tone;
    world.safetyStatus = sanitized.safetyStatus;
    world.sanitizedSummary = sanitized.sanitizedSummary;
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

    const selectedPersonas = data.participantPersonaIds
      .map((id) => db.personas.find((persona) => persona.id === id))
      .filter(Boolean) as PersonaSnapshot[];

    if (!selectedPersonas.length) {
      throw new Error("No participants selected");
    }

    const eligiblePublic = selectedPersonas.every((persona) => persona.adultOnlyEligible || data.mode === "private" || persona.source === "legend");
    if (data.mode === "public" && !eligiblePublic) {
      throw new Error("Public arena only accepts adult SELF personas or legends");
    }

    const legends = db.personas.filter((persona) => persona.source === "legend");
    while (selectedPersonas.length < 4) {
      const candidate = legends.find((legend) => !selectedPersonas.some((persona) => persona.id === legend.id));
      if (!candidate) {
        break;
      }
      selectedPersonas.push(candidate);
    }

    const match: ArenaMatch = {
      id: createId("match"),
      userId: user.id,
      seed: Math.floor(Math.random() * 999999),
      mode: data.mode,
      worldPackId: world.id,
      participantIds: [],
      publicStoryStatus: "draft",
      supportPool: 0,
      roundStates: [
        { round: 1, title: "Opening Stake", status: "pending", checkpointCount: 0, scores: [], skillEquips: [] },
        { round: 2, title: "Reverse Ledger", status: "pending", checkpointCount: 0, scores: [], skillEquips: [] },
        { round: 3, title: "Final Seal", status: "pending", checkpointCount: 0, scores: [], skillEquips: [] },
      ],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const memoryTraits = db.memoryTraits.filter((trait) => selectedPersonas.some((persona) => persona.id === trait.personaId));
    const participants = buildMatchParticipants(selectedPersonas, selectedPersonas.map((persona) => persona.id), memoryTraits);

    db.participants.push(...participants);
    match.participantIds = participants.map((item) => item.id);
    db.matches.unshift(match);

    return {
      match,
      participants,
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

export async function triggerRound(matchId: string, round: number) {
  return updateDb((db) => {
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
      match,
      round,
      world,
      participants,
      scoreBoard: result.scores,
      storyLines: result.storyLines,
      elimination: result.elimination,
    });
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
    .filter(Boolean);
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

  return runDatingRehearsal({
    persona,
    overlay,
    dossier,
    modeId: data.modeId,
    prompt: data.prompt,
  });
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
