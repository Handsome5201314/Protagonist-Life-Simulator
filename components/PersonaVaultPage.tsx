"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap, Dna, Fingerprint, LockKeyhole, ShieldCheck, Sparkles, Upload, UserRound } from "lucide-react";

import type { MemoryTrait, PersonaOverlay, PersonaSnapshot, UserRecord, WorldPack } from "@/lib/types";

type Props = {
  user: UserRecord;
  personas: PersonaSnapshot[];
  overlays: PersonaOverlay[];
  memoryTraits: MemoryTrait[];
  worldPacks: WorldPack[];
};

type OverlayDraft = {
  id?: string;
  personaId: string;
  resumeSummary: string;
  publicBio: string;
  datingPreferences: string[];
  visualSkin: string;
  tonePreset: string;
  privacyLevel: "public" | "private";
  updatedAt?: string;
};

export function PersonaVaultPage({ user, personas, overlays, memoryTraits, worldPacks }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const [importForm, setImportForm] = useState({
    name: "",
    rawText: "",
    ageBand: "adult",
    relation: "SELF",
  });
  const [overlayDrafts, setOverlayDrafts] = useState<Record<string, OverlayDraft>>(
    Object.fromEntries(
      personas.map((persona) => {
        const overlay = overlays.find((item) => item.personaId === persona.id);
        return [
          persona.id,
          {
            id: overlay?.id,
            personaId: persona.id,
            resumeSummary: overlay?.resumeSummary || "",
            publicBio: overlay?.publicBio || "",
            datingPreferences: overlay?.datingPreferences || [],
            visualSkin: overlay?.visualSkin || "fortune-ink",
            tonePreset: overlay?.tonePreset || "measured-poetic",
            privacyLevel: overlay?.privacyLevel || "public",
            updatedAt: overlay?.updatedAt,
          } satisfies OverlayDraft,
        ];
      })
    )
  );

  const userOwned = useMemo(() => personas.filter((persona) => persona.source !== "legend" && !persona.deletedAt), [personas]);
  const linked = user.linkedAiliangbiao?.status === "linked";

  async function postJson(url: string, body: object, successText: string) {
    setStatus("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Request failed");
      setStatus(successText);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Request failed");
    }
  }

  async function syncAiliangbiao() {
    setStatus("");
    try {
      const response = await fetch("/api/bind/ailiangbiao/complete", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Sync failed");
      setStatus(`AIliangbiao 分身 DNA 已同步，新增 ${payload.imported?.length ?? 0} 个分身。`);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sync failed");
    }
  }

  async function submitImport() {
    await postJson(
      "/api/personas/import",
      {
        source: "upload",
        name: importForm.name,
        rawText: importForm.rawText,
        ageBand: importForm.ageBand,
        relation: importForm.relation,
        interests: ["DNA 草稿", "人格镜像", "剧情试投"],
        fears: ["被削成模板", "关键细节丢失"],
      },
      "新的分身 DNA 已写入分身库。"
    );
    setImportForm({ name: "", rawText: "", ageBand: "adult", relation: "SELF" });
  }

  async function saveOverlay(personaId: string) {
    const draft = overlayDrafts[personaId];
    await postJson(`/api/personas/${personaId}/overlay`, draft, "分身外显人格层已更新。");
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-16 pt-8 md:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.18),transparent_24%),radial-gradient(circle_at_78%_22%,rgba(34,211,238,0.12),transparent_24%),linear-gradient(135deg,rgba(12,10,30,0.8),rgba(36,36,62,0.72))]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-pink-100">
              <Dna className="h-3.5 w-3.5" />
              Persona DNA Vault
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-white/35">我的分身</p>
              <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">分身 DNA 管理台</h1>
            </div>
            <p className="max-w-4xl text-base leading-8 text-white/72 md:text-lg">
              这里负责统一管理你自己的数字分身、AIliangbiao 同步档案、上传式 DNA 草稿，以及用于相亲市场和竞技场的对外人格层。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">已收录分身</p>
              <strong className="mt-2 block text-2xl font-black text-white">{userOwned.length}</strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">AIliangbiao</p>
              <strong className="mt-2 block text-lg font-black text-white">{linked ? "已连接" : "未连接"}</strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">剧本挂接</p>
              <strong className="mt-2 block text-2xl font-black text-white">{worldPacks.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/35">AIliangbiao DNA</p>
              <h2 className="mt-2 text-2xl font-black text-white">同步与管理</h2>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs ${linked ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-white/5 text-white/65"}`}>
              {linked ? "已连接" : "未连接"}
            </span>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/68">
            一键拉取 AIliangbiao 原型分身 DNA，并自动去重写入本地分身库。同步后的分身会保留来源标签，可继续补充对外人格层。
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={isPending} onClick={() => void syncAiliangbiao()} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(232,121,249,0.28)] transition hover:translate-y-[-1px]">
              <DatabaseZap className="h-4 w-4" />
              同步 AIliangbiao 分身 DNA
            </button>
            <a href="/api/auth/agentpit/login" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-5 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.08]">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              AgentPit 授权登录
            </a>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/35">上传 DNA 草稿</p>
            <h2 className="mt-2 text-2xl font-black text-white">手动铸造分身</h2>
          </div>
          <div className="mt-5 grid gap-4">
            <input value={importForm.name} onChange={(event) => setImportForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="分身名字 / Hero Alias" className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28" />
            <div className="grid gap-4 md:grid-cols-2">
              <select value={importForm.ageBand} onChange={(event) => setImportForm((prev) => ({ ...prev, ageBand: event.target.value }))} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none">
                <option value="adult">成人</option>
                <option value="teen">青少年</option>
                <option value="child">儿童</option>
              </select>
              <select value={importForm.relation} onChange={(event) => setImportForm((prev) => ({ ...prev, relation: event.target.value }))} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none">
                <option value="SELF">本人</option>
                <option value="OTHER">其他</option>
              </select>
            </div>
            <textarea value={importForm.rawText} onChange={(event) => setImportForm((prev) => ({ ...prev, rawText: event.target.value }))} placeholder="粘贴简历、人格描述、访谈记录或你整理好的 DNA 文本..." className="min-h-[180px] w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/28" />
            <button type="button" disabled={isPending} onClick={() => void submitImport()} className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.12]">
              <Upload className="h-4 w-4 text-pink-300" />
              上传并铸造分身 DNA
            </button>
          </div>
        </div>
      </section>

      {status ? <div className="rounded-[24px] border border-pink-300/20 bg-pink-400/10 px-5 py-4 text-sm text-pink-50">{status}</div> : null}

      <section className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-white/35">DNA Gallery</p>
          <h2 className="mt-2 text-2xl font-black text-white">分身库</h2>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {userOwned.map((persona) => {
            const draft = overlayDrafts[persona.id];
            const memories = memoryTraits.filter((item) => item.personaId === persona.id);

            return (
              <article key={persona.id} className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 text-lg font-black text-white">
                          {persona.name.slice(0, 1)}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white">{persona.name}</h3>
                          <p className="mt-1 text-sm text-white/45">{persona.source.toUpperCase()} · {persona.relation} · {persona.ageBand}</p>
                        </div>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${persona.adultOnlyEligible ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-amber-300/25 bg-amber-400/10 text-amber-100"}`}>
                        {persona.adultOnlyEligible ? "可公开出战" : "仅私密使用"}
                      </span>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/72">
                      <div className="flex items-center gap-2 text-white/55">
                        <Fingerprint className="h-4 w-4 text-pink-300" />
                        Locked DNA Hash
                      </div>
                      <p className="mt-2 break-all text-xs text-white/45">{persona.lockedHash}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {persona.publicTraitTags.map((tag) => (
                        <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/72">{tag}</span>
                      ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/35">兴趣</p>
                        <p className="mt-2 text-sm leading-7 text-white/72">{persona.interests.join(" / ") || "暂无"}</p>
                      </div>
                      <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/35">顾虑</p>
                        <p className="mt-2 text-sm leading-7 text-white/72">{persona.fears.join(" / ") || "暂无"}</p>
                      </div>
                    </div>

                    {memories.length ? (
                      <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          <ShieldCheck className="h-4 w-4 text-cyan-300" />
                          记忆碎片
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {memories.map((memory) => (
                            <span key={memory.id} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/68">
                              {memory.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/72">对外简历层</label>
                      <textarea value={draft.resumeSummary} onChange={(event) => setOverlayDrafts((prev) => ({ ...prev, [persona.id]: { ...prev[persona.id], resumeSummary: event.target.value } }))} className="min-h-[120px] w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/28" placeholder="写给市场和剧本系统看的履历摘要..." />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/72">公开人物传记</label>
                      <textarea value={draft.publicBio} onChange={(event) => setOverlayDrafts((prev) => ({ ...prev, [persona.id]: { ...prev[persona.id], publicBio: event.target.value } }))} className="min-h-[120px] w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/28" placeholder="写给相亲市场与围观大厅看的对外版本..." />
                    </div>
                    <button type="button" disabled={isPending} onClick={() => void saveOverlay(persona.id)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.12]">
                      <LockKeyhole className="h-4 w-4 text-pink-300" />
                      保存外显人格层
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!userOwned.length ? (
          <div className="rounded-[28px] border border-dashed border-white/12 bg-white/5 p-10 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-black/20 text-white/55">
              <UserRound className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">分身库还是空的</h3>
            <p className="mt-3 text-sm leading-7 text-white/55">先同步 AIliangbiao，或者上传一段 DNA 草稿，系统就会为你铸造第一位分身。</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
