"use client";

import { X, Dna, Fingerprint, ShieldCheck, Sparkles } from "lucide-react";

import type { MemoryTrait, PersonaOverlay, PersonaSnapshot } from "@/lib/types";

type Props = {
  open: boolean;
  persona: PersonaSnapshot | null;
  overlay?: PersonaOverlay | null;
  memories?: MemoryTrait[];
  onClose: () => void;
};

const traitMeta: Record<string, { label: string; color: string; glow: string }> = {
  charm: { label: "魅力", color: "from-pink-400 to-rose-500", glow: "rgba(244,114,182,0.22)" },
  resilience: { label: "韧性", color: "from-amber-400 to-orange-500", glow: "rgba(251,191,36,0.22)" },
  focus: { label: "专注", color: "from-cyan-400 to-blue-500", glow: "rgba(34,211,238,0.22)" },
  empathy: { label: "共情", color: "from-violet-400 to-purple-500", glow: "rgba(168,85,247,0.22)" },
  strategy: { label: "谋略", color: "from-indigo-400 to-violet-500", glow: "rgba(129,140,248,0.22)" },
  chaos: { label: "混沌", color: "from-fuchsia-400 to-pink-500", glow: "rgba(217,70,239,0.22)" },
  courage: { label: "勇气", color: "from-emerald-400 to-teal-500", glow: "rgba(52,211,153,0.22)" },
};

export function PersonaQuickDrawer({ open, persona, overlay, memories = [], onClose }: Props) {
  if (!persona) return null;

  const topTraits = Object.entries(persona.traitVector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        className={`fixed right-0 top-0 z-[90] flex h-full w-full max-w-[440px] flex-col overflow-y-auto border-l border-white/10 bg-gradient-to-b from-[#0f0c29]/98 via-[#1a1540]/98 to-[#24243e]/98 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/30 px-6 py-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500">
              <Dna className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/45">Persona Snapshot</p>
              <h2 className="text-lg font-black text-white">分身 DNA 速览</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-6 p-6">
          {/* Avatar + Name */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 text-3xl font-black text-white shadow-[0_0_36px_rgba(168,85,247,0.3)]">
                {persona.name.slice(0, 1)}
              </div>
              {persona.relation === "SELF" && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-[0.6rem] text-white">
                  S
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-black text-white">{persona.name}</h3>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="rounded-full border border-purple-300/25 bg-purple-400/10 px-2.5 py-0.5 text-[0.68rem] font-medium text-purple-100">
                  {persona.source.toUpperCase()}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[0.68rem] font-medium text-white/60">
                  {persona.ageBand}
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[0.68rem] font-medium ${persona.adultOnlyEligible ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-amber-300/25 bg-amber-400/10 text-amber-100"}`}>
                  {persona.adultOnlyEligible ? "可公开" : "私密"}
                </span>
              </div>
            </div>
          </div>

          {/* Trait Radar Bars */}
          <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white/75">
              <Sparkles className="h-4 w-4 text-pink-300" />
              DNA 五维属性
            </div>
            <div className="space-y-3">
              {topTraits.map(([key, value]) => {
                const meta = traitMeta[key];
                if (!meta) return null;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/70">{meta.label}</span>
                      <span className="text-xs font-bold text-white/90">{value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${meta.color}`}
                        style={{ width: `${Math.min(value, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Public Trait Tags */}
          {persona.publicTraitTags.length > 0 && (
            <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/75">
                <Fingerprint className="h-4 w-4 text-cyan-300" />
                特征标签
              </div>
              <div className="flex flex-wrap gap-2">
                {persona.publicTraitTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interests / Fears */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
              <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/45">兴趣</p>
              <p className="text-sm leading-7 text-white/72">{persona.interests.join(" / ") || "—"}</p>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
              <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/45">顾虑</p>
              <p className="text-sm leading-7 text-white/72">{persona.fears.join(" / ") || "—"}</p>
            </div>
          </div>

          {/* Communication Style + Career */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
              <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/45">沟通风格</p>
              <p className="text-sm leading-7 text-white/72">{persona.communicationStyle || "—"}</p>
            </div>
            <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
              <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/45">职业倾向</p>
              <p className="text-sm leading-7 text-white/72">{persona.careerTilt || "—"}</p>
            </div>
          </div>

          {/* Overlay (resume / bio) */}
          {overlay && (
            <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/75">
                <ShieldCheck className="h-4 w-4 text-purple-300" />
                对外人格层
              </div>
              {overlay.resumeSummary && (
                <div className="mb-3">
                  <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/45">简历摘要</p>
                  <p className="text-sm leading-7 text-white/72">{overlay.resumeSummary}</p>
                </div>
              )}
              {overlay.publicBio && (
                <div>
                  <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/45">公开传记</p>
                  <p className="text-sm leading-7 text-white/72">{overlay.publicBio}</p>
                </div>
              )}
            </div>
          )}

          {/* Memory Traits */}
          {memories.length > 0 && (
            <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/75">
                <Sparkles className="h-4 w-4 text-amber-300" />
                记忆碎片
              </div>
              <div className="flex flex-wrap gap-2">
                {memories.map((mem) => (
                  <span
                    key={mem.id}
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      mem.rarity === "legendary"
                        ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
                        : mem.rarity === "rare"
                          ? "border-purple-300/30 bg-purple-400/10 text-purple-100"
                          : "border-white/10 bg-white/5 text-white/65"
                    }`}
                  >
                    {mem.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Locked DNA Hash */}
          <div className="rounded-[26px] border border-purple-300/20 bg-black/25 p-4">
            <div className="mb-2 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-purple-200/60">
              <Fingerprint className="h-3.5 w-3.5" />
              Locked DNA Hash
            </div>
            <p className="break-all font-mono text-[0.7rem] leading-5 text-white/40">{persona.lockedHash}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
