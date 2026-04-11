import Link from "next/link";

import { pickLocale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

type FlowStep = {
  title: { en: string; zh: string };
  route: string;
  actions: Array<{ label: { en: string; zh: string }; target: string }>;
  apis: string[];
  dataChanges: { en: string; zh: string };
  userSees: { en: string; zh: string };
  status: "complete" | "mvp";
};

const architectureSections = [
  {
    title: { en: "Page Layer", zh: "页面层" },
    items: [
      "`/` home market and user center",
      "`/personas` persona vault",
      "`/arena` arena console",
      "`/arena/[matchId]` room detail",
      "`/dating` dating rehearsal",
      "`/worlds` world forge",
      "`/admin` model diagnostics",
    ],
  },
  {
    title: { en: "Service Layer", zh: "服务层" },
    items: [
      "`lib/app-service.ts` orchestrates persona, world, match, support, rehearsal, privacy flows",
      "`lib/view-models.ts` aggregates page data from the local store",
      "`lib/db.ts` reads and writes `data/app-db.json`",
    ],
  },
  {
    title: { en: "Engine + AI Layer", zh: "引擎与 AI 层" },
    items: [
      "`lib/game-engine.ts` decides scores, eliminations, winners, rewards",
      "`lib/guardrails.ts` strips risky world instructions before generation",
      "`lib/dating.ts` provides rule-based rehearsal fallback",
      "`lib/llm-features.ts` lets Gemini rewrite worlds, dating scripts, and chapter prose",
      "`lib/one-api-gemini.ts` is the One-API / Gemini proxy wrapper",
    ],
  },
];

const flowSteps: FlowStep[] = [
  {
    title: { en: "Enter Home", zh: "进入首页" },
    route: "/",
    actions: [
      { label: { en: "Generate A Protagonist", zh: "生成我的主角" }, target: "/personas" },
      { label: { en: "Watch The Arena", zh: "围观竞技场" }, target: "#arena" },
      { label: { en: "Open Tarot Date Desk", zh: "打开相亲塔罗桌" }, target: "/dating" },
      { label: { en: "Link AIliangbiao Prototype", zh: "绑定 AIliangbiao 原型数据" }, target: "bind panel" },
    ],
    apis: ["POST /api/bind/ailiangbiao/complete"],
    dataChanges: {
      en: "May mint new PersonaSnapshots from partner/prototype data and refresh the local user state.",
      zh: "可能从 partner 或 prototype 数据铸造新的 PersonaSnapshot，并刷新本地用户状态。",
    },
    userSees: {
      en: "Hero section, season snapshot, user center, home arena lobby, active entities.",
      zh: "看到首屏 Hero、赛季快照、用户中心、首页竞技大厅和活跃分身。",
    },
    status: "complete",
  },
  {
    title: { en: "Mint Persona", zh: "铸造主角" },
    route: "/personas",
    actions: [
      { label: { en: "Mint Upload Snapshot", zh: "铸造上传快照" }, target: "local upload persona" },
      { label: { en: "Save Overlay", zh: "保存外层画像" }, target: "overlay update" },
    ],
    apis: ["POST /api/personas/import", "POST /api/personas/[id]/overlay"],
    dataChanges: {
      en: "Creates PersonaSnapshot or updates PersonaOverlay. The locked snapshot remains immutable.",
      zh: "创建 PersonaSnapshot 或更新 PersonaOverlay，底层锁定快照保持不可变。",
    },
    userSees: {
      en: "A new clone appears in the vault and becomes available to the home user center and the lobby.",
      zh: "新的分身会出现在主角库，并同步进入首页用户中心和大厅可选名单。",
    },
    status: "complete",
  },
  {
    title: { en: "Forge World", zh: "提炼世界包" },
    route: "/worlds",
    actions: [
      { label: { en: "Distill World Pack", zh: "提炼世界包" }, target: "upload and generate" },
      { label: { en: "Re-sanitize", zh: "重新清洗" }, target: "refresh a saved world pack" },
    ],
    apis: ["POST /api/worldpacks/upload", "POST /api/worldpacks/[id]/sanitize"],
    dataChanges: {
      en: "Stores a short-lived scratch upload, guardrails the text, then optionally lets Gemini rewrite summary/factions/conflicts/taboos.",
      zh: "先保存短时缓存上传内容，再做护栏清洗，最后可选交给 Gemini 重写摘要、阵营、冲突和禁忌。",
    },
    userSees: {
      en: "World cards with tone, conflict, taboo rules, safety status, and refreshed summaries.",
      zh: "看到带氛围、冲突、禁忌规则、安全状态和新摘要的世界包卡片。",
    },
    status: "complete",
  },
  {
    title: { en: "Inject Clone Into Lobby Room", zh: "把分身送进大厅房间" },
    route: "/#arena",
    actions: [
      { label: { en: "Inject Clone", zh: "注入分身" }, target: "open clone modal" },
      { label: { en: "Watch Now / Open Replay", zh: "立即围观 / 打开回放" }, target: "/arena/[matchId]" },
    ],
    apis: ["POST /api/matches", "POST /api/matches/[matchId]/join"],
    dataChanges: {
      en: "Creates a new match for preview rooms or joins an existing recruiting room.",
      zh: "对预览房间会创建新对局，对已存在的招募房间会加入已有房间。",
    },
    userSees: {
      en: "A clone selection modal, then automatic navigation into a specific room.",
      zh: "先看到分身选择弹窗，确认后会自动进入具体房间。",
    },
    status: "complete",
  },
  {
    title: { en: "Watch or Drive A Room", zh: "围观或推进房间" },
    route: "/arena/[matchId]",
    actions: [
      { label: { en: "Support", zh: "支持角色" }, target: "support ledger" },
      { label: { en: "Equip Skill", zh: "装配技能" }, target: "round prep" },
      { label: { en: "Trigger", zh: "触发回合" }, target: "stream chapter" },
    ],
    apis: [
      "POST /api/matches/[matchId]/support",
      "POST /api/matches/[matchId]/rounds/[round]/equip-skill",
      "POST /api/matches/[matchId]/rounds/[round]/trigger",
      "GET /api/streams/[streamId]",
    ],
    dataChanges: {
      en: "Rules decide score changes, eliminations, rewards, and memory traits. Gemini only rewrites the final chapter prose.",
      zh: "规则引擎决定分数、淘汰、奖励和记忆碎片，Gemini 只负责把固定结果写成章节。",
    },
    userSees: {
      en: "Room details, participants, support records, and SSE typewriter chapter flow.",
      zh: "看到房间详情、参与分身、支持记录，以及 SSE 打字机式章节流。",
    },
    status: "complete",
  },
  {
    title: { en: "Run Dating Rehearsal", zh: "执行相亲排练" },
    route: "/dating",
    actions: [
      { label: { en: "Distill Dating Dossier", zh: "提炼相亲档案" }, target: "resume to dossier" },
      { label: { en: "Run Tarot Rehearsal", zh: "开始塔罗排练" }, target: "analysis and script" },
    ],
    apis: ["POST /api/dating/dossiers", "POST /api/dating/rehearsals"],
    dataChanges: {
      en: "Creates a DatingDossier from resume text, then combines rule-based advice with Gemini-enhanced rehearsal output.",
      zh: "先根据简历文本生成 DatingDossier，再把规则建议和 Gemini 强化后的排练输出合并返回。",
    },
    userSees: {
      en: "Mode selection, analysis hints, risk reminders, and a short conversation script.",
      zh: "看到模式选择、分析建议、风险提醒和短对话脚本。",
    },
    status: "complete",
  },
  {
    title: { en: "Test Model Connectivity", zh: "测试模型连通性" },
    route: "/admin",
    actions: [
      { label: { en: "Test Connectivity", zh: "测试模型连通性" }, target: "runtime check" },
    ],
    apis: ["POST /api/llm/health"],
    dataChanges: {
      en: "No gameplay data changes. Runs a live One-API probe and returns configuration and latency diagnostics.",
      zh: "不改动游戏数据，只发起一次真实 One-API 探测并返回配置与时延诊断结果。",
    },
    userSees: {
      en: "Configured status, reachability, base URL, key preview, model names, latency, preview text, and errors.",
      zh: "看到已配置状态、连通性、网关地址、密钥预览、模型名、时延、预览文本和错误信息。",
    },
    status: "complete",
  },
];

const boundaryRows = [
  {
    label: { en: "Rule Engine", zh: "规则引擎" },
    detail: {
      en: "Fairness-critical state: eligibility, scores, eliminations, reward settlement, memory trait generation.",
      zh: "负责公平性相关状态：资格判断、分数、淘汰、奖励结算、记忆碎片生成。",
    },
  },
  {
    label: { en: "Gemini", zh: "Gemini" },
    detail: {
      en: "Narrative enhancement only: world summaries, dating rehearsal prose, and chapter dramatization after results are fixed.",
      zh: "只负责叙事增强：世界包摘要、相亲排练文案、以及在结果固定后的章节润色。",
    },
  },
];

function badge(locale: "en" | "zh", status: "complete" | "mvp") {
  if (status === "complete") {
    return locale === "zh" ? "已打通" : "Live";
  }
  return locale === "zh" ? "MVP" : "MVP";
}

export default async function GuidePage() {
  const locale = await getLocale();
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  return (
    <main className="page-wrap" style={{ paddingTop: 28 }}>
      <section className="glass-panel">
        <p className="section-kicker">{t("User Map", "用户操作地图")}</p>
        <h1 className="section-title" style={{ fontSize: "2.6rem" }}>
          {t(
            "Page -> button -> API -> state change -> visible result",
            "页面 -> 按钮 -> 接口 -> 数据变化 -> 用户可见结果"
          )}
        </h1>
        <p className="subheadline">
          {t(
            "This page documents the current real implementation, not the ideal future design. It is intended for both product review and developer handoff.",
            "这个页面记录的是当前真实实现，而不是理想中的未来方案。它既可以给产品看，也可以直接给开发接手。"
          )}
        </p>
        <div className="actions">
          <Link className="btn" href="/">
            {t("Back Home", "返回首页")}
          </Link>
          <Link className="btn-secondary" href="/admin">
            {t("Open Admin Diagnostics", "打开后台诊断")}
          </Link>
        </div>
      </section>

      <section className="glass-panel" style={{ marginTop: 24 }}>
        <p className="section-kicker">{t("Architecture", "当前架构")}</p>
        <div className="three-col">
          {architectureSections.map((section) => (
            <div key={section.title.en} className="card">
              <h2 className="section-title" style={{ fontSize: "1.4rem" }}>
                {t(section.title.en, section.title.zh)}
              </h2>
              <div className="stack small">
                {section.items.map((item) => (
                  <div key={item}>
                    <code>{item}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel" style={{ marginTop: 24 }}>
        <p className="section-kicker">{t("Operation Flow", "操作流程")}</p>
        <div className="grid-list">
          {flowSteps.map((step, index) => (
            <div key={step.route} className="card">
              <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{index + 1}. {t(step.title.en, step.title.zh)}</strong>
                  <div className="small muted">
                    <code>{step.route}</code>
                  </div>
                </div>
                <span className="pill">{badge(locale, step.status)}</span>
              </div>

              <div className="divider" />

              <div className="stack small">
                <div>
                  <strong>{t("Buttons / actions", "按钮 / 动作")}</strong>
                  <div className="stack" style={{ marginTop: 8 }}>
                    {step.actions.map((action) => (
                      <div key={action.target}>
                        {t(action.label.en, action.label.zh)} {"->"} <code>{action.target}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <strong>{t("APIs", "接口")}</strong>
                  <div className="stack" style={{ marginTop: 8 }}>
                    {step.apis.map((api) => (
                      <div key={api}><code>{api}</code></div>
                    ))}
                  </div>
                </div>

                <div>
                  <strong>{t("Data changes", "数据变化")}</strong>
                  <p className="muted">{t(step.dataChanges.en, step.dataChanges.zh)}</p>
                </div>

                <div>
                  <strong>{t("What the user sees", "用户看到什么")}</strong>
                  <p className="muted">{t(step.userSees.en, step.userSees.zh)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel" style={{ marginTop: 24 }}>
        <p className="section-kicker">{t("Boundaries", "边界说明")}</p>
        <div className="two-col">
          {boundaryRows.map((row) => (
            <div key={row.label.en} className="card">
              <h2 className="section-title" style={{ fontSize: "1.4rem" }}>
                {t(row.label.en, row.label.zh)}
              </h2>
              <p className="muted">{t(row.detail.en, row.detail.zh)}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
