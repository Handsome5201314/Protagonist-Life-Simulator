"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, Star } from "lucide-react";

import { pickLocale, type Locale } from "@/lib/i18n";
import type { PersonaOverlay, PersonaSnapshot } from "@/lib/types";

type Candidate = {
  personaId: string;
  name: string;
  tagline: string;
  matchScore: number;
  tags: string[];
  vibeHint: string;
  statusLine: string;
};

type Props = {
  locale: Locale;
  selfPersona: PersonaSnapshot | null;
  candidates: Candidate[];
  overlays: PersonaOverlay[];
  onRequireBind: () => void;
};

function gradientByScore(score: number) {
  if (score >= 84) return "from-pink-500/30 via-purple-500/24 to-indigo-500/28";
  if (score >= 72) return "from-cyan-500/24 via-purple-500/18 to-pink-500/22";
  if (score >= 60) return "from-emerald-500/22 via-cyan-500/18 to-blue-500/22";
  return "from-zinc-500/20 via-slate-500/16 to-purple-500/18";
}

export function MarketCardGrid({ locale, selfPersona, candidates, overlays, onRequireBind }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [loadingId, setLoadingId] = useState("");
  const [isPending, startTransition] = useTransition();
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);

  async function openFate(candidateId: string) {
    if (!selfPersona) {
      onRequireBind();
      return;
    }

    setStatus("");
    setLoadingId(candidateId);
    try {
      const response = await fetch("/api/dating/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selfPersonaId: selfPersona.id,
          counterpartPersonaId: candidateId,
          locale,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || t("Failed to create dating room", "创建相亲房失败"));
      }
      startTransition(() => router.push(`/dating/room/${payload.room.id}`));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("Failed to create dating room", "创建相亲房失败"));
    } finally {
      setLoadingId("");
    }
  }

  return (
    <section className="dating-market">
      <div className="dating-market__head">
        <div>
          <p className="section-kicker">{t("Turing Dating Market", "图灵相亲市场")}</p>
          <h2 className="section-title">{t("Today's 3 strongest resonance candidates", "今日星象匹配：最强灵魂共鸣者")}</h2>
        </div>
        {selfPersona ? (
          <div className="dating-market__self">
            <span>{t("Current persona", "当前画像")}</span>
            <strong>{selfPersona.name}</strong>
          </div>
        ) : null}
      </div>

      {status ? <div className="small muted" style={{ marginBottom: 16 }}>{status}</div> : null}

      <div className="dating-market__grid">
        {candidates.map((candidate) => {
          const overlay = overlays.find((item) => item.personaId === candidate.personaId);
          return (
            <article key={candidate.personaId} className="dating-card">
              <div className={`dating-card__wash bg-gradient-to-br ${gradientByScore(candidate.matchScore)}`} />
              <div className="dating-card__content">
                <div className="dating-card__badge-row">
                  <span className="dating-card__badge">
                    <Sparkles className="w-3.5 h-3.5" />
                    {candidate.matchScore}%
                  </span>
                  <span className="dating-card__badge dating-card__badge--ghost">
                    <Heart className="w-3.5 h-3.5" />
                    {candidate.statusLine}
                  </span>
                </div>

                <div className="dating-card__avatar">
                  <div className="dating-card__avatar-orb">
                    {candidate.name.slice(0, 1)}
                  </div>
                </div>

                <div className="dating-card__copy">
                  <h3>{candidate.name}</h3>
                  <p className="dating-card__tagline">{candidate.tagline}</p>
                  <div className="pill-row">
                    {candidate.tags.map((tag) => (
                      <span key={tag} className="dating-card__tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="dating-card__hint">
                    <Star className="w-3.5 h-3.5" />
                    {overlay?.publicBio || candidate.vibeHint}
                  </p>
                </div>

                <button
                  type="button"
                  className="dating-card__button"
                  disabled={isPending || loadingId === candidate.personaId}
                  onClick={() => void openFate(candidate.personaId)}
                >
                  {loadingId === candidate.personaId
                    ? t("Opening...", "开启中...")
                    : t("Open Fate Gear", "开启命运齿轮")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
