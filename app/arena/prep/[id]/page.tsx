import { notFound } from "next/navigation";

import { ArenaPrepRoom } from "@/components/ArenaPrepRoom";
import { findFateRoomById } from "@/lib/fate-arena";
import { getArenaView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function ArenaPrepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getArenaView();
  const room = findFateRoomById(id, {
    worldPacks: data.worldPacks,
    matches: data.matches,
    participants: data.participants,
    personas: data.personas,
  });

  if (!room) {
    notFound();
  }

  return <ArenaPrepRoom room={room} />;
}
