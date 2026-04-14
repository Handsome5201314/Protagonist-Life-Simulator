import { AdminInsightsPanel } from "@/components/AdminInsightsPanel";
import { ModelConnectivityPanel } from "@/components/ModelConnectivityPanel";
import { getAdminInsights } from "@/lib/app-service";
import { pickLocale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const locale = await getLocale();
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  const { summary, insight, config, proposals, history } = await getAdminInsights({
    locale,
    windowHours: 168,
  });

  return (
    <main className="page-wrap" style={{ paddingTop: 28 }}>
      <section className="glass-panel">
        <p className="section-kicker">{t("Admin Console", "后台控制台")}</p>
        <h1 className="section-title" style={{ fontSize: "2.5rem" }}>
          {t("Operator diagnostics and gameplay telemetry", "运营诊断与玩法遥测")}
        </h1>
        <p className="subheadline">
          {t(
            "Use this page to inspect runtime connectivity, room telemetry, and the current recommendations coming from the director layer.",
            "这里既能检查模型与网关连通性，也能查看真实房间 usage summary、director 洞察，以及可直接应用的玩法调参补丁。"
          )}
        </p>
        <div className="actions" style={{ marginTop: 16 }}>
          <a className="btn-secondary" href="/super-admin">
            {t("Open Super Admin Console", "打开超级管理员后台")}
          </a>
        </div>
      </section>

      <AdminInsightsPanel
        locale={locale}
        initialSummary={summary}
        initialInsight={insight}
        initialConfig={config}
        initialProposals={proposals}
        initialHistory={history}
      />

      <section style={{ marginTop: 24 }}>
        <ModelConnectivityPanel locale={locale} />
      </section>
    </main>
  );
}
