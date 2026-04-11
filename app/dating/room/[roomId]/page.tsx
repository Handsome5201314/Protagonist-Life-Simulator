import { notFound } from "next/navigation";

import { DatingRoomView } from "@/components/DatingRoomView";
import { getLocale } from "@/lib/i18n-server";
import { getDatingRoomView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function DatingRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const locale = await getLocale();

  try {
    const data = await getDatingRoomView(roomId);

    return (
      <DatingRoomView
        locale={locale}
        room={data.room}
        selfPersona={data.selfPersona}
        counterpartPersona={data.counterpartPersona}
        selfOverlay={data.selfOverlay}
        counterpartOverlay={data.counterpartOverlay}
        wallet={data.wallet}
      />
    );
  } catch {
    notFound();
  }
}
