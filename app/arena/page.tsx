import { ArenaStudio } from "@/components/ArenaStudio";
import { getArenaView } from "@/lib/view-models";

export const dynamic = "force-dynamic";

export default async function ArenaPage() {
  const data = await getArenaView();

  return (
    <main className="page-wrap" style={{ paddingTop: 28 }}>
      <section className="glass-panel">
        <p className="section-kicker">Public Arena</p>
        <h1 className="section-title" style={{ fontSize: "2.6rem" }}>
          Asynchronous four-seat fiction battles with support, not betting
        </h1>
        <p className="subheadline">
          Renown is earned, not purchased. Diamonds exist for cosmetics and private premium content only, never for public outcome leverage.
        </p>
      </section>

      <div style={{ marginTop: 24 }}>
        <ArenaStudio
          personas={data.personas}
          worldPacks={data.worldPacks}
          matches={data.matches}
          participants={data.participants}
          tickets={data.tickets}
        />
      </div>
    </main>
  );
}
