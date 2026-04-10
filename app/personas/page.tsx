import { LinkAndPrivacyPanel } from "@/components/LinkAndPrivacyPanel";
import { PersonaStudioClient } from "@/components/PersonaStudioClient";
import { getPersonaStudioView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  const data = await getPersonaStudioView();

  return (
    <main className="page-wrap" style={{ paddingTop: 28 }}>
      <section className="glass-panel">
        <p className="section-kicker">Persona Vault</p>
        <h1 className="section-title" style={{ fontSize: "2.6rem" }}>
          DNA-lock the protagonist, then build flavor around it
        </h1>
        <p className="subheadline">
          Public arena and dating accept only adult SELF personas. Everything else remains private-only and can still live
          in your story vault.
        </p>
        <LinkAndPrivacyPanel />
      </section>

      <div style={{ marginTop: 24 }}>
        <PersonaStudioClient
          personas={data.personas}
          overlays={data.overlays}
          memoryTraits={data.memoryTraits}
          worldPacks={data.worldPacks}
        />
      </div>
    </main>
  );
}
