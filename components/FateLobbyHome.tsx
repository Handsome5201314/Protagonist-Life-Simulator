"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { ArrowRight, Coins, Eye, HeartHandshake, Search, Sparkles, Swords } from "lucide-react";

import { PersonaQuickDrawer } from "@/components/PersonaQuickDrawer";
import { pickLocale, type Locale } from "@/lib/i18n";
import type { FateCategory, FateRoomCard, FateSeat } from "@/lib/fate-arena";
import type { PersonaOverlay, PersonaSnapshot, UserRecord } from "@/lib/types";

type Props = {
  locale: Locale;
  user: UserRecord;
  rooms: FateRoomCard[];
  personas?: PersonaSnapshot[];
  overlays?: PersonaOverlay[];
};

function seatTone(hue: FateSeat["hue"]) {
  if (hue === "cyan") return "from-cyan-400 to-blue-500";
  if (hue === "amber") return "from-amber-300 to-orange-500";
  if (hue === "violet") return "from-violet-400 to-fuchsia-500";
  return "from-pink-400 to-rose-500";
}

function categoryTone(category: FateCategory) {
  if (category === "survival") return "from-cyan-500/24 via-sky-500/12 to-transparent";
  if (category === "business") return "from-amber-500/24 via-orange-500/12 to-transparent";
  return "from-fuchsia-500/24 via-violet-500/12 to-transparent";
}

export function FateLobbyHome({ locale, user, rooms, personas = [], overlays = [] }: Props) {
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FateCategory | "all">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPersona, setDrawerPersona] = useState<PersonaSnapshot | null>(null);
  const deferredQuery = useDeferredValue(query);

  const categoryItems: Array<{ id: FateCategory | "all"; label: string }> = [
    { id: "all", label: t("All Tables", "全部牌桌") },
    { id: "survival", label: t("Survival", "求生残局") },
    { id: "business", label: t("Capital Duel", "财阀博弈") },
    { id: "mystery", label: t("Mystery", "秘仪悬疑") },
  ];

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

  const featuredRoom = filteredRooms[0] ?? rooms[0] ?? null;
  const liveRooms = rooms.filter((room) => room.status === "running").length;
  const totalViewers = rooms.reduce((sum, room) => sum + room.spectators, 0);

  const drawerOverlay = useMemo(() => {
    if (!drawerPersona) return null;
    return overlays.find((item) => item.personaId === drawerPersona.id) ?? null;
  }, [drawerPersona, overlays]);

  function openDrawer(persona: PersonaSnapshot) {
    setDrawerPersona(persona);
    setDrawerOpen(true);
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-20 pt-8 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.22),transparent_22%),radial-gradient(circle_at_78%_18%,rgba(34,211,238,0.14),transparent_22%),linear-gradient(135deg,rgba(12,10,30,0.84),rgba(36,36,62,0.74))]" />
          <div className="relative grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-pink-100">
                <Sparkles className="h-3.5 w-3.5" />
                {t("Live Rooms", "实时房间")}
              </div>
              <p className="mt-5 text-sm uppercase tracking-[0.28em] text-white/38">
                {t("Arena / Dating / Persona Injection", "竞技房 / 相亲房 / 分身注入")}
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-6xl">
                {t("Open a room and make it actually move", "先把房间真正跑起来")}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/72 md:text-lg">
                {t(
                  "The home screen now focuses on the playable loops: arena, dating, and persona management.",
                  "首页现在只聚焦可实际游玩的主循环：竞技场、相亲市场和分身管理。"
                )}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/arena" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(236,72,153,0.28)] transition hover:translate-y-[-1px]">
                  {t("Enter Arena", "进入竞技场")}
                  <Swords className="h-4 w-4" />
                </Link>
                <Link href="/dating" className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-6 py-3 text-sm font-semibold text-white/88 transition hover:bg-white/[0.08]">
                  {t("Enter Dating Market", "进入相亲市场")}
                  <HeartHandshake className="h-4 w-4" />
                </Link>
                <Link href="/personas" className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/14">
                  {t("Manage Personas", "管理分身")}
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[30px] border border-white/10 bg-black/20 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-white/38">{t("Current State", "当前状态")}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/40">{t("Live Tables", "运行中牌桌")}</p>
                    <strong className="mt-2 block text-2xl font-black text-white">{liveRooms}</strong>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/40">{t("Total Viewers", "观战总量")}</p>
                    <strong className="mt-2 block text-2xl font-black text-white">{totalViewers.toLocaleString()}</strong>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/40">{t("Current Personas", "当前分身")}</p>
                    <strong className="mt-2 block text-2xl font-black text-white">{personas.length}</strong>
                  </div>
                </div>
              </div>

              {featuredRoom ? (
                <article className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/20 p-6">
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${categoryTone(featuredRoom.category)}`} />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/38">{t("Featured Room", "当前焦点房间")}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">{featuredRoom.statusLabel}</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-white">{featuredRoom.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-white/72">{featuredRoom.signalLine}</p>
                    <Link href={featuredRoom.ctaHref} className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px]">
                      {featuredRoom.ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-violet-200/80">{t("Lobby Stream", "大厅流")}</p>
              <h2 className="mt-3 text-2xl font-black text-white md:text-3xl">{t("Live Destiny Tables", "实时命运牌桌")}</h2>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/60">
              <Search className="h-5 w-5 text-white/40" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("Search room title or hook", "搜索牌桌名或剧情钩子")}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/28"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {categoryItems.map((item) => {
              const active = activeCategory === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveCategory(item.id)}
                  className={`rounded-2xl border px-4 py-3 text-sm transition ${
                    active ? "border-cyan-300/35 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-black/20 text-white/62 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-3">
            {filteredRooms.map((room) => (
              <article key={room.id} className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-black/20 p-6 transition hover:border-white/20 hover:bg-white/[0.04]">
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${categoryTone(room.category)}`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {room.typeTags.map((tag) => (
                          <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.72rem] text-white/78">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="mt-4 text-xl font-black text-white">{room.title}</h3>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75">{room.statusLabel}</span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-white/68">{room.description}</p>
                  <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/78">{room.signalLine}</p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {room.roster.slice(0, Math.max(room.players, 3)).map((seat) => {
                      const persona = personas.find((item) => item.id === seat.personaId);
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          onClick={() => persona && openDrawer(persona)}
                          className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          <div className={`grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br ${seatTone(seat.hue)} text-xs font-bold text-white`}>
                            {seat.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[8rem] truncate text-sm font-medium text-white">{seat.name}</p>
                            <p className="text-xs text-white/45">{seat.tags.slice(0, 2).join(" / ")}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-[0.68rem] uppercase tracking-[0.14em] text-white/40">{t("Seats", "席位")}</span>
                        <strong className="mt-1 block text-white">{room.players}/{room.maxPlayers}</strong>
                      </div>
                      <div>
                        <span className="text-[0.68rem] uppercase tracking-[0.14em] text-white/40">{t("Viewers", "围观")}</span>
                        <strong className="mt-1 block text-white">{room.spectators.toLocaleString()}</strong>
                      </div>
                      <div>
                        <span className="text-[0.68rem] uppercase tracking-[0.14em] text-white/40">{t("Pool", "奖池")}</span>
                        <strong className="mt-1 block text-amber-300">{room.prizePool.toLocaleString()}</strong>
                      </div>
                    </div>
                    <Link href={room.ctaHref} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:translate-y-[-1px]">
                      {room.ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

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
