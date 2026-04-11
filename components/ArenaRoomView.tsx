"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowRight, Coins, Eye, Flame, Heart, ShieldAlert, Sparkles, Swords, WandSparkles } from "lucide-react";

import { PersonaQuickDrawer } from "@/components/PersonaQuickDrawer";
import { buildParticipantCards, buildStoryFeed } from "@/components/arena-room-data";
import { skillCatalog } from "@/lib/catalog";
import { pickLocale, type Locale } from "@/lib/i18n";
import type { ArenaMatch, MatchParticipant, PersonaOverlay, PersonaSnapshot, SupportTicket, WorldPack } from "@/lib/types";

type Props = {
  locale: Locale;
  match: ArenaMatch;
  world: WorldPack | undefined;
  participants: MatchParticipant[];
  personas: PersonaSnapshot[];
  tickets: SupportTicket[];
  overlays?: PersonaOverlay[];
};

type StreamState = {
  streamId: string;
  chunks: string[];
  scoreBoard?: Array<{ participantId: string; delta: number; total: number; notes: string[] }>;
};

export function ArenaRoomView({ locale, match, world, participants, personas, tickets, overlays = [] }: Props) {
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState("优先试探高压角色的真实底线，再决定是否亮出底牌。");
  const [selectedId, setSelectedId] = useState(participants[0]?.id ?? "");
  const [streamState, setStreamState] = useState<StreamState | null>(null);
  const [isPending, startTransition] = useTransition();
  const streamRef = useRef<EventSource | null>(null);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPersona, setDrawerPersona] = useState<PersonaSnapshot | null>(null);

  function openDrawer(personaId: string) {
    const found = personas.find((p) => p.id === personaId) ?? null;
    setDrawerPersona(found);
    setDrawerOpen(true);
  }

  const drawerOverlay = drawerPersona ? (overlays.find((o) => o.personaId === drawerPersona.id) ?? null) : null;

  const totalPool = Math.max(match.supportPool, tickets.reduce((sum, item) => sum + item.renownSpent, 0) * 10);
  const viewers = 120 + totalPool * 2 + participants.length * 60;
  const nextRound = match.roundStates.find((round) => round.status === "pending")?.round ?? 1;
  const cards = useMemo(() => buildParticipantCards(participants, personas), [participants, personas]);
  const selected = cards.find((item) => item.id === selectedId) ?? cards[0];
  const feed = useMemo(() => buildStoryFeed(match, streamState?.chunks ?? []), [match, streamState?.chunks]);
  const latestScores = streamState?.scoreBoard ?? match.roundStates.slice().reverse().find((round) => round.scores.length)?.scores ?? [];
  const lookup = Object.fromEntries(cards.map((item) => [item.id, item] as const));

  useEffect(() => () => streamRef.current?.close(), []);

  async function postAction(url: string, body: object, success: string, fail: string, onDone?: (payload: any) => void) {
    setStatus("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || fail);
      setStatus(success);
      onDone?.(payload);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : fail);
    }
  }

  function startStreaming(streamId: string) {
    streamRef.current?.close();
    const source = new EventSource(`/api/streams/${streamId}`);
    streamRef.current = source;
    setStreamState({ streamId, chunks: [] });
    source.addEventListener("delta", (event) => {
      const payload = JSON.parse(event.data) as { text: string };
      setStreamState((prev) => (prev ? { ...prev, chunks: [...prev.chunks, payload.text] } : { streamId, chunks: [payload.text] }));
    });
    source.addEventListener("final", (event) => {
      const payload = JSON.parse(event.data) as StreamState;
      setStreamState((prev) => ({ streamId, chunks: prev?.chunks || [], scoreBoard: payload.scoreBoard }));
      source.close();
      streamRef.current = null;
    });
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 md:px-6 lg:px-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.18),transparent_24%),radial-gradient(circle_at_74%_20%,rgba(34,211,238,0.12),transparent_24%),linear-gradient(135deg,rgba(12,10,30,0.82),rgba(36,36,62,0.72))]" />
          <div className="relative grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-pink-100"><Flame className="h-3.5 w-3.5" />竞技场互动室</span>
              <div>
                <p className="text-sm uppercase tracking-[0.26em] text-white/35">当前剧本</p>
                <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">{world?.title || "未知竞技场"}</h1>
              </div>
              <p className="max-w-4xl text-base leading-8 text-white/72 md:text-lg">{world?.sanitizedSummary || "这个房间仍在凝结自己的命运规则。"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-white/35">状态</p><strong className="mt-2 inline-flex items-center gap-2 text-lg font-black text-white"><Sparkles className="h-4 w-4 text-pink-300" />{match.publicStoryStatus}</strong></div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-white/35">在场围观</p><strong className="mt-2 inline-flex items-center gap-2 text-lg font-black text-white"><Eye className="h-4 w-4 text-cyan-300" />{viewers.toLocaleString()}</strong></div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-white/35">奖金池</p><strong className="mt-2 inline-flex items-center gap-2 text-lg font-black text-white"><Coins className="h-4 w-4 text-amber-300" />{totalPool.toLocaleString()}</strong></div>
            </div>
          </div>
        </section>

        {/* Main layout: Sidebar + Content */}
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          {/* Left sidebar - Participants */}
          <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
            <section className="rounded-[30px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
              <p className="px-2 text-sm uppercase tracking-[0.24em] text-white/35">参与者侧栏</p>
              <div className="mt-4 space-y-3">
                {cards.map((item) => {
                  const participant = participants.find((p) => p.id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                        if (participant) openDrawer(participant.personaId);
                      }}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${selected?.id === item.id ? "border-white/20 bg-white/[0.09]" : "border-white/10 bg-black/20 hover:bg-white/[0.07]"}`}
                    >
                      <div className="flex gap-3">
                        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${item.avatarTone} text-sm font-black text-white shadow-[0_0_16px_rgba(168,85,247,0.12)]`}>{item.name.slice(0, 1)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{item.name}</p><p className="mt-1 text-xs text-white/45">{item.tags.join(" / ")}</p></div>
                            <span className={`rounded-full border px-2 py-1 text-[0.68rem] ${item.eliminated ? "border-rose-300/30 bg-rose-400/10 text-rose-100" : "border-white/10 bg-white/5 text-white/60"}`}>{item.eliminated ? "出局" : "在场"}</span>
                          </div>
                          {/* Heartbeat + Stress bars */}
                          <div className="mt-4 space-y-3">
                            <div>
                              <div className="mb-1 flex items-center justify-between text-[0.72rem] text-white/48">
                                <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-pink-300" />心动值</span>
                                <span className="font-bold text-pink-200">{item.resonance}</span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 shadow-[0_0_10px_rgba(244,114,182,0.3)] transition-all duration-700"
                                  style={{ width: `${item.resonance}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 flex items-center justify-between text-[0.72rem] text-white/48">
                                <span className="inline-flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-cyan-300" />压力值</span>
                                <span className="font-bold text-cyan-200">{item.pressure}</span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all duration-700"
                                  style={{ width: `${item.pressure}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {selected ? (
              <section className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
                <p className="text-sm uppercase tracking-[0.24em] text-white/35">当前锁定</p>
                <h3 className="mt-2 text-xl font-black text-white">{selected.name}</h3>
                <div className="mt-4 flex gap-2">
                  {[8, 15].map((amount) => (
                    <button key={amount} type="button" onClick={() => void postAction(`/api/matches/${match.id}/support`, { participantId: selected.id, renownSpent: amount }, `已向 ${selected.name} 注入 ${amount} 围观支持。`, "注入围观失败")} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/80 transition hover:bg-white/[0.08]"><Eye className="h-4 w-4 text-pink-300" />+{amount}</button>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>

          {/* Right content */}
          <div className="space-y-6">
            {/* Story feed */}
            <section className="rounded-[30px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-sm uppercase tracking-[0.24em] text-white/35">进度步骤条</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {match.roundStates.map((round) => (
                    <div key={round.round} className={`rounded-[22px] border p-4 ${round.status === "done" ? "border-emerald-300/25 bg-emerald-400/10" : round.status === "streaming" ? "border-pink-300/30 bg-pink-400/10 shadow-[0_0_16px_rgba(244,114,182,0.12)]" : "border-white/10 bg-black/20"}`}>
                      <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-white">回合 {round.round}</span><span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.68rem] text-white/60">{round.status}</span></div>
                      <p className="mt-3 text-sm text-white/78">{round.title}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="max-h-[620px] space-y-5 overflow-y-auto p-5 md:p-6">
                {feed.map((entry) => {
                  if (entry.kind === "system") return (
                    <div key={entry.id} className="mx-auto max-w-2xl rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-center">
                      <p className="text-[0.72rem] uppercase tracking-[0.26em] text-white/35">{entry.title}</p>
                      <p className="mt-3 text-sm leading-7 text-white/72 md:text-base">{entry.text}</p>
                    </div>
                  );
                  const actor = lookup[entry.speakerId];
                  if (!actor) return null;
                  return (
                    <div key={entry.id} className={`flex max-w-[88%] gap-3 ${actor.isUserOwned ? "ml-auto" : "mr-auto"}`}>
                      {!actor.isUserOwned ? <div className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${actor.avatarTone} text-sm font-black text-white shadow-[0_0_12px_rgba(168,85,247,0.1)]`}>{actor.name.slice(0, 1)}</div> : null}
                      <div className={`flex-1 rounded-[26px] border px-4 py-4 ${actor.bubbleTone}`}>
                        <div className="mb-2 flex items-center gap-2"><span className={`text-sm font-semibold ${actor.textTone}`}>{actor.name}</span><span className="text-[0.72rem] text-white/38">{actor.tags.join(" / ")}</span></div>
                        <p className="text-sm leading-7 text-white/80 md:text-base">{entry.text}</p>
                      </div>
                      {actor.isUserOwned ? <div className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${actor.avatarTone} text-sm font-black text-white shadow-[0_0_12px_rgba(168,85,247,0.1)]`}>{actor.name.slice(0, 1)}</div> : null}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Action panel */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4"><div><p className="text-sm uppercase tracking-[0.24em] text-white/35">主控台</p><h2 className="mt-2 text-2xl font-black text-white">行动与技能卡</h2></div><span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70">{selected?.name ?? "未锁定"}</span></div>
                <div className="mt-5 space-y-5">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <label className="block text-sm font-medium text-white/75">行动草案</label>
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-3 min-h-[132px] w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/28" placeholder="写下下一步行动..." />
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button type="button" onClick={() => setStatus(`已记录给 ${selected?.name ?? "当前分身"} 的行动建议。`)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.12]"><WandSparkles className="h-4 w-4 text-pink-300" />记录草案</button>
                      <button type="button" disabled={isPending || !match.roundStates.some((round) => round.status === "pending")} onClick={() => void postAction(`/api/matches/${match.id}/rounds/${nextRound}/trigger`, { locale }, `第 ${nextRound} 回合已启动，正在生成实时演算。`, "回合触发失败", (payload) => { startStreaming(payload.streamId); startTransition(() => { window.setTimeout(() => window.location.reload(), 3200); }); })} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(232,121,249,0.28)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-50"><Swords className="h-4 w-4" />触发下一回合<ArrowRight className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {skillCatalog.filter((skill) => skill.allowedModes.includes("arena")).slice(0, 3).map((skill) => (
                      <button key={skill.id} type="button" disabled={!selected} onClick={() => selected && void postAction(`/api/matches/${match.id}/rounds/${nextRound}/equip-skill`, { participantId: selected.id, skillId: skill.id }, `技能 ${skill.id} 已挂载到第 ${nextRound} 回合。`, "技能挂载失败")} className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-left transition hover:border-white/15 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"><div className="flex items-start justify-between gap-3"><div><p className="text-lg font-bold text-white">{skill.name}</p><p className="mt-2 text-sm leading-7 text-white/62">{skill.flavor}</p></div><span className="rounded-full border border-pink-300/20 bg-pink-400/10 px-2 py-1 text-xs text-pink-100">{skill.costRenown}</span></div></button>
                    ))}
                  </div>
                  {status ? <div className="rounded-[22px] border border-pink-300/20 bg-pink-400/10 px-4 py-3 text-sm text-pink-50">{status}</div> : null}
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl"><p className="text-sm uppercase tracking-[0.24em] text-white/35">战局反馈</p><div className="mt-4 space-y-3">{latestScores.length ? latestScores.map((score) => { const actor = lookup[score.participantId]; return actor ? <div key={score.participantId} className="rounded-[22px] border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-white">{actor.name}</span><span className="text-sm font-bold text-white">{score.delta >= 0 ? "+" : ""}{score.delta}</span></div><p className="mt-2 text-xs text-white/42">总分 {score.total}</p></div> : null; }) : <div className="rounded-[22px] border border-dashed border-white/12 bg-black/20 p-4 text-sm leading-7 text-white/55">当前还没有公开的分数变化。</div>}</div></div>
                <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl"><p className="text-sm uppercase tracking-[0.24em] text-white/35">围观账本</p><div className="mt-4 space-y-3">{tickets.length ? tickets.slice().reverse().slice(0, 6).map((ticket) => <div key={ticket.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm text-white/72"><div className="flex items-center justify-between gap-3"><span className="font-medium text-white">{lookup[ticket.participantId]?.name ?? ticket.participantId}</span><span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.68rem] text-white/55">{ticket.rewardTier}</span></div><p className="mt-2 text-xs text-white/45">消耗 {ticket.renownSpent} · {ticket.status}</p></div>) : <div className="rounded-[22px] border border-dashed border-white/12 bg-black/20 p-4 text-sm leading-7 text-white/55">还没有围观支援记录。</div>}</div></div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Persona Quick Drawer */}
      <PersonaQuickDrawer
        open={drawerOpen}
        persona={drawerPersona}
        overlay={drawerOverlay}
        memories={[]}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
