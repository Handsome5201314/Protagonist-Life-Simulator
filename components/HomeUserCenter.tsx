"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { pickLocale, type Locale } from "@/lib/i18n";
import type { PersonaOverlay, PersonaSnapshot, UserRecord } from "@/lib/types";

type Props = {
  locale: Locale;
  user: UserRecord;
  personas: PersonaSnapshot[];
  overlays: PersonaOverlay[];
};

type RadarTrait = {
  name: string;
  value: number;
  color: string;
};

function deriveRadarTraits(locale: Locale, snapshot: PersonaSnapshot): RadarTrait[] {
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  return [
    { name: t("Social Energy", "社交能量"), value: snapshot.traitVector.charm / 100, color: "#ec4899" },
    { name: t("Empathic Sync", "共情共鸣"), value: snapshot.traitVector.empathy / 100, color: "#a855f7" },
    { name: t("Behavior Flex", "行为灵活"), value: snapshot.traitVector.chaos / 100, color: "#3b82f6" },
    { name: t("Resilience", "抗压韧性"), value: snapshot.traitVector.resilience / 100, color: "#10b981" },
    { name: t("Logic", "理性逻辑"), value: snapshot.traitVector.strategy / 100, color: "#eab308" },
  ];
}

function getRating(snapshot: PersonaSnapshot) {
  const values = [
    snapshot.traitVector.charm,
    snapshot.traitVector.empathy,
    snapshot.traitVector.chaos,
    snapshot.traitVector.resilience,
    snapshot.traitVector.strategy,
  ];
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (avg >= 78) return "S";
  if (avg >= 66) return "A";
  if (avg >= 54) return "B";
  return "C";
}

function getConstraints(snapshot: PersonaSnapshot) {
  return [
    ...snapshot.publicTraitTags,
    ...snapshot.fears,
    snapshot.communicationStyle,
    snapshot.careerTilt,
  ]
    .filter(Boolean)
    .slice(0, 8);
}

function getSourceLabel(locale: Locale, snapshot: PersonaSnapshot) {
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  if (snapshot.source === "ailiangbiao") return t("AIliangbiao Certified", "AIliangbiao 认证");
  if (snapshot.source === "upload") return t("Upload-Minted", "上传铸造");
  return t("Legend Preset", "传说预设");
}

function getImportLabel(locale: Locale, snapshot: PersonaSnapshot) {
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  if (snapshot.source === "ailiangbiao") return t("Synced from linked account", "来自已绑定量表账户");
  if (snapshot.source === "upload") return t("Generated from uploaded profile data", "根据用户上传数据生成");
  return t("Loaded from legend archive", "来自传说档案库");
}

function RadarChart({ traits, size = 290 }: { traits: RadarTrait[]; size?: number }) {
  const center = size / 2;
  const radius = size / 2 - 44;
  const angles = traits.map((_, index) => (Math.PI * 2 * index) / traits.length - Math.PI / 2);

  const getPoint = (value: number, angle: number) => ({
    x: center + radius * value * Math.cos(angle),
    y: center + radius * value * Math.sin(angle),
  });

  const levels = [0.2, 0.4, 0.6, 0.8, 1];
  const points = traits.map((trait, index) => getPoint(trait.value, angles[index]));
  const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="clone-radar-shell">
      <svg width={size} height={size} className="clone-radar-svg" viewBox={`0 0 ${size} ${size}`}>
        {levels.map((level) => {
          const gridPoints = angles.map((angle) => {
            const point = getPoint(level, angle);
            return `${point.x},${point.y}`;
          });

          return (
            <polygon
              key={level}
              points={gridPoints.join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.09)"
              strokeWidth="1"
            />
          );
        })}

        {angles.map((angle, index) => {
          const point = getPoint(1, angle);
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          );
        })}

        <polygon points={polygonPoints} fill="url(#clone-radar-fill)" stroke="#a855f7" strokeWidth="2" />

        {points.map((point, index) => (
          <circle
            key={traits[index].name}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={traits[index].color}
            style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
          />
        ))}

        {traits.map((trait, index) => {
          const labelPoint = getPoint(1.15, angles[index]);
          let anchor: "start" | "middle" | "end" = "middle";
          if (labelPoint.x < center - 10) anchor = "end";
          if (labelPoint.x > center + 10) anchor = "start";

          return (
            <text
              key={trait.name}
              x={labelPoint.x}
              y={labelPoint.y + 5}
              fill="rgba(255,255,255,0.72)"
              fontSize="12"
              fontWeight="700"
              textAnchor={anchor}
              letterSpacing="0.08em"
            >
              {trait.name}
            </text>
          );
        })}

        <defs>
          <linearGradient id="clone-radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(236,72,153,0.42)" />
            <stop offset="100%" stopColor="rgba(168,85,247,0.42)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="clone-radar-core" />
    </div>
  );
}

export function HomeUserCenter({ locale, user, personas, overlays }: Props) {
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  const ownedPersonas = useMemo(() => personas.filter((persona) => persona.source !== "legend"), [personas]);
  const [selectedId, setSelectedId] = useState(ownedPersonas[0]?.id || "");
  const [copied, setCopied] = useState(false);

  const selected = ownedPersonas.find((persona) => persona.id === selectedId) || ownedPersonas[0];
  const overlay = overlays.find((item) => item.personaId === selected?.id);

  async function copyHash() {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.lockedHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!selected) {
    return (
      <section className="user-center-shell">
        <div className="user-center-grid">
          <div className="user-center-card">
            <p className="user-center-kicker">{t("User Center", "用户中心")}</p>
            <h2 className="user-center-title">{t("No clone generated yet", "你还没有生成分身")}</h2>
            <p className="user-center-copy">
              {t(
                "Upload profile data or bind AIliangbiao first. The hall will automatically mint your persona snapshots into clones.",
                "先上传画像数据或绑定 AIliangbiao，首页大厅会自动把你的 PersonaSnapshot 铸造成分身。"
              )}
            </p>
            <div className="actions">
              <Link className="btn" href="/personas">
                {t("Go To Persona Vault", "前往主角库")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const traits = deriveRadarTraits(locale, selected);
  const constraints = getConstraints(selected);
  const generatedCloneCount = ownedPersonas.length;

  return (
    <section className="user-center-shell">
      <div className="user-center-grid">
        <div className="user-center-card user-center-card--manifest">
          <div className="user-center-glow" />
          <p className="user-center-kicker">{t("User Center", "用户中心")}</p>
          <div className="user-center-manifest-head">
            <div className="clone-orb">
              <div className="clone-orb__halo" />
              <div className="clone-orb__core" />
              <div className="clone-orb__spark">✦</div>
            </div>
            <div className="clone-manifest-copy">
              <div className="clone-title-row">
                <h2 className="user-center-title">{selected.dataGhost?.displayAlias || selected.name}</h2>
                <Link href="/personas" className="clone-edit-link">
                  {t("Edit", "编辑")}
                </Link>
              </div>
              <div className="pill-row">
                <span className="clone-badge clone-badge--pink">{getSourceLabel(locale, selected)}</span>
                <span className="clone-badge clone-badge--violet">
                  {t("Rating", "评级")} {getRating(selected)}
                </span>
              </div>
              <p className="clone-meta-line">
                {t("Gene Extracted", "基因提取方式")}: {getImportLabel(locale, selected)}
              </p>
              <p className="clone-meta-line">
                {t("Available Clones", "已生成分身")}: {generatedCloneCount} · {t("Renown", "声望")} {user.wallet.renown} · {t("Diamonds", "钻石")} {user.wallet.diamonds}
              </p>
            </div>
          </div>
        </div>

        <div className="user-center-card user-center-card--list">
          <p className="user-center-kicker">{t("Clone Roster", "分身列表")}</p>
          <div className="clone-list">
            {ownedPersonas.map((persona) => (
              <button
                key={persona.id}
                type="button"
                className={`clone-list-item ${persona.id === selected.id ? "clone-list-item--active" : ""}`}
                onClick={() => setSelectedId(persona.id)}
              >
                <div>
                  <strong>{persona.dataGhost?.displayAlias || persona.name}</strong>
                  <div className="small muted">
                    {persona.source === "upload"
                      ? t("Generated from upload", "根据上传数据生成")
                      : persona.source === "ailiangbiao"
                        ? t("Synced from AIliangbiao", "来自 AIliangbiao 同步")
                        : t("Archive preset", "档案预设")}
                  </div>
                </div>
                <span className="clone-list-rating">{getRating(persona)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="user-center-detail">
        <div className="user-center-card">
          <h3 className="user-center-subtitle">{t("Destiny Astrolabe", "命运星盘")}</h3>
          <RadarChart traits={traits} />
        </div>

        <div className="user-center-card">
          <h3 className="user-center-subtitle">{t("Behavioral Constraints", "行为约束")}</h3>
          <div className="clone-tags">
            {constraints.map((constraint) => (
              <span key={constraint} className="clone-tag">
                {constraint}
              </span>
            ))}
          </div>

          <div className="clone-hash-box">
            <div className="clone-hash-label">
              <span>#</span>
              <span>{t("Immutable Hash", "锁定指纹")}</span>
            </div>
            <div className="clone-hash-row">
              <span className="clone-hash-value">{selected.lockedHash}</span>
              <button type="button" className="clone-hash-copy" onClick={() => void copyHash()}>
                {copied ? t("Copied", "已复制") : t("Copy", "复制")}
              </button>
            </div>
            <p className="clone-hash-note">
              {t(
                "This fingerprint is used by the referee engine for fair settlement. Editing the base snapshot invalidates the match.",
                "这个指纹会被裁判引擎用于公平结算。任何试图直接修改底座的行为都会让对局失效。"
              )}
            </p>
          </div>
        </div>

        <div className="user-center-card">
          <h3 className="user-center-subtitle">{t("Clone Equipment Layer", "分身装备层")}</h3>
          <div className="stack small">
            <div>{t("Public Bio", "公开传记")}: {overlay?.publicBio || t("Not written yet", "暂未编写")}</div>
            <div>{t("Resume Overlay", "履历外层")}: {overlay?.resumeSummary || t("Not written yet", "暂未编写")}</div>
            <div>{t("Tone Preset", "语气预设")}: {overlay?.tonePreset || "measured-poetic"}</div>
            <div>{t("Privacy", "隐私级别")}: {overlay?.privacyLevel || "public"}</div>
          </div>
          <div className="actions" style={{ marginTop: 16 }}>
            <Link className="btn-secondary" href="/personas">
              {t("Manage Clones", "管理分身")}
            </Link>
            <Link className="btn-ghost" href="/arena">
              {t("Send To Arena", "送入竞技场")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
