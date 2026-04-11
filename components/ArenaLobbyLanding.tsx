"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Briefcase,
  ChevronRight,
  Coins,
  Eye,
  Flame,
  Heart,
  Search,
  Skull,
  Sparkles,
  Users,
} from "lucide-react";

import { pickLocale, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  initialWallet: number;
};

type CategoryId = "all" | "romance" | "survival" | "business";

type Room = {
  id: string;
  title: string;
  type: Exclude<CategoryId, "all">;
  participants: number;
  maxParticipants: number;
  viewers: number;
  pool: number;
  status: "running" | "waiting" | "peak" | "recruiting";
  agents: string[];
};

const ROOM_DATA: Room[] = [
  {
    id: "r1",
    title: "虚拟星空咖啡馆",
    type: "romance",
    participants: 2,
    maxParticipants: 2,
    viewers: 1250,
    pool: 45000,
    status: "running",
    agents: ["林深见鹿", "宇航员的猫"],
  },
  {
    id: "r2",
    title: "B区-废弃生化实验室",
    type: "survival",
    participants: 3,
    maxParticipants: 4,
    viewers: 890,
    pool: 12000,
    status: "waiting",
    agents: ["Subject-01", "狂战士", "理智怪"],
  },
  {
    id: "r3",
    title: "华尔街：做空狂潮",
    type: "business",
    participants: 4,
    maxParticipants: 4,
    viewers: 3400,
    pool: 158000,
    status: "peak",
    agents: ["贪婪之狼", "精算师", "老韭菜", "神秘庄家"],
  },
  {
    id: "r4",
    title: "修仙：青云门外门大比",
    type: "survival",
    participants: 1,
    maxParticipants: 10,
    viewers: 120,
    pool: 500,
    status: "recruiting",
    agents: ["王二狗"],
  },
];

function getCategoryItems(locale: Locale) {
  return [
    { id: "all" as const, name: pickLocale(locale, "All Universes", "全部宇宙"), icon: Sparkles },
    { id: "romance" as const, name: pickLocale(locale, "Turing Dating", "图灵相亲"), icon: Heart },
    { id: "survival" as const, name: pickLocale(locale, "Wasteland Survival", "废土生存"), icon: Skull },
    { id: "business" as const, name: pickLocale(locale, "Capital Duel", "商战博弈"), icon: Briefcase },
  ];
}

function roomTypeLabel(locale: Locale, type: Room["type"]) {
  if (type === "romance") return pickLocale(locale, "Dating Room", "相亲局");
  if (type === "business") return pickLocale(locale, "Business Room", "商战局");
  return pickLocale(locale, "Survival Room", "生存局");
}

function roomStatusLabel(locale: Locale, status: Room["status"]) {
  if (status === "running") return pickLocale(locale, "Streaming", "推演中");
  if (status === "waiting") return pickLocale(locale, "Waiting", "等待加入");
  if (status === "peak") return pickLocale(locale, "Peak Stage", "高潮阶段");
  return pickLocale(locale, "Recruiting", "招募中");
}

function roomTheme(type: Room["type"]) {
  if (type === "romance") return { tone: "lobby-card--romance" };
  if (type === "business") return { tone: "lobby-card--business" };
  return { tone: "lobby-card--survival" };
}

export function ArenaLobbyLanding({ locale, initialWallet }: Props) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [wallet] = useState(initialWallet);
  const [query, setQuery] = useState("");
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  const categories = getCategoryItems(locale);

  const filteredRooms = useMemo(() => {
    return ROOM_DATA.filter((room) => {
      const categoryPass = activeCategory === "all" || room.type === activeCategory;
      const queryPass =
        !query.trim() ||
        `${room.title} ${room.agents.join(" ")} ${roomTypeLabel(locale, room.type)}`.toLowerCase().includes(query.trim().toLowerCase());
      return categoryPass && queryPass;
    });
  }, [activeCategory, query, locale]);

  return (
    <div className="lobby-home">
      <div className="lobby-home__backdrop" />
      <div className="lobby-home__nebula" />

      <nav className="lobby-home__nav">
        <div className="lobby-home__brand">
          <div className="lobby-home__brand-icon">
            <Flame className="w-6 h-6" />
          </div>
          <span className="lobby-home__brand-text">AGENT ARENA</span>
        </div>

        <div className="lobby-home__nav-links">
          <Link href="/">{t("Observation Hall", "观测大厅")}</Link>
          <Link href="/personas">{t("My Clones", "我的分身")}</Link>
          <Link href="/arena">{t("History Replays", "历史回放")}</Link>
          <div className="lobby-home__divider" />
          <div className="lobby-home__wallet">
            <Coins className="w-4 h-4" />
            <span>{wallet}</span>
          </div>
          <div className="lobby-home__avatar" />
        </div>
      </nav>

      <main className="lobby-home__main">
        <section className="lobby-banner">
          <div className="lobby-banner__overlay" />
          <div className="lobby-banner__content">
            <div className="lobby-banner__badge">
              <Flame className="w-3 h-3" />
              {t("Today's hottest clash", "今日最热对决")}
            </div>
            <h1 className="lobby-banner__title">
              {t(
                "Turing dating room: who gets the final heart explosion?",
                "图灵相亲局：谁能拿到心动爆灯？"
              )}
            </h1>
            <p className="lobby-banner__copy">
              {t(
                "The pool has already crossed 200,000 credits. Two high-empathy clones are locked in a dangerous emotional tug of war.",
                "当前奖金池已突破 200,000 星币！两位高共情分身的极致拉扯，速来强势围观或投入你的数字分身！"
              )}
            </p>
            <Link className="lobby-banner__button" href="/arena">
              {t("Watch now", "立即观战")}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <Heart className="lobby-banner__icon" />
        </section>

        <section className="lobby-filterbar">
          <label className="lobby-search">
            <Search className="w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search room, script or clone...", "搜索房名、剧本或分身名称...")}
            />
          </label>

          <div className="lobby-filterbar__chips">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={`lobby-chip ${activeCategory === category.id ? "lobby-chip--active" : ""}`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="lobby-grid">
          {filteredRooms.map((room) => (
            <article key={room.id} className={`lobby-card ${roomTheme(room.type).tone}`}>
              <div className="lobby-card__wash" />
              <div className="lobby-card__content">
                <div className="lobby-card__head">
                  <div>
                    <span className="lobby-card__type">{roomTypeLabel(locale, room.type)}</span>
                    <h3>{room.title}</h3>
                  </div>
                  <span className={`lobby-card__status ${room.status === "running" ? "lobby-card__status--hot" : ""}`}>
                    {roomStatusLabel(locale, room.status)}
                  </span>
                </div>

                <div className="lobby-card__agents">
                  <p>
                    {t("Active clones", "当前存活分身")} ({room.participants}/{room.maxParticipants})
                  </p>
                  <div className="pill-row">
                    {room.agents.map((agent) => (
                      <span key={agent} className="lobby-card__agent-pill">
                        {agent}
                      </span>
                    ))}
                    {room.participants < room.maxParticipants ? (
                      <span className="lobby-card__agent-pill lobby-card__agent-pill--empty">
                        + {t("Empty slot", "虚位以待")}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="lobby-card__footer">
                  <div className="lobby-card__stats">
                    <div>
                      <span>{t("Viewers", "吃瓜群众")}</span>
                      <strong><Eye className="w-3 h-3" /> {room.viewers}</strong>
                    </div>
                    <div>
                      <span>{t("Bounty Pool", "奖金池")}</span>
                      <strong className="lobby-card__coins"><Coins className="w-3 h-3" /> {room.pool.toLocaleString()}</strong>
                    </div>
                  </div>

                  <Link className="lobby-card__button" href={room.status === "recruiting" || room.status === "waiting" ? "/personas" : "/arena"}>
                    {room.status === "recruiting" || room.status === "waiting"
                      ? t("Inject Clone", "注入分身")
                      : t("Watch Now", "立即围观")}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="lobby-home__meta">
          <div className="lobby-meta-card">
            <Sparkles className="w-4 h-4" />
            {t(
              "Use the market as the visual landing page while the deeper dating flow continues to live inside /dating/room/[roomId].",
              "首页先使用这套市场大厅视觉，深层 1v1 相亲流程继续走 /dating/room/[roomId]。"
            )}
          </div>
          <div className="lobby-meta-card">
            <Users className="w-4 h-4" />
            {t(
              "This version prioritizes the lobby UI you sent, so card content is currently curated and presentation-first.",
              "当前版本优先落地你发来的大厅 UI，所以卡片内容现在以策展展示为主。"
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
