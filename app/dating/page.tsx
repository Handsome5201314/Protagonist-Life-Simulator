import { DatingStudio } from "@/components/DatingStudio";
import { getDatingView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function DatingPage() {
  const data = await getDatingView();

  return (
    <main className="page-wrap" style={{ paddingTop: 28 }}>
      <section className="glass-panel">
        <p className="section-kicker">Tarot Date Desk</p>
        <h1 className="section-title" style={{ fontSize: "2.6rem" }}>
          Let the system coach your prep, never impersonate you in the wild
        </h1>
        <p className="subheadline">
          The v1 contract is strict: rehearsal, copy drafting, topic screening, and scenario simulation only. No autonomous real-world messaging.
        </p>
      </section>

      <div style={{ marginTop: 24 }}>
        <DatingStudio personas={data.personas} dossiers={data.dossiers} overlays={data.overlays} />
      </div>
    </main>
  );
}
