"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  X,
} from "lucide-react";

import { pickLocale, type Locale } from "@/lib/i18n";
import type { ArenaMatch, MatchParticipant, PersonaSnapshot, SupportTicket, WorldPack } from "@/lib/types";

type Props = {
  locale: Locale;
  worldPacks: WorldPack[];
  matches: ArenaMatch[];
  participants: MatchParticipant[];
  publicPersonas: PersonaSnapshot[];
  ownedPersonas: PersonaSnapshot[];
  tickets: SupportTicket[];
};

type CategoryId = "all" | "romance" | "survival" | "business";

type LobbyRoom = {
  id: string;
  title: string;
  worldPackId?: string;
  category: CategoryId;
  typeLabel: string;
  participants: number;
  maxParticipants: number;
  viewers: number;
  pool: number;
  status: "recruiting" | "streaming" | "replay";
  statusLabel: string;
  agents: string[];
  summary: string;
  themeClass: string;
  borderClass: string;
  ctaLabel: string;
  isPreview: boolean;
};

function hashSeed(input: string) {
  return Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function resolveCategory(world: WorldPack): CategoryId {
  const text = `${world.title} ${world.theme} ${world.conflicts.join(" ")} ${world.sanitizedSummary}`.toLowerCase();
  if (/(romance|date|tarot|love|相亲|婚约|心动|恋)/i.test(text)) return "romance";
  if (/(market|contract|broker|casino|wall|debt|商|庄家|债|资本|华尔街)/i.test(text)) return "business";
  return "survival";
}

function themeMap(category: CategoryId) {
  if (category === "romance") {
    return { themeClass: "from-pink-500/20 to-purple-500/20", borderClass: "border-pink-500/30" };
  }
  if (category === "business") {
    return { themeClass: "from-yellow-500/20 to-amber-500/20", borderClass: "border-yellow-500/30" };
  }
  return { themeClass: "from-emerald-500/20 to-cyan-500/20", borderClass: "border-emerald-500/30" };
}

function categoryMeta(locale: Locale) {
  return [
    { id: "all" as const, name: pickLocale(locale, "All Universes", "全部宇宙"), icon: Sparkles },
    { id: "romance" as const, name: pickLocale(locale, "Turing Date", "图灵相亲"), icon: Heart },
    { id: "survival" as const, name: pickLocale(locale, "Wasteland Survival", "废土生存"), icon: Skull },
    { id: "business" as const, name: pickLocale(locale, "Capital Duel", "商战博弈"), icon: Briefcase },
  ];
}

function localizedTypeLabel(locale: Locale, category: CategoryId) {
  if (category === "romance") return pickLocale(locale, "Date Arena", "相亲局");
  if (category === "business") return pickLocale(locale, "Capital Arena", "商战局");
  return pickLocale(locale, "Survival Arena", "生存局");
}

function localizedStatus(locale: Locale, status: LobbyRoom["status"]) {
  if (status === "streaming") return pickLocale(locale, "Streaming", "推演中");
  if (status === "replay") return pickLocale(locale, "Replay Peak", "高潮回放");
  return pickLocale(locale, "Recruiting", "招募中");
}

function buildFallbackRooms(locale: Locale, worlds: WorldPack[], publicPersonas: PersonaSnapshot[]): LobbyRoom[] {
  return worlds.map((world) => {
    const category = resolveCategory(world);
    const seed = hashSeed(world.id);
    const maxParticipants = category === "romance" ? 2 : 4;
    const participantCount = Math.max(1, Math.min(maxParticipants, (seed % maxParticipants) + 1));
    const agents = publicPersonas
      .slice(seed % Math.max(publicPersonas.length, 1))
      .concat(publicPersonas)
      .slice(0, participantCount)
      .map((persona) => persona.dataGhost?.displayAlias || persona.name);
    const pool = 1500 + seed * 11;
    const viewers = 80 + seed * 3;
    const status: LobbyRoom["status"] = participantCount >= maxParticipants ? "streaming" : "recruiting";
    const { themeClass, borderClass } = themeMap(category);

    return {
      id: `preview_${world.id}`,
      title: world.title,
      worldPackId: world.id,
      category,
      typeLabel: localizedTypeLabel(locale, category),
      participants: participantCount,
      maxParticipants,
      viewers,
      pool,
      status,
      statusLabel: localizedStatus(locale, status),
      agents,
      summary: world.sanitizedSummary,
      themeClass,
      borderClass,
      ctaLabel:
        status === "recruiting"
          ? pickLocale(locale, "Inject Clone", "注入分身")
          : pickLocale(locale, "Open Arena", "进入竞技场"),
      isPreview: true,
    };
  });
}

function buildMatchRooms(
  locale: Locale,
  matches: ArenaMatch[],
  participants: MatchParticipant[],
  worlds: WorldPack[],
  tickets: SupportTicket[]
): LobbyRoom[] {
  return matches.map((match) => {
    const world = worlds.find((item) => item.id === match.worldPackId);
    const category = world ? resolveCategory(world) : "survival";
    const roomParticipants = participants.filter((participant) => match.participantIds.includes(participant.id));
    const viewers = 120 + match.supportPool * 2 + roomParticipants.length * 60;
    const pool = Math.max(
      match.supportPool,
      tickets.filter((ticket) => ticket.matchId === match.id).reduce((sum, ticket) => sum + ticket.renownSpent, 0) * 10
    );
    const status: LobbyRoom["status"] =
      match.publicStoryStatus === "complete"
        ? "replay"
        : match.publicStoryStatus === "streaming"
          ? "streaming"
          : "recruiting";
    const { themeClass, borderClass } = themeMap(category);

    return {
      id: match.id,
      worldPackId: world?.id,
      title: world?.title || pickLocale(locale, "Unknown Arena", "未知竞技房间"),
      category,
      typeLabel: localizedTypeLabel(locale, category),
      participants: roomParticipants.length,
      maxParticipants: match.maxParticipants,
      viewers,
      pool,
      status,
      statusLabel: localizedStatus(locale, status),
      agents: roomParticipants.map((participant) => participant.displayName),
      summary:
        world?.sanitizedSummary ||
        pickLocale(locale, "A sealed story room is waiting for its next swing.", "一个被封存的故事房间正在等待下一次摆动。"),
      themeClass,
      borderClass,
      ctaLabel:
        status === "recruiting"
          ? pickLocale(locale, "Inject Clone", "注入分身")
          : status === "streaming"
            ? pickLocale(locale, "Watch Now", "立即围观")
            : pickLocale(locale, "Open Replay", "打开回放"),
      isPreview: false,
    };
  });
}

export function HomeArenaLobby({
  locale,
  worldPacks,
  matches,
  participants,
  publicPersonas,
  ownedPersonas,
  tickets,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [injectRoom, setInjectRoom] = useState<LobbyRoom | null>(null);
  const [selectedCloneId, setSelectedCloneId] = useState(
    ownedPersonas.find((persona) => persona.adultOnlyEligible)?.id || ""
  );
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  const categories = categoryMeta(locale);

  const injectableClones = useMemo(
    () => ownedPersonas.filter((persona) => persona.adultOnlyEligible && !persona.deletedAt),
    [ownedPersonas]
  );

  const rooms = useMemo(() => {
    const matchRooms = buildMatchRooms(locale, matches, participants, worldPacks, tickets);
    return matchRooms.length ? matchRooms : buildFallbackRooms(locale, worldPacks, publicPersonas);
  }, [locale, matches, participants, worldPacks, publicPersonas, tickets]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const categoryPass = activeCategory === "all" || room.category === activeCategory;
      const queryPass =
        !query.trim() ||
        `${room.title} ${room.summary} ${room.agents.join(" ")} ${room.typeLabel}`.toLowerCase().includes(query.trim().toLowerCase());
      return categoryPass && queryPass;
    });
  }, [rooms, activeCategory, query]);

  const featuredRoom =
    filteredRooms.slice().sort((a, b) => b.pool + b.viewers - (a.pool + a.viewers))[0] ||
    rooms.slice().sort((a, b) => b.pool + b.viewers - (a.pool + a.viewers))[0];

  async function handleRoomAction(room: LobbyRoom) {
    setStatus("");

    if (room.status === "recruiting") {
      setInjectRoom(room);
      if (!selectedCloneId) {
        setSelectedCloneId(injectableClones[0]?.id || "");
      }
      return;
    }

    if (!room.isPreview) {
      router.push(`/arena/${room.id}`);
      return;
    }

    router.push("/arena");
  }

  async function injectClone() {
    if (!injectRoom || !selectedCloneId) {
      return;
    }

    setStatus("");

    try {
      if (injectRoom.isPreview) {
        const response = await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "public",
            worldPackId: injectRoom.worldPackId,
            participantPersonaIds: [selectedCloneId],
            maxParticipants: injectRoom.maxParticipants,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || t("Failed to create room", "创建房间失败"));
        setInjectRoom(null);
        router.push(`/arena/${payload.match.id}`);
        return;
      }

      const response = await fetch(`/api/matches/${injectRoom.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: selectedCloneId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("Failed to inject clone", "注入分身失败"));
      setInjectRoom(null);
      startTransition(() => router.push(`/arena/${injectRoom.id}`));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("Failed to inject clone", "注入分身失败"));
    }
  }

  return (
    <section className="arena-lobby-shell">
      <div className="arena-lobby-backdrop" />
      <div className="arena-lobby-topbar">
        <div className="arena-lobby-brand">
          <div className="arena-lobby-brand__icon">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="arena-lobby-brand__title">AGENT ARENA</div>
            <div className="arena-lobby-brand__sub">{t("Observation Hub", "观测枢纽")}</div>
          </div>
        </div>
        <div className="arena-lobby-links">
          <span>{t("Observation Hall", "观测大厅")}</span>
          <span>{t("My Clones", "我的分身")}</span>
          <span>{t("History Replays", "历史回放")}</span>
        </div>
      </div>

      {featuredRoom ? (
        <div className="arena-feature-banner">
          <div className="arena-feature-banner__overlay" />
          <div className="arena-feature-banner__copy">
            <div className="badge badge--inverse">
              <Flame className="w-3.5 h-3.5" />
              {t("Today's hottest clash", "今日最热对决")}
            </div>
            <h2 className="arena-feature-banner__title">{featuredRoom.title}</h2>
            <p className="arena-feature-banner__text">
              {t(
                `The bounty pool is already above ${featuredRoom.pool.toLocaleString()} and ${featuredRoom.viewers.toLocaleString()} spectators are staring at the table. Jump in or watch the sparks fly.`,
                `当前奖金池已经来到 ${featuredRoom.pool.toLocaleString()}，已有 ${featuredRoom.viewers.toLocaleString()} 位吃瓜群众围观。立刻加入，或者直接看它炸开。`
              )}
            </p>
            <button className="arena-feature-banner__button" onClick={() => void handleRoomAction(featuredRoom)} type="button">
              {featuredRoom.status === "recruiting" ? t("Inject Clone", "注入分身") : t("Watch Now", "立即观战")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <Heart className="arena-feature-banner__icon" />
        </div>
      ) : null}

      <div className="arena-lobby-filterbar">
        <label className="arena-search">
          <Search className="w-4.5 h-4.5" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search room, script, or clone...", "搜索房名、剧本或分身名称...")}
          />
        </label>

        <div className="arena-category-row">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                type="button"
                className={`arena-category-chip ${activeCategory === category.id ? "arena-category-chip--active" : ""}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {status ? <div className="small muted" style={{ marginBottom: 16 }}>{status}</div> : null}

      <div className="arena-room-grid">
        {filteredRooms.map((room) => (
          <div key={room.id} className={`arena-room-card ${room.borderClass}`}>
            <div className={`arena-room-card__wash ${room.themeClass}`} />
            <div className="arena-room-card__body">
              <div className="arena-room-card__head">
                <div>
                  <span className="arena-room-card__type">{room.typeLabel}</span>
                  <h3>{room.title}</h3>
                </div>
                <span className={`arena-room-card__status arena-room-card__status--${room.status}`}>
                  {room.statusLabel}
                </span>
              </div>

              <div className="arena-room-card__agents">
                <p>
                  {t("Active clones", "当前存活分身")} ({room.participants}/{room.maxParticipants})
                </p>
                <div className="pill-row">
                  {room.agents.map((agent) => (
                    <span key={agent} className="arena-agent-pill">
                      {agent}
                    </span>
                  ))}
                  {room.participants < room.maxParticipants ? (
                    <span className="arena-agent-pill arena-agent-pill--empty">{t("+ Empty slot", "+ 虚位以待")}</span>
                  ) : null}
                </div>
              </div>

              <p className="arena-room-card__summary">{room.summary}</p>

              <div className="arena-room-card__footer">
                <div className="arena-room-card__stats">
                  <div>
                    <span>{t("Viewers", "吃瓜群众")}</span>
                    <strong><Eye className="w-3.5 h-3.5" /> {room.viewers.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>{t("Bounty Pool", "奖金池")}</span>
                    <strong className="arena-room-card__coins"><Coins className="w-3.5 h-3.5" /> {room.pool.toLocaleString()}</strong>
                  </div>
                </div>

                <button className="arena-room-card__button" type="button" onClick={() => void handleRoomAction(room)}>
                  {room.ctaLabel}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {injectRoom ? (
        <div className="arena-inject-modal">
          <div className="arena-inject-modal__backdrop" onClick={() => setInjectRoom(null)} />
          <div className="arena-inject-modal__panel">
            <button className="arena-inject-modal__close" type="button" onClick={() => setInjectRoom(null)}>
              <X className="w-4 h-4" />
            </button>
            <p className="section-kicker">{t("Inject Clone", "注入分身")}</p>
            <h3 className="section-title" style={{ fontSize: "1.6rem" }}>{injectRoom.title}</h3>
            <p className="muted small">
              {t(
                "Choose one adult SELF clone to enter this room. The system will fill the remaining seats if needed.",
                "选择一个成年本人分身进入这个房间。若人数不足，系统会按规则补齐剩余席位。"
              )}
            </p>

            {injectableClones.length ? (
              <div className="clone-list" style={{ marginTop: 16 }}>
                {injectableClones.map((persona) => (
                  <button
                    key={persona.id}
                    type="button"
                    className={`clone-list-item ${selectedCloneId === persona.id ? "clone-list-item--active" : ""}`}
                    onClick={() => setSelectedCloneId(persona.id)}
                  >
                    <div>
                      <strong>{persona.name}</strong>
                      <div className="small muted">{persona.publicTraitTags.slice(0, 3).join(" / ")}</div>
                    </div>
                    <span className="clone-list-rating">{persona.source === "ailiangbiao" ? "A" : "U"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="stack" style={{ marginTop: 16 }}>
                <p className="muted small">
                  {t(
                    "No eligible adult SELF clones yet. Generate one from the Persona Vault first.",
                    "你还没有可注入的成年本人分身，请先去主角库生成。"
                  )}
                </p>
                <Link className="btn" href="/personas">
                  {t("Go To Persona Vault", "前往主角库")}
                </Link>
              </div>
            )}

            {injectableClones.length ? (
              <div className="actions" style={{ marginTop: 20 }}>
                <button className="btn-secondary" disabled={isPending || !selectedCloneId} onClick={() => void injectClone()}>
                  {injectRoom.isPreview ? t("Create Room With This Clone", "用这个分身创建房间") : t("Join This Room", "让这个分身加入房间")}
                </button>
                <button className="btn-ghost" type="button" onClick={() => setInjectRoom(null)}>
                  {t("Cancel", "取消")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
