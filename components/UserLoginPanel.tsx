"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Globe2, Hash, Save, ShieldCheck, UserRound } from "lucide-react";

import { LanguageToggle } from "@/components/LanguageToggle";
import { pickLocale, type Locale } from "@/lib/i18n";
import type { PersonaOverlay, PersonaSnapshot, UserRecord } from "@/lib/types";

type Props = {
  locale: Locale;
  user: UserRecord;
  personas: PersonaSnapshot[];
  overlays: PersonaOverlay[];
};

function getOwnedPersonas(personas: PersonaSnapshot[]) {
  return personas.filter((persona) => persona.source !== "legend" && !persona.deletedAt);
}

function getSourceLabel(locale: Locale, snapshot: PersonaSnapshot) {
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  if (snapshot.source === "ailiangbiao") return t("AIliangbiao Sync", "AIliangbiao 同步");
  if (snapshot.source === "upload") return t("Upload Minted", "上传铸造");
  return t("Legend Preset", "传说预设");
}

function getImportedLabel(locale: Locale, snapshot: PersonaSnapshot, user: UserRecord) {
  const linkedAt = user.linkedAiliangbiao?.linkedAt;
  if (snapshot.source === "ailiangbiao" && linkedAt) {
    return new Date(linkedAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
  }
  return new Date(snapshot.expiresAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US");
}

export function UserLoginPanel({ locale, user, personas, overlays }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
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

  async function saveProfile() {
    setStatus("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("Failed to save profile", "保存用户资料失败"));
      setStatus(t("Profile saved.", "用户资料已保存。"));
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("Failed to save profile", "保存用户资料失败"));
    }
  }

  async function copyHash() {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.lockedHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pb-16 pt-8 md:px-6 lg:px-8">
      <section className="rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-pink-100">
              <UserRound className="h-3.5 w-3.5" />
              {t("User Center", "用户中心")}
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-white/35">{t("Profile and Locale", "资料与语言")}</p>
              <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">{t("Manage your identity and language", "管理你的身份与界面语言")}</h1>
            </div>
            <p className="max-w-3xl text-base leading-8 text-white/72 md:text-lg">
              {t(
                "Choose English or Chinese here. The selected locale is stored to your browser and reused across the hall, arena, dating market, and room interactions.",
                "你可以在这里切换中文或英文。所选语言会写入浏览器，并在大厅、竞技场、相亲市场和房内互动里统一生效。"
              )}
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Globe2 className="h-4 w-4 text-cyan-300" />
              {t("Interface Language", "界面语言")}
            </div>
            <LanguageToggle locale={locale} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          {selected ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-white">{selected.dataGhost?.displayAlias || selected.name}</h2>
                <p className="mt-2 text-sm leading-7 text-white/68">{overlay?.publicBio || selected.publicTraitTags.join(" / ")}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">{t("Source", "来源")}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{getSourceLabel(locale, selected)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">{t("Imported At", "导入时间")}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{getImportedLabel(locale, selected, user)}</div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-pink-300" />
                  {t("Behavioral Constraints", "行为约束")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[...selected.publicTraitTags, ...selected.fears].slice(0, 8).map((tag, index) => (
                    <span key={`${tag}-${index}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <Hash className="h-4 w-4 text-cyan-300" />
                  {t("Immutable Hash", "锁定指纹")}
                </div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-white/65">{selected.lockedHash}</code>
                  <button
                    type="button"
                    onClick={() => void copyHash()}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
                  >
                    {copied ? t("Copied", "已复制") : t("Copy", "复制")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm leading-7 text-white/65">
              {t(
                "No self-owned clone has been generated yet. Please import a persona first.",
                "你还没有可展示的本人分身，请先去“我的分身”里导入一个。"
              )}
            </div>
          )}
        </section>

        <section className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-white/35">{t("Profile", "用户资料")}</p>
              <h2 className="mt-2 text-2xl font-black text-white">{t("Basic information", "基础信息")}</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white/72">{t("Display Name", "大厅昵称")}</span>
                <input value={form.displayName} onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white/72">{t("Full Name", "真实姓名")}</span>
                <input value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white/72">{t("Phone", "手机号")}</span>
                <input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-white/72">{t("City", "所在城市")}</span>
                <input value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-white/72">{t("Email", "邮箱")}</span>
                <input value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} className="w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-white/72">{t("Bio", "个人简介")}</span>
                <textarea value={form.bio} onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))} className="min-h-[140px] w-full rounded-[20px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-white/28" />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => void saveProfile()}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(232,121,249,0.28)] transition hover:translate-y-[-1px]"
              >
                <Save className="h-4 w-4" />
                {t("Save Profile", "保存资料")}
              </button>
            </div>

            {status ? (
              <div className="rounded-[22px] border border-pink-300/20 bg-pink-400/10 px-4 py-3 text-sm text-pink-50">
                {status}
              </div>
            ) : null}

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="mb-3 text-sm font-semibold text-white">{t("My Clones", "我的分身")}</div>
              <div className="grid gap-3">
                {ownedPersonas.map((persona) => (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => setSelectedId(persona.id)}
                    className={`rounded-[20px] border p-4 text-left transition ${
                      persona.id === selected?.id ? "border-pink-300/30 bg-pink-400/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{persona.dataGhost?.displayAlias || persona.name}</div>
                        <div className="mt-2 text-xs text-white/45">{persona.publicTraitTags.slice(0, 3).join(" / ")}</div>
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[0.68rem] text-white/55">
                        {persona.source}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
