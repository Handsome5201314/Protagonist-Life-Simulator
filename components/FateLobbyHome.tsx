"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Coins, Eye, Flame, Search, ShieldAlert, Sparkles, Users } from "lucide-react";

import { PersonaQuickDrawer } from "@/components/PersonaQuickDrawer";
import type { FateCategory, FateRoomCard, FateSeat } from "@/lib/fate-arena";
import type { PersonaOverlay, PersonaSnapshot, UserRecord } from "@/lib/types";

type Props = {
  user: UserRecord;
  rooms: FateRoomCard[];
  personas?: PersonaSnapshot[];
  overlays?: PersonaOverlay[];
};

const categoryItems: Array<{ id: FateCategory | "all"; label: string; icon: typeof Sparkles }> = [
  { id: "all", label: "全部宇宙", icon: Sparkles },
  { id: "survival", label: "废土生存", icon: ShieldAlert },
  { id: "business", label: "商战博弈", icon: BriefcaseBusiness },
  { id: "mystery", label: "秘仪悬疑", icon: Flame },
];

function categoryTone(category: FateCategory) {
  if (category === "survival") {
    return { badge: "border-cyan-300/30 bg-cyan-400/10 text-cyan-200", glow: "from-cyan-500/30 via-sky-500/12 to-transparent" };
  }
  if (category === "business") {
    return { badge: "border-amber-300/30 bg-amber-400/10 text-amber-100", glow: "from-amber-500/30 via-orange-500/12 to-transparent" };
  }
  return { badge: "border-purple-300/30 bg-purple-400/10 text-purple-100", glow: "from-purple-500/30 via-violet-500/15 to-transparent" };
}

function seatTone(hue: FateSeat["hue"]) {
  if (hue === "cyan") return "from-cyan-400 to-blue-500";
  if (hue === "amber") return "from-amber-300 to-orange-500";
  if (hue === "violet") return "from-violet-400 to-fuchsia-500";
  return "from-pink-400 to-purple-500";
}

export function FateLobbyHome({ user, rooms, personas = [], overlays = [] }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FateCategory | "all">("all");
  const deferredQuery = useDeferredValue(query);
  const isLinked = user.linkedAiliangbiao?.status === "linked";

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPersona, setDrawerPersona] = useState<PersonaSnapshot | null>(null);

  function openDrawer(persona: PersonaSnapshot) {
    setDrawerPersona(persona);
    setDrawerOpen(true);
  }

  const drawerOverlay = useMemo(() => {
    if (!drawerPersona) return null;
    return overlays.find((o) => o.personaId === drawerPersona.id) ?? null;
  }, [drawerPersona, overlays]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const categoryPass = activeCategory === "all" || room.category === activeCategory;
      const queryPass =
        !deferredQuery.trim() ||
        `${room.title} ${room.description} ${room.hook} ${room.typeTags.join(" ")}`
          .toLowerCase()
          .includes(deferredQuery.trim().toLowerCase());
      return categoryPass && queryPass;
    });
  }, [activeCategory, deferredQuery, rooms]);

  const featuredRoom = filteredRooms[0] ?? rooms[0];
  const liveRooms = rooms.filter((room) => room.status === "running");
  const recruitingSeats = rooms.reduce((sum, room) => sum + Math.max(room.maxPlayers - room.players, 0), 0);

  return (
    <>
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-16 pt-8 md:px-6 lg:px-8">
        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.2),transparent_24%),radial-gradient(circle_at_74%_20%,rgba(34,211,238,0.12),transparent_24%),linear-gradient(135deg,rgba(12,10,30,0.82),rgba(36,36,62,0.72))]" />
          <div className="relative grid gap-6 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-purple-300/25 bg-purple-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-purple-100">
                <Sparkles className="h-3.5 w-3.5" />
                Destiny Hall
              </span>
              <div>
                <p className="text-sm uppercase tracking-[0.26em] text-white/35">命运大厅</p>
                <h1 className="mt-3 text-4xl font-black leading-tight text-white md:text-5xl lg:text-6xl">
                  这里专门承载
                  <span className="bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent"> 相亲局之外 </span>
                  的命运牌桌。
                </h1>
              </div>
              <p className="max-w-4xl text-base leading-8 text-white/72 md:text-lg">
                命运大厅现在只展示废土、生存、商战、秘仪和悬疑类房间。图灵相亲和 1v1 心动链路已经被独立拆分到"相亲市场"，两条入口内容和语气彻底分开。
              </p>

              {featuredRoom ? (
                <div className="grid gap-4 rounded-[28px] border border-white/10 bg-black/20 p-5 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {featuredRoom.typeTags.map((tag) => (
                        <span key={tag} className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${categoryTone(featuredRoom.category).badge}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-white/40">本轮焦点剧本</p>
                      <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">{featuredRoom.title}</h2>
                    </div>
                    <p className="max-w-2xl text-sm leading-7 text-white/68 md:text-base">{featuredRoom.signalLine}</p>
                  </div>

                  <Link href={featuredRoom.ctaHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_26px_rgba(34,211,238,0.22)] transition hover:translate-y-[-1px]">
                    {featuredRoom.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/20 p-6 shadow-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">大厅房间数</p>
                  <strong className="mt-2 block text-2xl font-black text-white">{rooms.length}</strong>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">进行中剧本</p>
                  <strong className="mt-2 block text-2xl font-black text-white">{liveRooms.length}</strong>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">待观察席位</p>
                  <strong className="mt-2 block text-2xl font-black text-white">{recruitingSeats}</strong>
                </div>
              </div>

              <div className="mt-4 rounded-[26px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm leading-7 text-white/72">想进入图灵相亲、1v1 邂逅和心动爆灯类内容，请直接前往顶部导航中的"相亲市场"。</p>
              </div>

              <Link href={isLinked ? "/dating" : "/api/auth/agentpit/login"} className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-semibold transition ${isLinked ? "border border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.12]" : "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-[0_0_24px_rgba(192,132,252,0.34)] hover:translate-y-[-1px]"}`}>
                {isLinked ? "前往相亲市场" : "AgentPit 授权登录"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Search + Filter */}
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl md:p-5">
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-white/60">
              <Search className="h-5 w-5 text-white/40" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索命运牌桌、剧本代号或世界设定..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/28" />
            </label>

            <div className="flex flex-wrap gap-3">
              {categoryItems.map((item) => {
                const Icon = item.icon;
                const active = activeCategory === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => setActiveCategory(item.id)} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${active ? "border-cyan-300/35 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)]" : "border-white/10 bg-black/20 text-white/62 hover:border-white/20 hover:text-white"}`}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Card Waterfall */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/35">Destiny Stream</p>
              <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">非相亲类房间卡流</h2>
            </div>
            <p className="text-sm text-white/45">共 {filteredRooms.length} 个剧本房间</p>
          </div>

          <div className="columns-1 gap-5 md:columns-2 xl:columns-3">
            {filteredRooms.map((room) => {
              const tone = categoryTone(room.category);
              return (
                <article key={room.id} className="group relative mb-5 break-inside-avoid overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.075]">
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`} />
                  <div className="relative space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {room.typeTags.map((tag) => (
                            <span key={tag} className={`inline-flex items-center rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${tone.badge}`}>{tag}</span>
                          ))}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white">{room.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-white/60">{room.hook}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${room.status === "running" ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-100" : room.status === "replay" ? "border-amber-300/25 bg-amber-400/10 text-amber-100" : "border-white/10 bg-white/5 text-white/68"}`}>{room.statusLabel}</span>
                    </div>

                    <p className="text-sm leading-7 text-white/72">{room.description}</p>

                    {/* Seat roster - clickable to open drawer */}
                    <div className="flex flex-wrap gap-3">
                      {room.roster.slice(0, Math.max(room.players, 3)).map((seat) => {
                        const persona = personas.find((p) => p.id === seat.personaId);
                        return (
                          <button
                            key={seat.id}
                            type="button"
                            onClick={() => persona && openDrawer(persona)}
                            className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.08]"
                          >
                            <div className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${seatTone(seat.hue)} text-xs font-bold text-white`}>{seat.name.slice(0, 1)}</div>
                            <div className="min-w-0">
                              <p className="max-w-[8rem] truncate text-sm font-medium text-white">{seat.name}</p>
                              <p className="text-xs text-white/45">{seat.tags.slice(0, 2).join(" / ")}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
                      <div className="flex gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40">席位</span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-white/80"><Users className="h-3 w-3" />{room.players}/{room.maxPlayers}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40">围观</span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-white/80"><Eye className="h-3 w-3" />{room.spectators.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/40">奖金池</span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300"><Coins className="h-3 w-3" />{room.prizePool.toLocaleString()}</span>
                        </div>
                      </div>
                      <Link href={room.ctaHref} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition ${room.status === "recruiting" || room.isPreviewRoom ? "bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_20px_rgba(34,211,238,0.18)] hover:translate-y-[-1px]" : "border border-white/20 bg-white/[0.08] hover:bg-white/[0.12]"}`}>
                        {room.ctaLabel}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {!filteredRooms.length ? (
            <div className="rounded-[28px] border border-dashed border-white/12 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-xl">
              <p className="text-lg font-semibold text-white">当前筛选条件下没有命运房间</p>
              <p className="mt-3 text-sm leading-7 text-white/55">试着切回"全部宇宙"或更换搜索关键词，我们会重新展开大厅卡流。</p>
            </div>
          ) : null}
        </section>
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
