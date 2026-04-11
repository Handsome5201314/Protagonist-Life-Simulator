import Link from "next/link";
import { Coins, Gem, Orbit, Sparkles } from "lucide-react";

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

export function FateSiteHeader({ user }: Props) {
  const isLinked = user.linkedAiliangbiao?.status === "linked";
  const avatarLetter = user.displayName.slice(0, 1).toUpperCase() || "命";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-400/70 via-purple-400/60 to-cyan-400/60 blur-md" />
            <Orbit className="relative h-5 w-5 text-white" />
          </div>

          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-white/45">
              Destiny Arena Nexus
            </p>
            <Link
              href="/"
              className="block truncate bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-xl font-black text-transparent"
            >
              人生无常命运大厅
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-2 text-sm text-white/60 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {isLinked ? (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 shadow-2xl sm:flex">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-white/70">
                  <Sparkles className="h-4 w-4 text-pink-300" />
                  声望 {user.wallet.renown}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-white/70">
                  <Coins className="h-4 w-4 text-fuchsia-300" />
                  钻石 {user.wallet.diamonds}
                </span>
              </div>

              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-2 shadow-2xl">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 text-sm font-black text-white">
                  {avatarLetter}
                </div>
                <div className="hidden pr-2 text-left sm:block">
                  <p className="text-sm font-semibold text-white">{user.displayName}</p>
                  <p className="text-xs text-white/45">{user.profile?.fullName || "命运同步中"}</p>
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/api/auth/agentpit/login"
              className="inline-flex items-center gap-2 rounded-full border border-purple-300/30 bg-gradient-to-r from-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(192,132,252,0.35)] transition hover:translate-y-[-1px]"
            >
              <Gem className="h-4 w-4" />
              AgentPit 授权登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
