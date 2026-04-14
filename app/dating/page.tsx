import { DatingMarketHub } from "@/components/DatingMarketHub";
import { getDatingMarket } from "@/lib/app-service";
import { getLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function DatingPage() {
  const locale = await getLocale();
  const market = await getDatingMarket({ locale });

  return (
    <DatingMarketHub
      locale={locale}
      user={market.user}
      selfPersona={market.selfPersona}
      candidates={market.candidates}
    />
  );
}
