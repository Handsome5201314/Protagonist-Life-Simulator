import { promises as fs } from "node:fs";
import path from "node:path";

import type { AppDatabase, ArenaPrepState, MatchParticipant, PersonaSnapshot } from "@/lib/types";
import { createSeedDatabase, seedLegends, seedSelfOverlay, seedSelfPersona, seedWorlds } from "@/lib/seed-data";
import { nowIso } from "@/lib/utils";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app-db.json");

let writeChain: Promise<unknown> = Promise.resolve();

async function ensureDbFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(createSeedDatabase(), null, 2), "utf8");
  }
}

function buildDefaultPrepState(matchId: string, participantIds: string[], participants: MatchParticipant[]): ArenaPrepState {
  const seatOrder = participantIds
    .map((participantId) => participants.find((participant) => participant.id === participantId))
    .filter((participant): participant is MatchParticipant => Boolean(participant))
    .map((participant) => participant.personaId);

  return {
    mode: "rapid",
    seatOrder,
    reservePersonaIds: participants
      .filter((participant) => participant.matchId === matchId && !participantIds.includes(participant.id))
      .map((participant) => participant.personaId),
    updatedAt: nowIso(),
  };
}

function normalizeAiliangbiaoPersona(persona: PersonaSnapshot) {
  if (persona.sourceProfileId === "lb_self_adult") {
    persona.publicTraitTags = ["成年主角", "策略型", "慢热", "高敏"];
    persona.fears = ["被粗暴归类", "失去选择权"];
    persona.interests = ["心理画像", "世界观构建", "策略游戏"];
    persona.communicationStyle = "quiet-precise";
    persona.careerTilt = "strategy-led";
    persona.riskFlags = [];
  }

  if (persona.sourceProfileId === "lb_other_child") {
    persona.publicTraitTags = ["私密档案", "感受型", "慢热", "高敏"];
    persona.fears = ["陌生嘈杂环境"];
    persona.interests = ["星图", "图鉴"];
    persona.communicationStyle = "quiet-precise";
    persona.careerTilt = "strategy-led";
    persona.riskFlags = ["private_only"];
  }
}

function cleanupDb(db: AppDatabase) {
  const now = Date.now();

  const seedPersonaMap = new Map([seedSelfPersona, ...seedLegends].map((persona) => [persona.id, persona] as const));
  const seedWorldMap = new Map(seedWorlds.map((world) => [world.id, world] as const));

  const existingPersonaIds = new Set(db.personas.map((persona) => persona.id));
  for (const persona of [seedSelfPersona, ...seedLegends]) {
    if (!existingPersonaIds.has(persona.id)) {
      db.personas.push({ ...persona });
    }
  }

  const existingWorldIds = new Set(db.worldPacks.map((world) => world.id));
  for (const world of seedWorlds) {
    if (!existingWorldIds.has(world.id)) {
      db.worldPacks.push({ ...world });
    }
  }

  const overlay = db.overlays.find((item) => item.id === seedSelfOverlay.id || item.personaId === seedSelfOverlay.personaId);
  if (!overlay) {
    db.overlays.unshift({ ...seedSelfOverlay });
  }

  db.personas = db.personas.map((persona) => {
    const seeded = seedPersonaMap.get(persona.id);
    if (seeded) {
      return { ...persona, ...seeded, deletedAt: persona.deletedAt, destroyScheduledAt: persona.destroyScheduledAt, dataGhost: persona.dataGhost };
    }

    if (persona.source === "ailiangbiao") {
      normalizeAiliangbiaoPersona(persona);
    }

    if (!persona.destroyScheduledAt) {
      return persona;
    }

    if (new Date(persona.destroyScheduledAt).getTime() > now) {
      return persona;
    }

    return {
      ...persona,
      sourceProfileId: undefined,
      fears: [],
      interests: [],
      publicTraitTags: ["Destroyed Data Ghost"],
      riskFlags: [],
      dataGhost: {
        displayAlias: "[Destroyed Data Ghost]",
        reason: "User requested removal",
        publicOnly: true,
      },
    };
  });

  db.worldPacks = db.worldPacks.map((world) => {
    const seeded = seedWorldMap.get(world.id);
    return seeded ? { ...world, ...seeded } : world;
  });

  db.scratchUploads = db.scratchUploads.filter((upload) => new Date(upload.deleteAfter).getTime() > now);

  for (const participant of db.participants) {
    if (!participant.matchId) {
      const match = db.matches.find((item) => item.participantIds.includes(participant.id));
      participant.matchId = match?.id || "orphaned_match";
    }
  }

  for (const match of db.matches) {
    const scopedParticipants = db.participants.filter((participant) => participant.matchId === match.id || match.participantIds.includes(participant.id));
    scopedParticipants.forEach((participant) => {
      participant.matchId = match.id;
    });

    if (!match.prep) {
      match.prep = buildDefaultPrepState(match.id, match.participantIds, scopedParticipants);
      continue;
    }

    const knownPersonaIds = new Set(scopedParticipants.map((participant) => participant.personaId));
    match.prep.seatOrder = match.prep.seatOrder.filter((personaId) => knownPersonaIds.has(personaId));
    if (!match.prep.seatOrder.length) {
      match.prep.seatOrder = buildDefaultPrepState(match.id, match.participantIds, scopedParticipants).seatOrder;
    }

    match.prep.reservePersonaIds = Array.from(
      new Set(
        match.prep.reservePersonaIds.filter((personaId) => knownPersonaIds.has(personaId) && !match.prep.seatOrder.includes(personaId))
      )
    );
    match.prep.mode = match.prep.mode === "immersive" ? "immersive" : "rapid";
    match.prep.updatedAt = match.prep.updatedAt || nowIso();
  }
}

async function readDbFile() {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, "utf8");
  const db = JSON.parse(raw) as AppDatabase;
  cleanupDb(db);
  return db;
}

async function writeDbFile(db: AppDatabase) {
  await ensureDbFile();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function getDb() {
  await writeChain;
  return readDbFile();
}

export async function updateDb<T>(mutator: (db: AppDatabase) => T | Promise<T>) {
  let result: T;

  writeChain = writeChain.then(async () => {
    const db = await readDbFile();
    result = await mutator(db);
    await writeDbFile(db);
  });

  await writeChain;
  return result!;
}

export async function touchUser(userId: string) {
  await updateDb((db) => {
    const user = db.users.find((item) => item.id === userId);
    if (user) {
      user.updatedAt = nowIso();
    }
  });
}
