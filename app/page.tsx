import { FateLobbyHome } from "@/components/FateLobbyHome";
import { buildFateLobbyRooms } from "@/lib/fate-arena";
import { getArenaView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getArenaView();
  const rooms = buildFateLobbyRooms({
    worldPacks: data.worldPacks,
    matches: data.matches,
    participants: data.participants,
    personas: data.personas,
  });

  return <FateLobbyHome user={data.user} rooms={rooms.filter((room) => room.category !== "romance")} />;
}
