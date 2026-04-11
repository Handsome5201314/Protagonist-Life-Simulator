import { notFound, redirect } from "next/navigation";

import { findFateRoomById } from "@/lib/fate-arena";
import { getArenaView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function ArenaRoomAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getArenaView();
  const hasRealMatch = data.matches.some((match) => match.id === id);

  if (hasRealMatch) {
    redirect(`/arena/${id}`);
  }

  const room = findFateRoomById(id, {
    worldPacks: data.worldPacks,
    matches: data.matches,
    participants: data.participants,
    personas: data.personas,
  });

  if (!room) {
    notFound();
  }

  redirect(room.prepHref);
}
