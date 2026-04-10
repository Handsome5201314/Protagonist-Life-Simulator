import { WorldForgeClient } from "@/components/WorldForgeClient";
import { getWorldForgeView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function WorldsPage() {
  const data = await getWorldForgeView();

  return (
    <main className="page-wrap" style={{ paddingTop: 28 }}>
      <section className="glass-panel">
        <p className="section-kicker">World Forge</p>
        <h1 className="section-title" style={{ fontSize: "2.6rem" }}>
          Distill atmosphere, not copyrighted text
        </h1>
        <p className="subheadline">
          Uploaded source material is cached for 24 hours only. Long-term storage keeps a sanitized digest, factions,
          conflicts, taboo rules, and tone.
        </p>
      </section>

      <div style={{ marginTop: 24 }}>
        <WorldForgeClient worldPacks={data.worldPacks} uploads={data.uploads} />
      </div>
    </main>
  );
}
