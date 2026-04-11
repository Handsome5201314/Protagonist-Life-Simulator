import { notFound } from "next/navigation";

import { ArenaRoomView } from "@/components/ArenaRoomView";
import { getMatchBundle } from "@/lib/app-service";
import { getLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function ArenaRoomPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const locale = await getLocale();

  try {
    const bundle = await getMatchBundle(matchId);

    return (
      <ArenaRoomView
        locale={locale}
        match={bundle.match}
        world={bundle.world}
        participants={bundle.participants}
        personas={bundle.personas}
        tickets={bundle.tickets}
      />
    );
  } catch {
    notFound();
  }
}
