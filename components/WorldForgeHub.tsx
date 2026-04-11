"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookCopy, FileStack, ShieldCheck, Sparkles, UploadCloud, WandSparkles } from "lucide-react";

import type { ScratchUpload, WorldPack } from "@/lib/types";

type Props = {
  worldPacks: WorldPack[];
  uploads: ScratchUpload[];
};

export function WorldForgeHub({ worldPacks, uploads }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function submitWorld() {
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("title", title || "Untitled World");
      formData.append("text", text);
      formData.append("locale", "zh");
      const file = fileRef.current?.files?.[0];
      if (file) formData.append("file", file);

      const response = await fetch("/api/worldpacks/upload", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Upload failed");
      setStatus("世界包已经被蒸馏成安全的原创舞台。");
      setTitle("");
      setText("");
      if (fileRef.current) fileRef.current.value = "";
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    }
  }

  async function sanitizeWorld(worldId: string) {
    setStatus("");
    try {
      const response = await fetch(`/api/worldpacks/${worldId}/sanitize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: "zh" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Sanitize failed");
      setStatus("该世界包已完成新一轮护栏清洗。");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sanitize failed");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-16 pt-8 md:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.16),transparent_24%),radial-gradient(circle_at_76%_20%,rgba(34,211,238,0.12),transparent_24%),linear-gradient(135deg,rgba(12,10,30,0.82),rgba(36,36,62,0.72))]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-pink-100">
              <WandSparkles className="h-3.5 w-3.5" />
              World Forge
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-white/35">世界工坊</p>
              <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">原创宇宙蒸馏台</h1>
            </div>
            <p className="max-w-4xl text-base leading-8 text-white/72 md:text-lg">上传世界设定、片段文本或资料文件，系统会剥离注入式脏内容，只保留氛围、阵营、冲突和禁忌规则，生成可用于竞技场与相亲市场的原创世界包。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-white/35">世界包数量</p><strong className="mt-2 block text-2xl font-black text-white">{worldPacks.length}</strong></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-white/35">临时缓存</p><strong className="mt-2 block text-2xl font-black text-white">{uploads.length}</strong></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs uppercase tracking-[0.18em] text-white/35">护栏策略</p><strong className="mt-2 block text-lg font-black text-white">Atmosphere First</strong></div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-white/35">Upload Source</p>
            <h2 className="mt-2 text-2xl font-black text-white">提交设定原料</h2>
          </div>
          <div className="mt-5 grid gap-4">
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="世界名称 / World Title" className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28" />
            <input ref={fileRef} type="file" className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white" />
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="粘贴阵营、世界观、冲突、禁忌规则、气质设定..." className="min-h-[220px] w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/28" />
            <button type="button" disabled={isPending || (!text.trim() && !fileRef.current?.files?.[0])} onClick={() => void submitWorld()} className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(232,121,249,0.28)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-45">
              <UploadCloud className="h-4 w-4" />
              蒸馏世界包
            </button>
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-cyan-300" />
            <h2 className="text-2xl font-black text-white">护栏说明</h2>
          </div>
          <div className="mt-5 grid gap-4">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">原始文本只做短时缓存，长期只保留清洗后的摘要、阵营、冲突和禁忌规则。</div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">系统优先提取“氛围”而不是“原文复刻”，避免把外部作品直接搬进你的产品。</div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">每个世界包都可以再次清洗，用于后续竞技场或相亲市场的故事生成。</div>
          </div>
        </div>
      </section>

      {status ? <div className="rounded-[24px] border border-pink-300/20 bg-pink-400/10 px-5 py-4 text-sm text-pink-50">{status}</div> : null}

      <section className="space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-white/35">Forged Worlds</p>
          <h2 className="mt-2 text-2xl font-black text-white">已铸造世界包</h2>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {worldPacks.map((world) => (
            <article key={world.id} className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
              <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-white">{world.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-white/68">{world.sanitizedSummary}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/68">{world.derivedFrom}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {world.factions.map((faction) => (
                      <span key={faction} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/72">{faction}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white"><BookCopy className="h-4 w-4 text-pink-300" />冲突与规则</div>
                    <p className="mt-3 text-sm leading-7 text-white/68">{world.conflicts.join(" / ")}</p>
                    <p className="mt-3 text-sm leading-7 text-white/52">{world.tabooRules.join(" / ")}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-sm text-white/68">氛围：{world.tone}</p>
                    <p className={`mt-2 text-sm ${world.safetyStatus === "warned" ? "text-amber-100" : "text-emerald-100"}`}>安全状态：{world.safetyStatus}</p>
                  </div>
                  <button type="button" disabled={isPending} onClick={() => void sanitizeWorld(world.id)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.12]">
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                    重新清洗世界包
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <FileStack className="h-5 w-5 text-cyan-300" />
          <h2 className="text-2xl font-black text-white">24 小时临时缓存</h2>
        </div>
        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/72">
            <thead className="bg-black/20 text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">名称</th>
                <th className="px-4 py-3 font-medium">删除时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-white/[0.03]">
              {uploads.map((upload) => (
                <tr key={upload.id}>
                  <td className="px-4 py-3">{upload.kind}</td>
                  <td className="px-4 py-3">{upload.originalName}</td>
                  <td className="px-4 py-3">{new Date(upload.deleteAfter).toLocaleString()}</td>
                </tr>
              ))}
              {!uploads.length ? <tr><td className="px-4 py-6 text-white/45" colSpan={3}>当前没有缓存中的上传原料。</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
