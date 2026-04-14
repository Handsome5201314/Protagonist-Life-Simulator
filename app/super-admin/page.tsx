import { SuperAdminConsole } from "@/components/SuperAdminConsole";
import { pickLocale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { getSuperAdminSession, isSuperAdminConfigured } from "@/lib/super-admin-auth";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const locale = await getLocale();
  const authenticated = await getSuperAdminSession();
  const configured = isSuperAdminConfigured();
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  return (
    <>
      <div className="page-wrap" style={{ paddingTop: 28, paddingBottom: 0 }}>
        <section className="glass-panel">
          <p className="section-kicker">{t("Private Entry", "私有入口")}</p>
          <h1 className="section-title" style={{ fontSize: "2.3rem" }}>
            {t("Super Admin Backend", "超级管理员后台")}
          </h1>
          <p className="subheadline">
            {t(
              "Protected console for talking to OpenClaw directly about project architecture, prompts, debugging, and change plans.",
              "这是一个受保护的后台入口，用于直接和 OpenClaw 讨论项目架构、Prompt、排障和改造方案。"
            )}
          </p>
        </section>
      </div>

      <SuperAdminConsole locale={locale} authenticated={authenticated} configured={configured} />
    </>
  );
}
