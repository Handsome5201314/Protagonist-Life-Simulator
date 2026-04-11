import { ArenaControlHub } from "@/components/ArenaControlHub";
import { getArenaView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function ArenaPage() {
  const data = await getArenaView();

  return (
    <ArenaControlHub
      user={data.user}
      personas={data.personas}
      worldPacks={data.worldPacks}
      matches={data.matches}
      participants={data.participants}
      tickets={data.tickets}
    />
  );
}
