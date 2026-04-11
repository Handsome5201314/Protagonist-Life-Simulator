"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronRight,
  Coins,
  Eye,
  Flame,
  Heart,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import type { DatingMarketCandidate } from "@/lib/dating-market";
import type { PersonaSnapshot, UserRecord } from "@/lib/types";

type Props = {
  user: UserRecord;
  selfPersona: PersonaSnapshot | null;
  candidates: Array<DatingMarketCandidate & { statusLine: string }>;
};

type DatingLobbyCategory = "all" | "romance" | "voltage" | "gentle";

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

const categories = [
  { id: "all" as const, name: "全部邂逅", icon: Sparkles },
  { id: "romance" as const, name: "图灵相亲", icon: Heart },
  { id: "voltage" as const, name: "高压拉扯", icon: Flame },
  { id: "gentle" as const, name: "温柔慢热", icon: Star },
];

function buildMarketRooms(selfPersona: PersonaSnapshot | null, candidates: Array<DatingMarketCandidate & { statusLine: string }>): MarketRoom[] {
  return candidates.map((candidate, index) => {
    const highVoltage = candidate.matchScore >= 84;
    const gentle = candidate.matchScore < 84 && candidate.matchScore >= 70;
    const category: DatingLobbyCategory = highVoltage ? "voltage" : gentle ? "gentle" : "romance";
    const status = highVoltage ? "推演中" : gentle ? "等待加入" : "招募中";

    return {
      id: candidate.personaId,
      title:
        category === "voltage"
          ? `${candidate.name} · 心动爆灯局`
          : category === "gentle"
            ? `${candidate.name} · 慢热试探局`
            : `${candidate.name} · 图灵相亲局`,
      category,
      typeLabel: "相亲局",
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
            : "border-fuchsia-500/30",
      theme:
        category === "voltage"
          ? "from-pink-500/20 to-purple-500/20"
          : category === "gentle"
            ? "from-purple-500/20 to-indigo-500/20"
            : "from-rose-500/20 to-fuchsia-500/20",
    };
  });
}

export function DatingMarketHub({ user, selfPersona, candidates }: Props) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<DatingLobbyCategory>("all");
  const [query, setQuery] = useState("");
  const [statusText, setStatusText] = useState("");
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const marketRooms = useMemo(() => buildMarketRooms(selfPersona, candidates), [selfPersona, candidates]);
  const filteredRooms = useMemo(() => {
    return marketRooms.filter((room) => {
      const categoryPass = activeCategory === "all" || room.category === activeCategory || (activeCategory === "romance" && room.category !== "all");
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
      setStatusText("请先到“我的分身”里准备一位成年本人分身。");
      return;
    }

    setStatusText("");
    try {
      const response = await fetch("/api/dating/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfPersonaId: selfPersona.id, counterpartPersonaId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to create dating room");
      startTransition(() => router.push(`/dating/room/${payload.room.id}`));
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to create dating room");
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1440px] px-4 pb-16 pt-8 text-white md:px-6 lg:px-8">
      <div className="mb-12 h-48 w-full cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-8 shadow-2xl md:h-64 md:p-12 relative group flex items-center">
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-pink-600/40 to-transparent" />
        <div className="relative z-10 max-w-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/20 px-3 py-1 text-xs font-bold text-pink-300">
            <Flame className="h-3 w-3" />
            今日最热相亲局
          </div>
          <h1 className="mb-4 text-3xl font-bold text-white drop-shadow-lg md:text-5xl">
            {featured ? featured.title : "图灵相亲局：谁能拿到心动爆灯？"}
          </h1>
          <p className="mb-6 line-clamp-2 text-sm text-white/70">
            {featured
              ? `${featured.candidate.tagline} ${featured.candidate.statusLine}`
              : "当前奖金池已突破 200,000 星币！两位高共情分身的极致拉扯，速来强势围观或投入你的数字分身！"}
          </p>
          <button
            type="button"
            onClick={() => featured && void enterRoom(featured.id)}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-2 font-bold text-black transition-colors hover:bg-pink-100"
          >
            立即进入
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Heart className="absolute right-12 top-1/2 h-48 w-48 -translate-y-1/2 -rotate-12 text-pink-500/20 transition-transform duration-700 group-hover:scale-110" />
      </div>

      <div className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索房名、匹配对象或氛围标签..."
            className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 transition-colors focus:border-purple-500/50 focus:outline-none"
          />
        </div>

        <div className="custom-scrollbar flex w-full gap-2 overflow-x-auto pb-2 md:w-auto md:pb-0">
          {categories.map((category) => {
            const Icon = category.icon;
            const active = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? "border-purple-500/50 bg-purple-500/20 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                    : "border-white/5 bg-black/20 text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {!selfPersona ? (
        <div className="mb-8 rounded-3xl border border-amber-300/20 bg-amber-400/10 p-6 text-white shadow-2xl backdrop-blur-xl">
          还没有可进入相亲市场的成年本人分身。请先到“我的分身”里准备一位成年本人分身。
        </div>
      ) : null}

      {statusText ? (
        <div className="mb-8 rounded-[24px] border border-pink-300/20 bg-pink-400/10 px-5 py-4 text-sm text-pink-50">
          {statusText}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRooms.map((room) => (
          <article
            key={room.id}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border ${room.border} bg-white/5 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}
          >
            <div className={`absolute inset-0 z-0 bg-gradient-to-br ${room.theme} opacity-50 transition-opacity group-hover:opacity-100`} />

            <div className="relative z-10 mb-4 flex items-start justify-between">
              <div>
                <span className="mb-2 inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
                  {room.typeLabel}
                </span>
                <h3 className="text-lg font-bold text-white transition-colors group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 group-hover:bg-clip-text group-hover:text-transparent">
                  {room.title}
                </h3>
              </div>
              <div className={`rounded-full border px-2 py-1 text-xs ${room.status === "推演中" ? "animate-pulse border-pink-500/50 bg-pink-500/10 text-pink-300" : "border-white/20 bg-black/40 text-white/60"}`}>
                {room.status}
              </div>
            </div>

            <div className="relative z-10 mb-6 flex-1">
              <p className="mb-2 text-xs text-white/50">当前在场分身 ({room.participants}/{room.maxParticipants})：</p>
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
                  <span className="mb-0.5 text-[10px] text-white/40">吃瓜群众</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-white/80">
                    <Eye className="h-3 w-3" />
                    {room.viewers}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="mb-0.5 text-[10px] text-white/40">奖金池</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-yellow-400">
                    <Coins className="h-3 w-3" />
                    {room.pool.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="mb-0.5 text-[10px] text-white/40">匹配值</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-pink-200">
                    <Briefcase className="h-3 w-3" />
                    {room.candidate.matchScore}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={isPending || !selfPersona}
                onClick={() => void enterRoom(room.id)}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {room.status === "推演中" ? "立即心动" : "注入分身"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {!filteredRooms.length ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-white/12 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-xl">
          <p className="text-lg font-semibold text-white">当前筛选条件下没有相亲局</p>
          <p className="mt-3 text-sm leading-7 text-white/55">试着切回“全部邂逅”或更换搜索关键词。</p>
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
