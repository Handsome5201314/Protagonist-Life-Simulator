"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Coins, Eye, Flame, Heart, Search, Sparkles, Star } from "lucide-react";

import { pickLocale, type Locale } from "@/lib/i18n";
import type { DatingMarketCandidate } from "@/lib/dating-market";
import type { PersonaSnapshot, UserRecord } from "@/lib/types";

type Props = {
  locale: Locale;
  user: UserRecord;
  selfPersona: PersonaSnapshot | null;
  candidates: Array<DatingMarketCandidate & { statusLine: string }>;
};

type DatingLobbyCategory = "all" | "voltage" | "gentle" | "steady";

type MarketRoom = {
  id: string;
  title: string;
  category: DatingLobbyCategory;
  typeLabel: string;
  participants: number;
  maxParticipants: number;
  viewers: number;
  pool: number;
  status: string;
  agents: string[];
  candidate: DatingMarketCandidate & { statusLine: string };
  border: string;
  theme: string;
};

function buildMarketRooms(
  locale: Locale,
  selfPersona: PersonaSnapshot | null,
  candidates: Array<DatingMarketCandidate & { statusLine: string }>
): MarketRoom[] {
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  return candidates.map((candidate, index) => {
    const category: DatingLobbyCategory =
      candidate.matchScore >= 84 ? "voltage" : candidate.matchScore >= 72 ? "gentle" : "steady";
    const status =
      category === "voltage"
        ? t("High Voltage", "高压拉扯")
        : category === "gentle"
          ? t("Slow Burn", "慢热试探")
          : t("Stable Entry", "稳态开场");

    return {
      id: candidate.personaId,
      title:
        category === "voltage"
          ? t(`${candidate.name} / Voltage Room`, `${candidate.name} / 高压心动局`)
          : category === "gentle"
            ? t(`${candidate.name} / Slow Burn Room`, `${candidate.name} / 慢热试探局`)
            : t(`${candidate.name} / Steady Room`, `${candidate.name} / 稳态相遇局`),
      category,
      typeLabel: t("Dating Room", "相亲局"),
      participants: selfPersona ? 2 : 1,
      maxParticipants: 2,
      viewers: 360 + candidate.matchScore * 16 + index * 79,
      pool: 12000 + candidate.matchScore * 760 + index * 2400,
      status,
      agents: selfPersona ? [selfPersona.name, candidate.name] : [candidate.name],
      candidate,
      border:
        category === "voltage"
          ? "border-pink-500/30"
          : category === "gentle"
            ? "border-purple-500/30"
            : "border-indigo-500/30",
      theme:
        category === "voltage"
          ? "from-pink-500/20 to-purple-500/20"
          : category === "gentle"
            ? "from-purple-500/20 to-indigo-500/20"
            : "from-indigo-500/20 to-blue-500/20",
    };
  });
}

export function DatingMarketHub({ locale, user, selfPersona, candidates }: Props) {
  const router = useRouter();
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  const [activeCategory, setActiveCategory] = useState<DatingLobbyCategory>("all");
  const [query, setQuery] = useState("");
  const [statusText, setStatusText] = useState("");
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const categories = [
    { id: "all" as const, name: t("All Rooms", "全部相遇") },
    { id: "voltage" as const, name: t("Voltage", "高压拉扯") },
    { id: "gentle" as const, name: t("Slow Burn", "温柔慢热") },
    { id: "steady" as const, name: t("Steady", "稳定匹配") },
  ];

  const marketRooms = useMemo(() => buildMarketRooms(locale, selfPersona, candidates), [locale, selfPersona, candidates]);
  const filteredRooms = useMemo(() => {
    return marketRooms.filter((room) => {
      const categoryPass = activeCategory === "all" || room.category === activeCategory;
      const queryPass =
        !deferredQuery.trim() ||
        `${room.title} ${room.candidate.tagline} ${room.candidate.tags.join(" ")} ${room.candidate.vibeHint}`
          .toLowerCase()
          .includes(deferredQuery.trim().toLowerCase());
      return categoryPass && queryPass;
    });
  }, [activeCategory, deferredQuery, marketRooms]);

  const featured = filteredRooms[0] ?? marketRooms[0];

  async function enterRoom(counterpartPersonaId: string) {
    if (!selfPersona) {
      setStatusText(t("Please prepare an adult SELF persona first.", "请先在“我的分身”里准备一位成年本人分身。"));
      return;
    }

    setStatusText("");
    try {
      const response = await fetch("/api/dating/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfPersonaId: selfPersona.id, counterpartPersonaId, locale }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("Failed to create dating room", "创建相亲房失败"));
      startTransition(() => {
        router.push(`/dating/room/${payload.room.id}`);
      });
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : t("Failed to create dating room", "创建相亲房失败"));
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] px-4 pb-16 pt-8 text-white md:px-6 lg:px-8">
      <section className="mb-12 grid gap-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
        <div className="relative min-h-[18rem] overflow-hidden rounded-[28px] border border-white/10 bg-black/40 p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-600/40 to-transparent" />
          <div className="relative z-10 max-w-lg">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/20 px-3 py-1 text-xs font-bold text-pink-300">
              <Flame className="h-3 w-3" />
              {t("Today's Hot Room", "今日焦点相亲局")}
            </div>
            <h1 className="mb-4 text-3xl font-bold text-white drop-shadow-lg md:text-5xl">
              {featured ? featured.title : t("Turing Dating Market", "图灵相亲市场")}
            </h1>
            <p className="mb-6 line-clamp-3 text-sm leading-7 text-white/70">
              {featured
                ? `${featured.candidate.tagline} ${featured.candidate.statusLine}`
                : t("Choose a counterpart and enter a fresh 1v1 room directly.", "从候选人里挑一位，直接进入新的 1v1 相亲房。")}
            </p>
            <button
              type="button"
              onClick={() => featured && void enterRoom(featured.id)}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-2 font-bold text-black transition-colors hover:bg-pink-100"
            >
              {t("Enter Now", "立即进入")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-black/30 p-6">
          <div className="inline-flex rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-pink-200">
            {t("Dating Market", "相亲市场")}
          </div>
          <h2 className="mt-4 text-3xl font-black text-white">{t("Pick the next room worth entering", "给你的分身挑一间值得进入的房")}</h2>
          <p className="mt-4 text-sm leading-7 text-white/68">
            {t(
              "This market only serves 1v1 story-first dating rooms. Once you enter, the room opens immediately with the selected locale.",
              "这里专门提供 1v1 的叙事型相亲房。点进房间后，会直接按你当前语言打开互动。"
            )}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">{t("Current User", "当前用户")}</p>
              <strong className="mt-2 block text-lg font-black text-white">{user.displayName}</strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">{t("Dating Persona", "相亲分身")}</p>
              <strong className="mt-2 block text-lg font-black text-white">{selfPersona ? selfPersona.name : t("Not Ready", "未准备")}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search room title or vibe tags", "搜索房间名或气氛标签")}
            className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 transition-colors focus:border-purple-500/50 focus:outline-none"
          />
        </div>

        <div className="custom-scrollbar flex w-full gap-2 overflow-x-auto pb-2 md:w-auto md:pb-0">
          {categories.map((category) => {
            const active = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                  active ? "border-purple-500/50 bg-purple-500/20 text-purple-200" : "border-white/5 bg-black/20 text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {!selfPersona ? (
        <div className="mb-8 rounded-3xl border border-amber-300/20 bg-amber-400/10 p-6 text-white shadow-2xl backdrop-blur-xl">
          {t(
            "No adult SELF persona is ready for the dating market yet. Prepare one in Persona Vault first.",
            "还没有可进入相亲市场的成年本人分身。请先到“我的分身”里准备一位成年本人分身。"
          )}
        </div>
      ) : null}

      {statusText ? (
        <div className="mb-8 rounded-[24px] border border-pink-300/20 bg-pink-400/10 px-5 py-4 text-sm text-pink-50">
          {statusText}
        </div>
      ) : null}

      <div className="columns-1 gap-6 md:columns-2 lg:columns-3">
        {filteredRooms.map((room) => (
          <article
            key={room.id}
            className={`group relative mb-6 flex break-inside-avoid flex-col overflow-hidden rounded-2xl border ${room.border} bg-white/5 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}
          >
            <div className={`absolute inset-0 z-0 bg-gradient-to-br ${room.theme} opacity-50 transition-opacity group-hover:opacity-100`} />
            <div className="relative z-10 mb-4 flex items-start justify-between">
              <div>
                <span className="mb-2 inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
                  {room.typeLabel}
                </span>
                <h3 className="text-lg font-bold text-white">{room.title}</h3>
              </div>
              <div className="rounded-full border border-white/20 bg-black/40 px-2 py-1 text-xs text-white/60">{room.status}</div>
            </div>

            <div className="relative z-10 mb-6 flex-1">
              <p className="mb-2 text-xs text-white/50">
                {t("Current Cast", "当前在场")} ({room.participants}/{room.maxParticipants})
              </p>
              <div className="flex flex-wrap gap-1">
                {room.agents.map((agent, index) => (
                  <span key={`${agent}-${index}`} className="rounded border border-white/5 bg-black/30 px-2 py-1 text-[11px] text-white/80">
                    {agent}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-white/70">{room.candidate.vibeHint}</p>
            </div>

            <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="mb-0.5 text-[10px] text-white/40">{t("Viewers", "围观")}</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-white/80">
                    <Eye className="h-3 w-3" /> {room.viewers}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="mb-0.5 text-[10px] text-white/40">{t("Pool", "热度池")}</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-yellow-400">
                    <Coins className="h-3 w-3" /> {room.pool.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={isPending || !selfPersona}
                onClick={() => void enterRoom(room.id)}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {t("Enter Room", "进入房间")}
              </button>
            </div>
          </article>
        ))}
      </div>

      {!filteredRooms.length ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-white/12 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-xl">
          <p className="text-lg font-semibold text-white">{t("No rooms match the current filter.", "当前筛选条件下没有相亲房")}</p>
          <p className="mt-3 text-sm leading-7 text-white/55">
            {t("Try switching back to all rooms or use a broader keyword.", "试着切回“全部相遇”，或者换一个更宽松的关键词。")}
          </p>
        </div>
      ) : null}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}
