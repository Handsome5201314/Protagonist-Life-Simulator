"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Coins, Eye, Flame, PlusCircle, ShieldCheck, Swords, Users } from "lucide-react";

import { buildFateLobbyRooms, type FateRoomCard } from "@/lib/fate-arena";
import type { ArenaMatch, MatchParticipant, PersonaSnapshot, SupportTicket, UserRecord, WorldPack } from "@/lib/types";

type Props = {
  user: UserRecord;
  personas: PersonaSnapshot[];
  worldPacks: WorldPack[];
  matches: ArenaMatch[];
  participants: MatchParticipant[];
  tickets: SupportTicket[];
};

export function ArenaControlHub({ user, personas, worldPacks, matches, participants, tickets }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [selectedWorld, setSelectedWorld] = useState(worldPacks[0]?.id || "");
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>(
    personas.filter((item) => item.adultOnlyEligible || item.source === "legend").slice(0, 2).map((item) => item.id)
  );

  const rooms = useMemo(
    () =>
      buildFateLobbyRooms({
        worldPacks,
        matches,
        participants,
        personas,
      }),
    [worldPacks, matches, participants, personas]
  );

  const selectablePersonas = personas.filter((item) => item.adultOnlyEligible || item.source === "legend");
  const openTickets = tickets.length;

  function togglePersona(id: string) {
    setSelectedPersonaIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id].slice(0, 4);
    });
  }

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
      if (!response.ok) throw new Error(payload.error || "Failed to create arena match");
      setStatus("新的命运牌桌已经开启。");
      startTransition(() => router.push(`/arena/prep/${payload.match.id}`));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create arena match");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-16 pt-8 md:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.18),transparent_24%),radial-gradient(circle_at_74%_18%,rgba(34,211,238,0.12),transparent_24%),linear-gradient(135deg,rgba(12,10,30,0.82),rgba(36,36,62,0.72))]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-pink-100">
              <Swords className="h-3.5 w-3.5" />
              Arena Command
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-white/35">战局放映厅</p>
              <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">公开牌桌管理台</h1>
            </div>
            <p className="max-w-4xl text-base leading-8 text-white/72 md:text-lg">
              在这里快速开局、选择世界包、编排真人分身上桌，并跳转到准备室或实时互动房间。它是大厅之外的战局运营入口。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">房间总数</p>
              <strong className="mt-2 block text-2xl font-black text-white">{rooms.length}</strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">围观声望</p>
              <strong className="mt-2 inline-flex items-center gap-2 text-lg font-black text-white"><Coins className="h-4 w-4 text-pink-300" />{user.wallet.renown}</strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">支援记录</p>
              <strong className="mt-2 inline-flex items-center gap-2 text-lg font-black text-white"><Flame className="h-4 w-4 text-cyan-300" />{openTickets}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/35">Create Table</p>
            <h2 className="mt-2 text-2xl font-black text-white">开启新的命运牌桌</h2>
          </div>
          <div className="mt-5 grid gap-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-white/72">剧本世界包</span>
              <select value={selectedWorld} onChange={(event) => setSelectedWorld(event.target.value)} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none">
                {worldPacks.map((world) => (
                  <option key={world.id} value={world.id}>{world.title}</option>
                ))}
              </select>
            </label>

            <div>
              <span className="mb-3 block text-sm font-medium text-white/72">上桌分身</span>
              <div className="grid gap-3 md:grid-cols-2">
                {selectablePersonas.map((persona) => {
                  const active = selectedPersonaIds.includes(persona.id);
                  return (
                    <button key={persona.id} type="button" onClick={() => togglePersona(persona.id)} className={`rounded-[22px] border p-4 text-left transition ${active ? "border-pink-300/30 bg-pink-400/10" : "border-white/10 bg-black/20 hover:bg-white/[0.07]"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{persona.name}</p>
                          <p className="mt-2 text-xs text-white/45">{persona.publicTraitTags.slice(0, 2).join(" / ")}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.68rem] text-white/60">{persona.source}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="button" disabled={isPending || !selectedPersonaIds.length || !selectedWorld} onClick={() => void createArenaMatch()} className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(232,121,249,0.28)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-45">
              <PlusCircle className="h-4 w-4" />
              进入准备室
            </button>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/35">Live Rooms</p>
            <h2 className="mt-2 text-2xl font-black text-white">当前牌桌</h2>
          </div>
          <div className="mt-5 space-y-4">
            {rooms.slice(0, 5).map((room: FateRoomCard) => (
              <article key={room.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{room.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/62">{room.signalLine}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${room.status === "recruiting" ? "border-white/10 bg-white/5 text-white/68" : "border-pink-300/25 bg-pink-400/10 text-pink-100"}`}>{room.statusLabel}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-white/72"><Users className="mb-2 h-4 w-4 text-white/45" />{room.players}/{room.maxPlayers}</div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-white/72"><Eye className="mb-2 h-4 w-4 text-white/45" />{room.spectators}</div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-white/72"><Flame className="mb-2 h-4 w-4 text-white/45" />{room.prizePool}</div>
                </div>
                <Link href={room.status === "recruiting" ? room.prepHref : room.roomHref} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.12]">
                  {room.status === "recruiting" ? "查看准备室" : "进入互动室"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {status ? <div className="rounded-[24px] border border-pink-300/20 bg-pink-400/10 px-5 py-4 text-sm text-pink-50">{status}</div> : null}

      <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-cyan-300" />
          <h2 className="text-2xl font-black text-white">运营说明</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">声望用于公开围观与技能挂载，不参与直接买胜负。</div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">先在准备室编排席位，再进入互动主界面进行实时推演。</div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">所有房间都继承首页的深空玻璃拟物视觉，便于统一世界观。</div>
        </div>
      </section>
    </main>
  );
}
