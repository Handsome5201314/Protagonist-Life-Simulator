import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { FateSiteHeader } from "@/components/FateSiteHeader";
import { getDb } from "@/lib/db";
import { getLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: "图灵命运大厅 | Turing Destiny Arena",
  description:
    "基于真实心理学量表驱动的多智能体社交博弈与动态叙事平台，连接命运大厅、相亲市场、人格注入与观战生态。",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const db = await getDb();
  const user = db.users[0];
  const locale = await getLocale();

  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"}>
      <body className="min-h-screen bg-[#0f0c29] text-white antialiased [font-family:'Space_Grotesk','Manrope','PingFang_SC','Microsoft_YaHei',sans-serif]">
        <div className="relative min-h-screen overflow-x-hidden bg-[#0f0c29]">
          <div className="pointer-events-none fixed inset-0 -z-20 bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />
          <div className="pointer-events-none fixed left-[-8%] top-[-12%] -z-10 h-[36rem] w-[36rem] rounded-full bg-fuchsia-500/15 blur-[160px]" />
          <div className="pointer-events-none fixed bottom-[-18%] right-[-6%] -z-10 h-[30rem] w-[30rem] rounded-full bg-cyan-500/8 blur-[160px]" />
          <div className="pointer-events-none fixed left-[30%] top-[20%] -z-10 h-[24rem] w-[24rem] rounded-full bg-purple-600/6 blur-[140px]" />

          <FateSiteHeader user={user} locale={locale} />
          <div className="relative z-10">{children}</div>
        </div>
      </body>
    </html>
  );
}
