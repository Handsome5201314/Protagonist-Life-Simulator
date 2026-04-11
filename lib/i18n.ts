export type Locale = "en" | "zh";

export function pickLocale<T>(locale: Locale, en: T, zh: T): T {
  return locale === "zh" ? zh : en;
}
