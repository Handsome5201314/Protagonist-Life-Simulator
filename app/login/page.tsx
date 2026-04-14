import { UserLoginPanel } from "@/components/UserLoginPanel";
import { getLocale } from "@/lib/i18n-server";
import { getPersonaStudioView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const locale = await getLocale();
  const data = await getPersonaStudioView();
  return <UserLoginPanel locale={locale} user={data.user} personas={data.personas} overlays={data.overlays} />;
}
