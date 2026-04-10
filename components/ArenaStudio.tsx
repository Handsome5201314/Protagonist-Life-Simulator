"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { skillCatalog } from "@/lib/catalog";
import type { ArenaMatch, MatchParticipant, PersonaSnapshot, SupportTicket, WorldPack } from "@/lib/types";

type Props = {
  personas: PersonaSnapshot[];
  worldPacks: WorldPack[];
  matches: ArenaMatch[];
  participants: MatchParticipant[];
  tickets: SupportTicket[];
};

type StreamState = {
  streamId: string;
  chunks: string[];
  scoreBoard?: Array<{ participantId: string; delta: number; total: number; notes: string[] }>;
  elimination?: string;
  winnerId?: string;
};

export function ArenaStudio({ personas, worldPacks, matches, participants, tickets }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [selectedWorld, setSelectedWorld] = useState(worldPacks[0]?.id || "");
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>(
    personas.filter((persona) => persona.adultOnlyEligible || persona.source === "legend").slice(0, 2).map((persona) => persona.id)
  );
  const [activeMatchId, setActiveMatchId] = useState(matches[0]?.id || "");
  const [streamState, setStreamState] = useState<StreamState | null>(null);

  const bundles = useMemo(
    () =>
      matches.map((match) => ({
        match,
        participants: participants.filter((participant) => match.participantIds.includes(participant.id)),
      })),
    [matches, participants]
  );

  const activeBundle = bundles.find((bundle) => bundle.match.id === activeMatchId) || bundles[0];

  async function createArenaMatch() {
    setStatus("");
    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "public",
          worldPackId: selectedWorld,
          participantPersonaIds: selectedPersonaIds,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create match");
      }
      setStatus("A four-seat table has been opened.");
      setActiveMatchId(payload.match.id);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create match");
    }
  }

  async function supportParticipant(participantId: string, renownSpent: number) {
    if (!activeBundle) return;

    setStatus("");
    try {
      const response = await fetch(`/api/matches/${activeBundle.match.id}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, renownSpent }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Support failed");
      setStatus(`Support ticket sealed at ${payload.ticket.rewardTier} tier.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Support failed");
    }
  }

  async function equipSkill(participantId: string, skillId: string, round: number) {
    if (!activeBundle) return;

    setStatus("");
    try {
      const response = await fetch(`/api/matches/${activeBundle.match.id}/rounds/${round}/equip-skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, skillId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to equip skill");
      setStatus(`Skill ${payload.skillId} installed for round ${round}.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to equip skill");
    }
  }

  function startStreaming(streamId: string) {
    const source = new EventSource(`/api/streams/${streamId}`);
    setStreamState({ streamId, chunks: [] });

    source.addEventListener("delta", (event) => {
      const payload = JSON.parse(event.data) as { text: string };
      setStreamState((prev) =>
        prev ? { ...prev, chunks: [...prev.chunks, payload.text] } : { streamId, chunks: [payload.text] }
      );
    });

    source.addEventListener("final", (event) => {
      const payload = JSON.parse(event.data) as StreamState;
      setStreamState((prev) => ({
        streamId,
        chunks: prev?.chunks || [],
        scoreBoard: payload.scoreBoard,
        elimination: payload.elimination,
        winnerId: payload.winnerId,
      }));
      source.close();
      startTransition(() => router.refresh());
    });
  }

  async function triggerRound(round: number) {
    if (!activeBundle) return;

    setStatus("");
    try {
      const response = await fetch(`/api/matches/${activeBundle.match.id}/rounds/${round}/trigger`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to trigger round");
      setStatus(`Round ${round} is streaming now.`);
      startStreaming(payload.streamId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to trigger round");
    }
  }

  return (
    <div className="grid-list">
      <section className="glass-panel">
        <p className="section-kicker">Public Arena</p>
        <h2 className="section-title">Back a hero with Renown, not betting odds</h2>
        <div className="hero-grid">
          <div className="stack">
            <div>
              <label className="label">World Pack</label>
              <select className="select" value={selectedWorld} onChange={(event) => setSelectedWorld(event.target.value)}>
                {worldPacks.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Seat Your Human Heroes</label>
              <div className="pill-row">
                {personas.map((persona) => {
                  const checked = selectedPersonaIds.includes(persona.id);
                  const disabled = !persona.adultOnlyEligible && persona.source !== "legend";
                  return (
                    <label key={persona.id} className="pill" style={{ opacity: disabled ? 0.55 : 1 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(event) =>
                          setSelectedPersonaIds((prev) =>
                            event.target.checked ? [...prev, persona.id].slice(0, 4) : prev.filter((id) => id !== persona.id)
                          )
                        }
                      />
                      <span>{persona.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="actions">
              <button className="btn" disabled={isPending} onClick={() => void createArenaMatch()}>
                Open Public Table
              </button>
            </div>
          </div>

          <div className="ring-shell">
            <div className="fate-ring">
              <div className="fate-ring__core">
                <div className="badge">Crowd Momentum</div>
                <h3 className="section-title" style={{ fontSize: "1.4rem", marginTop: 12 }}>
                  Support replaces odds
                </h3>
                <p className="muted small">
                  Public support spends Renown only. Diamonds never enter the outcome loop.
                </p>
              </div>
            </div>
          </div>
        </div>
        {status ? <p className="small muted">{status}</p> : null}
      </section>

      <section className="three-col">
        <div className="card">
          <h3 className="section-title" style={{ fontSize: "1.2rem" }}>
            Open Tables
          </h3>
          <div className="stack">
            {bundles.map((bundle) => (
              <button
                key={bundle.match.id}
                className="btn-ghost"
                onClick={() => setActiveMatchId(bundle.match.id)}
                style={{ textAlign: "left" }}
              >
                {bundle.match.id.slice(0, 12)} · {bundle.match.publicStoryStatus}
              </button>
            ))}
          </div>
        </div>

        <div className="story-panel" style={{ gridColumn: "span 2" }}>
          <div className="story-header">
            <p className="section-kicker" style={{ color: "rgba(255,244,223,0.72)", marginBottom: 6 }}>
              Serialized Chapter Flow
            </p>
            <h3 className="section-title" style={{ color: "#fbf4e9", marginBottom: 0 }}>
              {activeBundle ? activeBundle.match.id.slice(0, 18) : "No table yet"}
            </h3>
          </div>
          <div className="story-body">
            <div className="story-typing">
              {streamState?.chunks.length
                ? streamState.chunks.join("\n\n")
                : "Trigger a round to watch the chapter arrive through an SSE typewriter stream."}
            </div>
            {streamState?.scoreBoard?.length ? (
              <>
                <div className="divider" />
                <div className="stack">
                  {streamState.scoreBoard.map((score) => {
                    const participant = activeBundle?.participants.find((item) => item.id === score.participantId);
                    return (
                      <div key={score.participantId}>
                        <strong>{participant?.displayName}</strong> · {score.delta >= 0 ? "+" : ""}
                        {score.delta} / total {score.total}
                      </div>
                    );
                  })}
                  {streamState.elimination ? <div className="danger">Elimination recorded this round.</div> : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {activeBundle ? (
        <section className="glass-panel">
          <div className="two-col">
            <div className="stack">
              <p className="section-kicker">Participant Cards</p>
              <h2 className="section-title">命运天平上的角色牌</h2>
              {activeBundle.participants.map((participant) => {
                const totalMax = Math.max(...activeBundle.participants.map((item) => item.supportTotal), 1);
                const supportPercent = (participant.supportTotal / totalMax) * 100;
                return (
                  <div key={participant.id} className="card">
                    <div className="stack">
                      <div className="badge">{participant.eliminated ? "Eliminated" : "Live Seat"}</div>
                      <strong>{participant.displayName}</strong>
                      <div className="support-meter">
                        <div className="support-meter__fill" style={{ width: `${supportPercent}%` }} />
                        <span className="support-meter__label">Crowd Momentum {participant.supportTotal}</span>
                      </div>
                      <div className="actions">
                        {[8, 15, 24].map((amount) => (
                          <button key={amount} className="btn-ghost" disabled={isPending} onClick={() => void supportParticipant(participant.id, amount)}>
                            Support {amount}
                          </button>
                        ))}
                      </div>
                      <div className="actions">
                        {skillCatalog.filter((skill) => skill.allowedModes.includes("arena")).slice(0, 3).map((skill) => (
                          <button
                            key={skill.id}
                            className="btn-secondary"
                            disabled={isPending}
                            onClick={() => void equipSkill(participant.id, skill.id, 1)}
                          >
                            {skill.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="stack">
              <p className="section-kicker">Round Engine</p>
              <h2 className="section-title">Three-act asynchronous chapter battle</h2>
              <div className="stack">
                {activeBundle.match.roundStates.map((roundState) => (
                  <div key={roundState.round} className="card">
                    <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>
                          Round {roundState.round}: {roundState.title}
                        </strong>
                        <div className="small muted">Status: {roundState.status}</div>
                      </div>
                      <button className="btn" disabled={isPending} onClick={() => void triggerRound(roundState.round)}>
                        Trigger Stream
                      </button>
                    </div>
                    {roundState.chapter ? <p className="muted small">{roundState.chapter.slice(0, 190)}...</p> : null}
                  </div>
                ))}
              </div>

              <div className="card">
                <strong>Support Tickets</strong>
                <div className="stack small">
                  {tickets.filter((ticket) => ticket.matchId === activeBundle.match.id).map((ticket) => (
                    <div key={ticket.id}>
                      {ticket.rewardTier} ticket · {ticket.status} · spent {ticket.renownSpent}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
