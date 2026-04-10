import { getDb } from "@/lib/db";

export async function getHomeView() {
  const db = await getDb();
  const user = db.users[0];
  const publicPersonas = db.personas.filter((persona) => !persona.deletedAt);
  const publicMatches = db.matches.slice().reverse().slice(0, 4);

  return {
    user,
    publicPersonas,
    worldPacks: db.worldPacks.slice(0, 4),
    matches: publicMatches,
    memoryTraits: db.memoryTraits.slice().reverse().slice(0, 4),
  };
}

export async function getPersonaStudioView() {
  const db = await getDb();
  const user = db.users[0];
  return {
    user,
    personas: db.personas,
    overlays: db.overlays,
    memoryTraits: db.memoryTraits.slice().reverse(),
    worldPacks: db.worldPacks,
  };
}

export async function getArenaView() {
  const db = await getDb();
  const personas = db.personas.filter((persona) => persona.adultOnlyEligible || persona.source === "legend");
  const matches = db.matches.slice().reverse();

  return {
    user: db.users[0],
    personas,
    matches,
    worldPacks: db.worldPacks,
    participants: db.participants,
    tickets: db.supportTickets,
  };
}

export async function getDatingView() {
  const db = await getDb();
  return {
    user: db.users[0],
    personas: db.personas.filter((persona) => persona.adultOnlyEligible),
    dossiers: db.datingDossiers.slice().reverse(),
    overlays: db.overlays,
  };
}

export async function getWorldForgeView() {
  const db = await getDb();
  return {
    user: db.users[0],
    worldPacks: db.worldPacks.slice().reverse(),
    uploads: db.scratchUploads.slice().reverse(),
  };
}
