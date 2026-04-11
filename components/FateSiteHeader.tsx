"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, Gem, Menu, Orbit, Sparkles, X } from "lucide-react";
import { useState } from "react";

import type { UserRecord } from "@/lib/types";

type Props = {
  user: UserRecord;
};

const navItems = [
  { href: "/", label: "命运大厅" },
  { href: "/dating", label: "相亲市场" },
  { href: "/personas", label: "我的分身" },
  { href: "/arena", label: "战局放映厅" },
  { href: "/login", label: "用户中心" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function FateSiteHeader({ user }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isLinked = user.linkedAiliangbiao?.status === "linked";
  const avatarLetter = user.displayName.slice(0, 1).toUpperCase() || "命";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f0c29]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-white/15 bg-white/10 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/60 via-purple-500/50 to-cyan-500/50 blur-md" />
            <Orbit className="relative h-5 w-5 text-white" />
          </div>

          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.36em] text-white/40">Destiny Arena Nexus</p>
            <Link href="/" className="block truncate bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300 bg-clip-text text-lg font-black text-transparent">
              人生无常命运大厅
            </Link>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-1.5 py-1.5 text-sm text-white/55 backdrop-blur-sm lg:flex">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 transition-all duration-200 ${active ? "bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.06)]" : "hover:bg-white/8 hover:text-white"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {isLinked ? (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/75 backdrop-blur-sm xl:flex">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/65"><Sparkles className="h-3.5 w-3.5 text-pink-300" />声望 {user.wallet.renown}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/65"><Coins className="h-3.5 w-3.5 text-fuchsia-300" />钻石 {user.wallet.diamonds}</span>
              </div>
              <Link href="/login" className="inline-flex items-center gap-2.5 rounded-full border border-white/8 bg-white/[0.03] px-2 py-2 backdrop-blur-sm transition hover:bg-white/8">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 text-sm font-black text-white">{avatarLetter}</div>
                <div className="hidden pr-2 text-left xl:block">
                  <p className="text-sm font-semibold text-white">{user.displayName}</p>
                  <p className="text-[0.68rem] text-white/40">{user.profile?.fullName || "命运同步中"}</p>
                </div>
              </Link>
            </div>
          ) : (
            <Link href="/api/auth/agentpit/login" className="hidden items-center gap-2 rounded-full border border-purple-300/30 bg-gradient-to-r from-purple-500/90 to-fuchsia-500/90 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(192,132,252,0.3)] transition hover:translate-y-[-1px] hover:shadow-[0_0_32px_rgba(192,132,252,0.4)] sm:inline-flex">
              <Gem className="h-4 w-4" />
              AgentPit 授权登录
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 lg:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="border-t border-white/8 bg-[#0f0c29]/90 px-4 py-4 backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-2xl border px-4 py-3 text-sm transition ${active ? "border-white/15 bg-white/10 text-white" : "border-white/8 bg-white/[0.03] text-white/65"}`}
                >
                  {item.label}
                </Link>
              );
            })}
            {!isLinked ? (
              <Link href="/api/auth/agentpit/login" onClick={() => setOpen(false)} className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(192,132,252,0.3)]">
                <Gem className="h-4 w-4" />
                AgentPit 授权登录
              </Link>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="mt-2 inline-flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/75">
                <span>{user.displayName}</span>
                <span className="text-white/40">声望 {user.wallet.renown} / 钻石 {user.wallet.diamonds}</span>
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
