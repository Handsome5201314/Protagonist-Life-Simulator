"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Edit3,
  Hash,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import type { PersonaOverlay, PersonaSnapshot, UserRecord } from "@/lib/types";

type Props = {
  user: UserRecord;
  personas: PersonaSnapshot[];
  overlays: PersonaOverlay[];
};

type RadarTrait = {
  name: string;
  value: number;
  color: string;
};

function getOwnedPersonas(personas: PersonaSnapshot[]) {
  return personas.filter((persona) => persona.source !== "legend" && !persona.deletedAt);
}

function getRating(snapshot: PersonaSnapshot) {
  const values = [
    snapshot.traitVector.charm,
    snapshot.traitVector.empathy,
    snapshot.traitVector.chaos,
    snapshot.traitVector.resilience,
    snapshot.traitVector.strategy,
  ];
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (avg >= 78) return "S";
  if (avg >= 66) return "A";
  if (avg >= 54) return "B";
  return "C";
}

function getConstraints(snapshot: PersonaSnapshot) {
  return [
    ...snapshot.publicTraitTags,
    ...snapshot.fears,
    snapshot.communicationStyle,
    snapshot.careerTilt,
  ]
    .filter(Boolean)
    .slice(0, 8);
}

function deriveRadarTraits(snapshot: PersonaSnapshot): RadarTrait[] {
  return [
    { name: "社交能量", value: snapshot.traitVector.charm / 100, color: "#ec4899" },
    { name: "共情共鸣", value: snapshot.traitVector.empathy / 100, color: "#a855f7" },
    { name: "行为灵活", value: snapshot.traitVector.chaos / 100, color: "#3b82f6" },
    { name: "抗压韧性", value: snapshot.traitVector.resilience / 100, color: "#10b981" },
    { name: "理性逻辑", value: snapshot.traitVector.strategy / 100, color: "#eab308" },
  ];
}

function getSourceLabel(snapshot: PersonaSnapshot) {
  if (snapshot.source === "ailiangbiao") return "AIliangbiao 认证";
  if (snapshot.source === "upload") return "上传铸造";
  return "传说预设";
}

function getImportedLabel(snapshot: PersonaSnapshot, user: UserRecord) {
  if (snapshot.source === "ailiangbiao") {
    return user.linkedAiliangbiao?.linkedAt
      ? new Date(user.linkedAiliangbiao.linkedAt).toLocaleString()
      : "AIliangbiao Sync";
  }

  return new Date(snapshot.expiresAt).toLocaleDateString();
}

function RadarChart({ traits, size = 280 }: { traits: RadarTrait[]; size?: number }) {
  const center = size / 2;
  const radius = size / 2 - 40;
  const angles = traits.map((_, index) => (Math.PI * 2 * index) / traits.length - Math.PI / 2);

  const getPoint = (value: number, angle: number) => ({
    x: center + radius * value * Math.cos(angle),
    y: center + radius * value * Math.sin(angle),
  });

  const levels = [0.2, 0.4, 0.6, 0.8, 1];
  const points = traits.map((trait, index) => getPoint(trait.value, angles[index]));
  const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="overflow-visible drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
        {levels.map((level, idx) => {
          const grid = angles.map((angle) => {
            const point = getPoint(level, angle);
            return `${point.x},${point.y}`;
          });

          return (
            <polygon
              key={idx}
              points={grid.join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          );
        })}

        {angles.map((angle, idx) => {
          const point = getPoint(1, angle);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          );
        })}

        <polygon points={polygonPoints} fill="url(#user-center-radar)" stroke="#a855f7" strokeWidth="2" />

        {points.map((point, index) => (
          <circle
            key={traits[index].name}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={traits[index].color}
            className="drop-shadow-[0_0_5px_currentColor]"
          />
        ))}

        {traits.map((trait, index) => {
          const point = getPoint(1.2, angles[index]);
          let anchor: "start" | "middle" | "end" = "middle";
          if (point.x < center - 10) anchor = "end";
          if (point.x > center + 10) anchor = "start";

          return (
            <text
              key={trait.name}
              x={point.x}
              y={point.y + 5}
              fill="rgba(255,255,255,0.72)"
              fontSize="12"
              fontWeight="700"
              textAnchor={anchor}
              letterSpacing="0.08em"
            >
              {trait.name}
            </text>
          );
        })}

        <defs>
          <linearGradient id="user-center-radar" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(236,72,153,0.4)" />
            <stop offset="100%" stopColor="rgba(168,85,247,0.4)" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_20px_10px_rgba(168,85,247,0.5)]" />
    </div>
  );
}

export function UserLoginPanel({ user, personas, overlays }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const ownedPersonas = useMemo(() => getOwnedPersonas(personas), [personas]);
  const [selectedId, setSelectedId] = useState(ownedPersonas[0]?.id || "");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    displayName: user.displayName || "",
    fullName: user.profile?.fullName || user.displayName || "",
    phone: user.profile?.phone || "",
    email: user.profile?.email || "",
    city: user.profile?.city || "",
    bio: user.profile?.bio || "",
  });

  const selected = ownedPersonas.find((persona) => persona.id === selectedId) || ownedPersonas[0] || null;
  const overlay = selected ? overlays.find((item) => item.personaId === selected.id) || null : null;
  const traits = selected ? deriveRadarTraits(selected) : [];
  const constraints = selected ? getConstraints(selected) : [];

  async function saveProfile() {
    setStatus("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to save profile");
      setStatus("用户基础信息已保存。");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save profile");
    }
  }

  async function copyHash() {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.lockedHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-16 pt-8 md:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.18),transparent_24%),radial-gradient(circle_at_78%_18%,rgba(34,211,238,0.12),transparent_24%),linear-gradient(135deg,rgba(12,10,30,0.82),rgba(36,36,62,0.72))]" />
        <div className="relative grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col gap-6">
            {selected ? (
              <>
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                  <div className="absolute left-0 top-0 h-32 w-full bg-gradient-to-b from-purple-500/20 to-transparent" />
                  <div className="relative flex flex-col items-center">
                    <div className="relative mb-6 mt-4 flex h-28 w-28 items-center justify-center">
                      <div className="absolute inset-0 rounded-[40%_60%_70%_30%] bg-gradient-to-tr from-pink-500 to-purple-600 opacity-60 blur-md [animation:spin_8s_linear_infinite]" />
                      <div className="absolute inset-2 rounded-[60%_40%_30%_70%] bg-gradient-to-bl from-cyan-400 to-purple-500 shadow-[inset_0_0_20px_rgba(255,255,255,0.5)] [animation:spin_12s_linear_infinite_reverse]" />
                      <Sparkles className="relative z-10 h-8 w-8 animate-pulse text-white drop-shadow-lg" />
                    </div>

                    <div className="flex w-full flex-col items-center gap-2">
                      <div className="group flex cursor-pointer items-center gap-2">
                        <h2 className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-2xl font-bold tracking-widest text-transparent">
                          {selected.dataGhost?.displayAlias || selected.name}
                        </h2>
                        <Edit3 className="h-4 w-4 text-white/30 transition-colors group-hover:text-white/80" />
                      </div>

                      <div className="mt-2 flex items-center gap-3">
                        <span className="flex items-center gap-1 rounded-full border border-yellow-500/50 bg-gradient-to-r from-yellow-600/40 to-amber-500/40 px-2 py-1 text-[10px] font-bold tracking-wider text-yellow-200 shadow-[0_0_10px_rgba(234,179,8,0.2)] backdrop-blur-sm">
                          <ShieldCheck className="h-3 w-3" />
                          {getSourceLabel(selected)}
                        </span>
                        <span className="rounded-full border border-purple-500/30 bg-purple-900/50 px-2 py-1 text-[10px] font-bold text-purple-200">
                          评级 {getRating(selected)}
                        </span>
                      </div>

                      <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
                        Gene Extracted: {getImportedLabel(selected, user)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                  <h3 className="mb-6 flex items-center gap-2 border-b border-white/10 pb-3 text-sm font-bold uppercase tracking-widest text-white/80">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
                    命运星盘 (DNA Snapshot)
                  </h3>

                  <div className="mb-6">
                    <RadarChart traits={traits} />
                  </div>

                  <div className="mb-6">
                    <p className="mb-3 text-[10px] uppercase tracking-widest text-white/40">
                      行为约束 (Behavioral Constraints)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {constraints.map((tag, index) => (
                        <span
                          key={`${tag}-${index}`}
                          className="cursor-default rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/80 transition-colors hover:border-pink-500/40 hover:text-pink-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="group relative overflow-hidden rounded-xl border border-purple-500/20 bg-black/40 p-3">
                    <div className="absolute left-[-100%] top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent group-hover:[animation:shimmer_1.5s_infinite]" />
                    <p className="mb-1 flex items-center gap-1 text-[10px] uppercase text-purple-300/60">
                      <Hash className="h-3 w-3" />
                      锁定指纹 (Immutable Hash)
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs text-white/60">{selected.lockedHash}</span>
                      <button type="button" onClick={() => void copyHash()} className="rounded-md p-1.5 transition-colors hover:bg-white/10" title="复制 Hash">
                        {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-white/40" />}
                      </button>
                    </div>
                    <p className="mt-2 text-[9px] leading-tight text-white/30">
                      此基因已通过区块链级加密锁定，用于裁判引擎绝对公平结算。任何试图修改底座行为将导致对局作废。
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                <h2 className="text-2xl font-black text-white">还没有可展示的分身</h2>
                <p className="mt-3 text-sm leading-7 text-white/65">先去“我的分身”同步 AIliangbiao 或上传 DNA 草稿，再回来建立你的命运星盘。</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-pink-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  User Center
                </span>
                <div>
                  <p className="text-sm uppercase tracking-[0.26em] text-white/35">用户中心</p>
                  <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">基础信息建档</h1>
                </div>
                <p className="max-w-3xl text-base leading-8 text-white/72 md:text-lg">
                  保存名字、手机号和基础资料后，后续分身生成、相亲市场与命运大厅都会基于这份档案展示你的身份信息。
                </p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white/72">大厅昵称</span>
                  <input value={form.displayName} onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28" placeholder="例如：命运保管员" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white/72">真实姓名</span>
                  <input value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28" placeholder="请输入姓名" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white/72">手机号</span>
                  <div className="flex items-center gap-2 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                    <Phone className="h-4 w-4 text-pink-300" />
                    <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/28" placeholder="请输入手机号" />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-white/72">所在城市</span>
                  <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28" placeholder="例如：上海" />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-white/72">邮箱</span>
                  <input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28" placeholder="可选" />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-white/72">个人简介</span>
                  <textarea value={form.bio} onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))} className="min-h-[160px] w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/28" placeholder="补充一点你的背景、风格或来这里想做什么..." />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" disabled={isPending} onClick={() => void saveProfile()} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(232,121,249,0.28)] transition hover:translate-y-[-1px]">
                  <UserRound className="h-4 w-4" />
                  保存用户档案
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-white/35">Clone Roster</p>
                  <h2 className="mt-2 text-2xl font-black text-white">分身切换</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/68">
                  共 {ownedPersonas.length} 个
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                {ownedPersonas.map((persona) => (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => setSelectedId(persona.id)}
                    className={`rounded-[22px] border p-4 text-left transition ${
                      persona.id === selected?.id ? "border-pink-300/30 bg-pink-400/10" : "border-white/10 bg-black/20 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{persona.dataGhost?.displayAlias || persona.name}</p>
                        <p className="mt-2 text-xs text-white/45">{persona.publicTraitTags.slice(0, 3).join(" / ")}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[0.68rem] text-white/60">
                        {getRating(persona)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {overlay ? (
                <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white">当前对外人格层</p>
                  <p className="mt-3 text-sm leading-7 text-white/68">{overlay.publicBio || overlay.resumeSummary || "尚未编写外显人格层。"}</p>
                </div>
              ) : null}
            </section>

            {status ? <div className="rounded-[22px] border border-pink-300/20 bg-pink-400/10 px-4 py-3 text-sm text-pink-50">{status}</div> : null}
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            100% {
              left: 200%;
            }
          }
        `}</style>
      </section>
    </main>
  );
}
