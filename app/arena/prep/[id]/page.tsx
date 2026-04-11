import { notFound } from "next/navigation";

import { ArenaPrepRoom } from "@/components/ArenaPrepRoom";
import { buildFatePrepView } from "@/lib/fate-arena";
import { getArenaView } from "@/lib/view-models";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ArenaPrepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getArenaView();
  const db = await getDb();
  const prepView = buildFatePrepView(id, {
    worldPacks: data.worldPacks,
    matches: data.matches,
    participants: data.participants,
    personas: data.personas,
  });

  if (!prepView) {
    notFound();
  }

  return (
    <ArenaPrepRoom
      prepView={prepView}
      personas={db.personas.filter((p) => !p.deletedAt)}
      overlays={db.overlays}
    />
  );
}
