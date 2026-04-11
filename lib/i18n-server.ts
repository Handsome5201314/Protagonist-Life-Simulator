import { cookies, headers } from "next/headers";

import type { Locale } from "@/lib/i18n";

export async function getLocale(): Promise<Locale> {
  const headerStore = await headers();
  const rawCookie = headerStore.get("cookie") || "";
  const match = rawCookie.match(/(?:^|;\s*)locale=(zh|en)(?:;|$)/);
  if (match?.[1] === "zh") {
    return "zh";
  }
  if (match?.[1] === "en") {
    return "en";
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value;
  return locale === "zh" ? "zh" : "en";
}
