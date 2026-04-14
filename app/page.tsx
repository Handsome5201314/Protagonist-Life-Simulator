import { FateLobbyHome } from "@/components/FateLobbyHome";
import { getDb } from "@/lib/db";
import { buildFateLobbyRooms } from "@/lib/fate-arena";
import { getLocale } from "@/lib/i18n-server";
import { getArenaView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = await getLocale();
  const data = await getArenaView();
  const db = await getDb();
  const rooms = buildFateLobbyRooms({
    worldPacks: data.worldPacks,
    matches: data.matches,
    participants: data.participants,
    personas: data.personas,
  });

  return (
    <FateLobbyHome
      locale={locale}
      user={data.user}
      rooms={rooms.filter((room) => room.category !== "romance")}
      personas={db.personas.filter((p) => !p.deletedAt)}
      overlays={db.overlays}
    />
  );
}
