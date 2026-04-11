import { UserLoginPanel } from "@/components/UserLoginPanel";
import { getPersonaStudioView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const data = await getPersonaStudioView();
  return <UserLoginPanel user={data.user} personas={data.personas} overlays={data.overlays} />;
}
