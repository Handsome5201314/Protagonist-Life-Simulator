import { PersonaVaultPage } from "@/components/PersonaVaultPage";
import { getPersonaStudioView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  const data = await getPersonaStudioView();

  return (
    <PersonaVaultPage
      user={data.user}
      personas={data.personas}
      overlays={data.overlays}
      memoryTraits={data.memoryTraits}
      worldPacks={data.worldPacks}
    />
  );
}
