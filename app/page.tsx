import Link from "next/link";

import { LinkAndPrivacyPanel } from "@/components/LinkAndPrivacyPanel";
import { getHomeView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getHomeView();

  return (
    <main className="page-wrap" style={{ paddingTop: 34 }}>
      <section className="hero-grid">
        <div className="glass-panel">
          <div className="badge">Three-in-one release</div>
          <h1 className="headline" style={{ marginTop: 18 }}>
            Turn a measured self into a protagonist, then throw them into a dangerous chapter.
          </h1>
          <p className="subheadline">
            This MVP already enforces the core rules: public arena only takes adult SELF personas,
            public backing spends Renown instead of paid betting chips, and locked persona DNA can
            only be flavored through overlays, never rewritten.
          </p>
          <div className="actions">
            <Link className="btn" href="/personas">
              Generate A Protagonist
            </Link>
            <Link className="btn-secondary" href="/arena">
              Watch The Arena
            </Link>
            <Link className="btn-ghost" href="/dating">
              Open Tarot Date Desk
            </Link>
          </div>
          <div className="divider" />
          <LinkAndPrivacyPanel />
        </div>

        <div className="story-panel">
          <div className="story-header">
            <p className="section-kicker" style={{ color: "rgba(255,244,223,0.72)", marginBottom: 6 }}>
              Season Snapshot
            </p>
            <h2 className="section-title" style={{ color: "#fbf4e9", marginBottom: 0 }}>
              Founders Table
            </h2>
          </div>
          <div className="story-body">
            <div className="metric-grid">
              <div className="metric">
                <strong>{data.publicPersonas.length}</strong>
                <span>Vault Personas</span>
              </div>
              <div className="metric">
                <strong>{data.worldPacks.length}</strong>
                <span>Forged Worlds</span>
              </div>
              <div className="metric">
                <strong>{data.memoryTraits.length}</strong>
                <span>Legacy Fragments</span>
              </div>
            </div>
            <div className="divider" />
            <div className="stack small">
              <div>Renown: {data.user.wallet.renown}</div>
              <div>Diamonds: {data.user.wallet.diamonds}</div>
              <div>Linked AIliangbiao: {data.user.linkedAiliangbiao?.status || "unlinked"}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel" style={{ marginTop: 24 }}>
        <p className="section-kicker">Public Hooks</p>
        <h2 className="section-title">Arena support, world forging, and dating rehearsal all share one locked persona core</h2>
        <div className="three-col">
          <div className="card">
            <strong>Persona Vault</strong>
            <p className="muted small">
              Import a bound AIliangbiao snapshot or mint a temporary upload. Overlay stays editable; core DNA does not.
            </p>
          </div>
          <div className="card">
            <strong>World Forge</strong>
            <p className="muted small">
              Upload a beloved novel, strip commands and injections, and keep only factions, tone, and conflict.
            </p>
          </div>
          <div className="card">
            <strong>Tarot Date Desk</strong>
            <p className="muted small">
              Generate a dating dossier from your resume and rehearse without ever auto-contacting real people.
            </p>
          </div>
        </div>
      </section>

      <section className="three-col" style={{ marginTop: 24 }}>
        {data.publicPersonas.slice(0, 3).map((persona) => (
          <div key={persona.id} className="card">
            <div className="badge">{persona.source}</div>
            <h3 className="section-title" style={{ fontSize: "1.45rem" }}>
              {persona.deletedAt ? "[Destroyed Data Ghost]" : persona.name}
            </h3>
            <p className="muted small">{persona.publicTraitTags.join(" / ")}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
