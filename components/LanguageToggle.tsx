"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import type { Locale } from "@/lib/i18n";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: Locale) {
    document.cookie = `locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="pill-row">
      <button
        className={locale === "en" ? "btn-ghost" : "nav-link"}
        disabled={isPending}
        onClick={() => switchLocale("en")}
        type="button"
      >
        EN
      </button>
      <button
        className={locale === "zh" ? "btn-ghost" : "nav-link"}
        disabled={isPending}
        onClick={() => switchLocale("zh")}
        type="button"
      >
        中文
      </button>
    </div>
  );
}
