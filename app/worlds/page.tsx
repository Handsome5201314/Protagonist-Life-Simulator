import { WorldForgeHub } from "@/components/WorldForgeHub";
import { getWorldForgeView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function WorldsPage() {
  const data = await getWorldForgeView();

  return <WorldForgeHub worldPacks={data.worldPacks} uploads={data.uploads} />;
}
