import { promises as fs } from "node:fs";
import path from "node:path";

import type { AppDatabase } from "@/lib/types";
import { createSeedDatabase, seedLegends, seedWorlds } from "@/lib/seed-data";
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

function cleanupDb(db: AppDatabase) {
  const now = Date.now();

  const existingPersonaIds = new Set(db.personas.map((persona) => persona.id));
  for (const legend of seedLegends) {
    if (!existingPersonaIds.has(legend.id)) {
      db.personas.push(legend);
    }
  }

  const existingWorldIds = new Set(db.worldPacks.map((world) => world.id));
  for (const world of seedWorlds) {
    if (!existingWorldIds.has(world.id)) {
      db.worldPacks.push(world);
    }
  }

  if (!(db as AppDatabase).datingMatches) {
    (db as AppDatabase).datingMatches = [];
  }

  if (!(db as AppDatabase).datingStreams) {
    (db as AppDatabase).datingStreams = [];
  }

  db.scratchUploads = db.scratchUploads.filter((upload) => new Date(upload.deleteAfter).getTime() > now);

  db.personas = db.personas.map((persona) => {
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
