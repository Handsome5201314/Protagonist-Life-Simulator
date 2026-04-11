import { ModelConnectivityPanel } from "@/components/ModelConnectivityPanel";
import { getLocale } from "@/lib/i18n-server";
import { pickLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const locale = await getLocale();
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  return (
    <main className="page-wrap" style={{ paddingTop: 28 }}>
      <section className="glass-panel">
        <p className="section-kicker">{t("Admin Console", "后台控制台")}</p>
        <h1 className="section-title" style={{ fontSize: "2.5rem" }}>
          {t("Model and integration diagnostics", "模型与集成诊断")}
        </h1>
        <p className="subheadline">
          {t(
            "Use this page to verify that Gemini, One-API, and future integration endpoints are actually reachable from the app runtime.",
            "这个页面用于验证 Gemini、One-API 以及未来其他集成端点是否真的可以从应用运行时访问。"
          )}
        </p>
      </section>

      <section style={{ marginTop: 24 }}>
        <ModelConnectivityPanel locale={locale} />
      </section>
    </main>
  );
}
