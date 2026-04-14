import type { Locale } from "@/lib/i18n";
import { getDatingMarket, getDatingMatchBundle } from "@/lib/app-service";
import { getDb } from "@/lib/db";

export async function getHomeView(locale: Locale = "zh") {
  const db = await getDb();
  const market = await getDatingMarket({ locale });

  return {
    user: db.users[0],
    market,
    overlays: db.overlays,
    activePersonas: db.personas.filter((persona) => !persona.deletedAt).slice(0, 6),
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

export async function getDatingRoomView(roomId: string) {
  return getDatingMatchBundle(roomId);
}

export async function getWorldForgeView() {
  const db = await getDb();
  return {
    user: db.users[0],
    worldPacks: db.worldPacks.slice().reverse(),
    uploads: db.scratchUploads.slice().reverse(),
  };
}
