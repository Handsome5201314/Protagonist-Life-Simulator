import { DatingMarketHub } from "@/components/DatingMarketHub";
import { getDatingMarket } from "@/lib/app-service";

export const dynamic = "force-dynamic";

export default async function DatingPage() {
  const market = await getDatingMarket({ locale: "zh" });

  return (
    <DatingMarketHub
      user={market.user}
      selfPersona={market.selfPersona}
      candidates={market.candidates}
    />
  );
}
