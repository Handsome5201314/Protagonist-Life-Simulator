"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Rocket,
  Shuffle,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";

import type { FateModeId, FateRoomCard, FateSeat } from "@/lib/fate-arena";

type Props = {
  room: FateRoomCard;
};

const modeOptions: Array<{
  id: FateModeId;
  title: string;
  summary: string;
  bullets: string[];
  icon: typeof Zap;
}> = [
  {
    id: "rapid",
    title: "极速推演",
    summary: "节奏更快，信息更密，适合先把角色关系与张力拉满。",
    bullets: ["15 分钟以内", "高频冲突", "适合围观"],
    icon: Zap,
  },
  {
    id: "immersive",
    title: "沉浸互动",
    summary: "延长交互窗口，让角色试探、拉扯和失控都更有层次。",
    bullets: ["长回合叙事", "情绪铺垫", "适合主控入戏"],
    icon: Sparkles,
  },
];

function seatTone(hue: FateSeat["hue"]) {
  if (hue === "cyan") return "from-cyan-400 to-blue-500";
  if (hue === "amber") return "from-amber-300 to-orange-500";
  if (hue === "violet") return "from-violet-400 to-fuchsia-500";
  return "from-pink-400 to-purple-500";
}

export function ArenaPrepRoom({ room }: Props) {
  const [activeMode, setActiveMode] = useState<FateModeId>("rapid");
  const [activeSeats, setActiveSeats] = useState(() => room.roster.slice(0, room.players));
  const [reserveSeats, setReserveSeats] = useState(() => room.roster.slice(room.players));
  const [statusText, setStatusText] = useState("分身同步稳定，可以开始布置席位。");

  const emptySeats = Math.max(room.maxPlayers - activeSeats.length, 0);
  const selectedMode = modeOptions.find((option) => option.id === activeMode) ?? modeOptions[0];

  const seatSummary = useMemo(() => {
    return activeSeats.map((seat) => seat.name).join(" / ");
  }, [activeSeats]);

  function handleShuffle() {
    if (!reserveSeats.length || !activeSeats.length) {
      setStatusText("当前没有可轮换的候补分身。");
      return;
    }

    const nextReserve = [...reserveSeats];
    const incoming = nextReserve.shift();
    if (!incoming) return;

    const nextActive = [...activeSeats];
    const outgoing = nextActive.pop();
    nextActive.push(incoming);

    setActiveSeats(nextActive);
    setReserveSeats(outgoing ? [...nextReserve, outgoing] : nextReserve);
    setStatusText(`已切换为 ${incoming.name} 入座，席位气压重新校准。`);
  }

  function handleInvite() {
    if (!reserveSeats.length) {
      setStatusText("候补池已经见底，当前没有新的分身可邀请。");
      return;
    }

    if (activeSeats.length >= room.maxPlayers) {
      setStatusText("席位已经坐满，可以先用“换一换”调整阵容。");
      return;
    }

    const nextReserve = [...reserveSeats];
    const incoming = nextReserve.shift();
    if (!incoming) return;

    setActiveSeats([...activeSeats, incoming]);
    setReserveSeats(nextReserve);
    setStatusText(`${incoming.name} 已收到邀请并完成入座。`);
  }

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-4 pb-16 pt-8 md:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/72 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          返回命运大厅
        </Link>
        <span className="rounded-full border border-purple-300/25 bg-purple-400/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-purple-100">
          Prep Room / {room.id}
        </span>
      </div>

      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.18),transparent_24%),radial-gradient(circle_at_74%_20%,rgba(34,211,238,0.12),transparent_24%),linear-gradient(135deg,rgba(12,10,30,0.82),rgba(36,36,62,0.72))]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {room.typeTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/76"
                >
                  {tag}
                </span>
              ))}
              <span className="inline-flex items-center rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs font-medium text-pink-100">
                {room.statusLabel}
              </span>
            </div>

            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-white/40">剧本背景设定</p>
              <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">{room.title}</h1>
            </div>

            <p className="max-w-4xl text-base leading-8 text-white/72 md:text-lg">{room.description}</p>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-sm uppercase tracking-[0.22em] text-white/35">推演信号</p>
              <p className="mt-3 text-base leading-8 text-white/78">{room.signalLine}</p>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-black/20 p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-white/35">席位总览</p>
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">当前阵容</p>
                <strong className="mt-2 block text-2xl font-black text-white">
                  {activeSeats.length}/{room.maxPlayers}
                </strong>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">模式选择</p>
                <strong className="mt-2 block text-lg font-bold text-white">{selectedMode.title}</strong>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">已就位分身</p>
                <p className="mt-2 text-sm leading-7 text-white/68">
                  {seatSummary || "等待首位分身入座"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {modeOptions.map((option) => {
          const Icon = option.icon;
          const active = option.id === activeMode;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setActiveMode(option.id)}
              className={`relative overflow-hidden rounded-[30px] border p-6 text-left shadow-2xl backdrop-blur-xl transition ${
                active
                  ? "border-pink-300/35 bg-white/[0.08] shadow-[0_0_34px_rgba(244,114,182,0.2)]"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.075]"
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${
                  active ? "from-pink-500/18 via-purple-500/18 to-transparent" : "from-white/0 to-transparent"
                }`}
              />
              <div className="relative space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  {active ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-pink-300/30 bg-pink-400/10 px-3 py-1 text-xs font-semibold text-pink-100">
                      <Check className="h-3.5 w-3.5" />
                      当前启用
                    </span>
                  ) : null}
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white">{option.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-white/68">{option.summary}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {option.bullets.map((bullet) => (
                    <span
                      key={bullet}
                      className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/68"
                    >
                      {bullet}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <section className="rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-white/40">参与者列表</p>
            <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">入座分身编队</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleShuffle}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white/76 transition hover:bg-white/10 hover:text-white"
            >
              <Shuffle className="h-4 w-4" />
              换一换
            </button>
            <button
              type="button"
              onClick={handleInvite}
              className="inline-flex items-center gap-2 rounded-full border border-pink-300/30 bg-pink-400/10 px-4 py-2.5 text-sm text-pink-100 transition hover:bg-pink-400/15"
            >
              <UserPlus className="h-4 w-4" />
              邀请
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {activeSeats.map((seat, index) => (
            <article
              key={seat.id}
              className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-5"
            >
              <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-white/[0.08] blur-2xl" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${seatTone(seat.hue)} text-lg font-black text-white`}>
                    {seat.name.slice(0, 1)}
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/62">
                    座位 0{index + 1}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">{seat.name}</h3>
                  <p className="mt-2 text-sm text-white/62">{seat.role}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {seat.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                    >
                      {tag}
                    </span>
                  ))}
                  {seat.isUserOwned ? (
                    <span className="inline-flex items-center rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs text-pink-100">
                      玩家分身
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}

          {Array.from({ length: emptySeats }).map((_, index) => (
            <article
              key={`empty-${index}`}
              className="flex min-h-[230px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-black/20 px-5 text-center"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/45">
                <UserPlus className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">待邀请席位</h3>
              <p className="mt-2 max-w-xs text-sm leading-7 text-white/48">
                可以从候补池中补位，或在下一步接入新的数字分身。
              </p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5">
          <p className="text-sm leading-7 text-white/70">{statusText}</p>
        </div>
      </section>

      <section className="rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.28em] text-white/35">Start Sequence</p>
            <h2 className="text-3xl font-black text-white md:text-4xl">命运即将闭环，是否启动推演？</h2>
            <p className="text-sm leading-7 text-white/60 md:text-base">
              当前模式为 {selectedMode.title}，系统会沿着这套节奏推进互动空间，并继承你现在的入座阵容。
            </p>
          </div>

          <Link
            href={room.roomHref}
            className="inline-flex min-w-[18rem] items-center justify-center gap-3 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 px-8 py-5 text-lg font-bold text-white shadow-[0_0_36px_rgba(232,121,249,0.38)] transition hover:translate-y-[-1px]"
          >
            <Rocket className="h-5 w-5" />
            开启命运推演
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
