import { ArenaControlHub } from "@/components/ArenaControlHub";
import { getLocale } from "@/lib/i18n-server";
import { getArenaView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function ArenaPage() {
  const locale = await getLocale();
  const data = await getArenaView();

  return (
    <ArenaControlHub
      locale={locale}
      user={data.user}
      personas={data.personas}
      worldPacks={data.worldPacks}
      matches={data.matches}
      participants={data.participants}
      tickets={data.tickets}
    />
  );
}
