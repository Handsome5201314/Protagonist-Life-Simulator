"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Rocket, Shuffle, Sparkles, UserPlus, Zap } from "lucide-react";

import { PersonaQuickDrawer } from "@/components/PersonaQuickDrawer";
import type { FateModeId, FatePrepView, FateSeat } from "@/lib/fate-arena";
import type { PersonaOverlay, PersonaSnapshot } from "@/lib/types";

type Props = {
  prepView: FatePrepView;
  personas?: PersonaSnapshot[];
  overlays?: PersonaOverlay[];
};

function seatTone(hue: FateSeat["hue"]) {
  if (hue === "cyan") return "from-cyan-400 to-blue-500";
  if (hue === "amber") return "from-amber-300 to-orange-500";
  if (hue === "violet") return "from-violet-400 to-fuchsia-500";
  return "from-pink-400 to-purple-500";
}

const modeOptions: Array<{ id: FateModeId; title: string; summary: string; bullets: string[]; icon: typeof Zap }> = [
  {
    id: "rapid",
    title: "极速推演",
    summary: "节奏更快，信息更密，适合先把角色关系和冲突一口气拉满。",
    bullets: ["15 分钟以内", "高频冲突", "适合围观"],
    icon: Zap,
  },
  {
    id: "immersive",
    title: "沉浸互动",
    summary: "延长交互窗口，让试探、拉扯和失控都更有层次。",
    bullets: ["长回合叙事", "情绪铺垫", "适合主控入戏"],
    icon: Sparkles,
  },
];

export function ArenaPrepRoom({ prepView, personas = [], overlays = [] }: Props) {
  const [activeMode, setActiveMode] = useState<FateModeId>(prepView.selectedMode);
  const [activeSeats, setActiveSeats] = useState(prepView.activeSeats);
  const [reserveSeats, setReserveSeats] = useState(prepView.reserveSeats);
  const [statusText, setStatusText] = useState(prepView.helperText || "房间准备就绪。");
  const [saving, setSaving] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPersona, setDrawerPersona] = useState<PersonaSnapshot | null>(null);

  function openDrawer(personaId: string) {
    const found = personas.find((p) => p.id === personaId) ?? null;
    setDrawerPersona(found);
    setDrawerOpen(true);
  }

  const drawerOverlay = drawerPersona ? (overlays.find((o) => o.personaId === drawerPersona.id) ?? null) : null;

  useEffect(() => {
    setActiveMode(prepView.selectedMode);
    setActiveSeats(prepView.activeSeats);
    setReserveSeats(prepView.reserveSeats);
    setStatusText(prepView.helperText || "房间准备就绪。");
  }, [prepView]);

  const emptySeats = Math.max(prepView.maxPlayers - activeSeats.length, 0);

  async function persist(nextMode: FateModeId, nextActive: FateSeat[], nextReserve: FateSeat[], successText: string) {
    if (!prepView.canPersist) {
      setStatusText(prepView.helperText || "这是预览房间，注入分身并创建真实牌桌后才能保存编排。");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/matches/${prepView.id}/prep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: nextMode,
          seatOrder: nextActive.map((seat) => seat.personaId),
          reservePersonaIds: nextReserve.map((seat) => seat.personaId),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to save prep state");
      setActiveMode(nextMode);
      setActiveSeats(nextActive);
      setReserveSeats(nextReserve);
      setStatusText(successText);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Failed to save prep state");
    } finally {
      setSaving(false);
    }
  }

  async function handleModeChange(mode: FateModeId) {
    if (mode === activeMode) return;
    await persist(mode, activeSeats, reserveSeats, `已切换到${mode === "rapid" ? "极速推演" : "沉浸互动"}模式。`);
  }

  async function handleShuffle() {
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
    const finalReserve = outgoing ? [...nextReserve, outgoing] : nextReserve;

    await persist(activeMode, nextActive, finalReserve, `已将 ${incoming.name} 调入当前席位。`);
  }

  async function handleInvite() {
    if (!reserveSeats.length) {
      setStatusText("候补池里已经没有可邀请的分身。");
      return;
    }
    if (activeSeats.length >= prepView.maxPlayers) {
      setStatusText("席位已经坐满，请先使用「换一换」调整阵容。");
      return;
    }

    const nextReserve = [...reserveSeats];
    const incoming = nextReserve.shift();
    if (!incoming) return;
    await persist(activeMode, [...activeSeats, incoming], nextReserve, `${incoming.name} 已完成入座。`);
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-4 pb-16 pt-8 md:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/72 transition hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            返回命运大厅
          </Link>
          <span className="rounded-full border border-purple-300/25 bg-purple-400/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-purple-100">Prep Room / {prepView.id}</span>
        </div>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.18),transparent_24%),radial-gradient(circle_at_74%_20%,rgba(34,211,238,0.12),transparent_24%),linear-gradient(135deg,rgba(12,10,30,0.82),rgba(36,36,62,0.72))]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {prepView.typeTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/76">{tag}</span>
                ))}
                <span className="inline-flex items-center rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs font-medium text-pink-100">{prepView.statusLabel}</span>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-white/40">剧本背景设定</p>
                <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">{prepView.title}</h1>
              </div>
              <p className="max-w-4xl text-base leading-8 text-white/72 md:text-lg">{prepView.description}</p>
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <p className="text-sm uppercase tracking-[0.22em] text-white/35">推演信号</p>
                <p className="mt-3 text-base leading-8 text-white/78">{prepView.signalLine}</p>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/20 p-6">
              <p className="text-sm uppercase tracking-[0.22em] text-white/35">席位总览</p>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">当前阵容</p>
                  <strong className="mt-2 block text-2xl font-black text-white">{activeSeats.length}/{prepView.maxPlayers}</strong>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">模式选择</p>
                  <strong className="mt-2 block text-lg font-bold text-white">{activeMode === "rapid" ? "极速推演" : "沉浸互动"}</strong>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">状态说明</p>
                  <p className="mt-2 text-sm leading-7 text-white/68">{statusText}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mode Selection */}
        <section className="grid gap-6 lg:grid-cols-2">
          {modeOptions.map((option) => {
            const Icon = option.icon;
            const active = option.id === activeMode;
            return (
              <button key={option.id} type="button" disabled={saving} onClick={() => void handleModeChange(option.id)} className={`relative overflow-hidden rounded-[30px] border p-6 text-left shadow-2xl backdrop-blur-xl transition ${active ? "border-pink-300/35 bg-white/[0.08] shadow-[0_0_34px_rgba(244,114,182,0.2)]" : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.075]"}`}>
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${active ? "from-pink-500/18 via-purple-500/18 to-transparent" : "from-white/0 to-transparent"}`} />
                <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/20"><Icon className="h-5 w-5 text-white" /></div>
                    {active ? <span className="inline-flex items-center gap-1 rounded-full border border-pink-300/30 bg-pink-400/10 px-3 py-1 text-xs font-semibold text-pink-100"><Check className="h-3.5 w-3.5" />当前启用</span> : null}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">{option.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-white/68">{option.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {option.bullets.map((bullet) => <span key={bullet} className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/68">{bullet}</span>)}
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* Seats */}
        <section className="rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-white/40">参与者列表</p>
              <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">入座分身编队</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={saving || !prepView.canPersist} onClick={() => void handleShuffle()} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white/76 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"><Shuffle className="h-4 w-4" />换一换</button>
              <button type="button" disabled={saving || !prepView.canPersist} onClick={() => void handleInvite()} className="inline-flex items-center gap-2 rounded-full border border-pink-300/30 bg-pink-400/10 px-4 py-2.5 text-sm text-pink-100 transition hover:bg-pink-400/15 disabled:cursor-not-allowed disabled:opacity-45"><UserPlus className="h-4 w-4" />邀请</button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {activeSeats.map((seat, index) => (
              <article
                key={seat.id}
                className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-5 transition hover:border-white/18 hover:bg-black/25"
              >
                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-white/[0.06] blur-2xl" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => openDrawer(seat.personaId)}
                      className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${seatTone(seat.hue)} text-lg font-black text-white shadow-[0_0_20px_rgba(168,85,247,0.15)] transition hover:scale-105`}
                    >
                      {seat.name.slice(0, 1)}
                    </button>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/62">座位 0{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{seat.name}</h3>
                    <p className="mt-2 text-sm text-white/62">{seat.role}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {seat.tags.map((tag) => <span key={tag} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">{tag}</span>)}
                    {seat.isUserOwned ? <span className="inline-flex items-center rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs text-pink-100">玩家分身</span> : null}
                  </div>
                </div>
              </article>
            ))}

            {Array.from({ length: emptySeats }).map((_, index) => (
              <article key={`empty-${index}`} className="flex min-h-[230px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-black/20 px-5 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/45"><UserPlus className="h-5 w-5" /></div>
                <h3 className="mt-4 text-lg font-semibold text-white">待邀请席位</h3>
                <p className="mt-2 max-w-xs text-sm leading-7 text-white/48">可以从候补池中补位，或在下一步接入新的数字分身。</p>
              </article>
            ))}
          </div>

          {reserveSeats.length ? (
            <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="mb-3 text-sm font-medium text-white/80">候补分身</p>
              <div className="flex flex-wrap gap-3">
                {reserveSeats.map((seat) => (
                  <div
                    key={seat.id}
                    className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 transition hover:bg-white/[0.08]"
                  >
                    <div className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${seatTone(seat.hue)} text-xs font-bold text-white`}>{seat.name.slice(0, 1)}</div>
                    <div>
                      <p className="text-sm font-medium text-white">{seat.name}</p>
                      <p className="text-xs text-white/45">{seat.tags.slice(0, 2).join(" / ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* Launch */}
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.12),transparent_50%)]" />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.28em] text-white/35">Start Sequence</p>
              <h2 className="text-3xl font-black text-white md:text-4xl">命运即将闭环，是否启动推演？</h2>
              <p className="text-sm leading-7 text-white/60 md:text-base">当前模式为 {activeMode === "rapid" ? "极速推演" : "沉浸互动"}，系统会沿着这套节奏推进互动空间，并继承你现在的入座阵容。</p>
            </div>

            {prepView.canPersist ? (
              <Link href={prepView.roomHref} className="inline-flex min-w-[18rem] items-center justify-center gap-3 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 px-8 py-5 text-lg font-bold text-white shadow-[0_0_36px_rgba(232,121,249,0.38)] transition hover:translate-y-[-1px] hover:shadow-[0_0_48px_rgba(232,121,249,0.5)]">
                <Rocket className="h-5 w-5" />
                开启命运推演
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <button type="button" disabled className="inline-flex min-w-[18rem] items-center justify-center gap-3 rounded-full bg-white/10 px-8 py-5 text-lg font-bold text-white/50">
                <Rocket className="h-5 w-5" />
                预览房间暂不可启动
              </button>
            )}
          </div>
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
