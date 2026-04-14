"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Gem,
  Heart,
  MessageCircleHeart,
  ShieldAlert,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";

import { pickLocale, type Locale } from "@/lib/i18n";
import type {
  DatingMatch,
  DatingMessage,
  DatingMatchOption,
  DatingSceneCard,
  PersonaOverlay,
  PersonaSnapshot,
  UserRecord,
} from "@/lib/types";

type Props = {
  locale: Locale;
  room: DatingMatch;
  selfPersona: PersonaSnapshot;
  counterpartPersona: PersonaSnapshot;
  selfOverlay: PersonaOverlay | null;
  counterpartOverlay: PersonaOverlay | null;
  wallet: UserRecord["wallet"];
};

function splitSegments(text: string) {
  return text.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
}

export function DatingRoomView({
  locale,
  room,
  selfPersona,
  counterpartPersona,
  selfOverlay,
  counterpartOverlay,
  wallet,
}: Props) {
  const t = (en: string, zh: string) => pickLocale(locale, en, zh);
  const [transcript, setTranscript] = useState(room.transcript);
  const [heartbeat, setHeartbeat] = useState(room.heartbeat);
  const [vibe, setVibe] = useState(room.vibe);
  const [scene, setScene] = useState<DatingSceneCard>(room.scene);
  const [options, setOptions] = useState(room.currentOptions);
  const [roomStatus, setRoomStatus] = useState(room.status);
  const [statusText, setStatusText] = useState("");
  const [loading, setLoading] = useState("");
  const [liveSegments, setLiveSegments] = useState<string[]>([]);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => () => sourceRef.current?.close(), []);

  const statusLabel = useMemo(() => {
    if (roomStatus === "soulmatch") return t("Soulmatch", "灵魂共振");
    if (roomStatus === "collapsed") return t("Collapsed", "气氛坍塌");
    return t("Active", "互动进行中");
  }, [roomStatus, locale]);

  const normalOptions = options.filter((option) => option.actionType !== "USE_SKILL");
  const skillOption = options.find((option) => option.actionType === "USE_SKILL");
  const phaseSteps = [
    { label: t("Approach", "接触"), active: true },
    { label: t("Probe", "试探"), active: heartbeat >= 35 || vibe >= 35 },
    { label: t("Ignition", "升温"), active: heartbeat >= 65 || roomStatus === "soulmatch" },
  ];

  function actionLabel(option: DatingMatchOption) {
    if (option.actionType === "FLIRT") return t("Warm Reply", "热感回应");
    if (option.actionType === "LOGIC_TALK") return t("Logic Talk", "理性切入");
    if (option.actionType === "PULL_BACK") return t("Play It Cool", "收束试探");
    return t("Force Truth", "高压技能");
  }

  function startDatingStream(streamId: string) {
    sourceRef.current?.close();
    const source = new EventSource(`/api/dating/streams/${streamId}`);
    sourceRef.current = source;
    setLiveSegments([]);

    source.addEventListener("delta", (event) => {
      const payload = JSON.parse(event.data) as { text: string };
      setLiveSegments((prev) => [...prev, payload.text]);
    });

    source.addEventListener("final", (event) => {
      const payload = JSON.parse(event.data) as {
        text: string;
        messages: DatingMessage[];
        heartbeat: number;
        vibe: number;
        status: DatingMatch["status"];
        scene: DatingSceneCard;
        options: DatingMatchOption[];
      };

      setTranscript((prev) => [...prev, ...(payload.messages || [])]);
      setHeartbeat(payload.heartbeat);
      setVibe(payload.vibe);
      setRoomStatus(payload.status);
      setScene(payload.scene);
      setOptions(payload.options);
      setLoading("");
      setLiveSegments([]);
      source.close();
      sourceRef.current = null;
    });
  }

  async function interact(option: DatingMatchOption) {
    setLoading(option.id);
    setStatusText("");
    try {
      const response = await fetch(`/api/dating/matches/${room.id}/interact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, actionType: option.actionType }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("Interaction failed", "互动失败"));
      startDatingStream(payload.streamId);
    } catch (error) {
      setLoading("");
      setLiveSegments([]);
      setStatusText(error instanceof Error ? error.message : t("Interaction failed", "互动失败"));
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-8 md:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.18),transparent_24%),radial-gradient(circle_at_74%_18%,rgba(34,211,238,0.12),transparent_24%),linear-gradient(135deg,rgba(12,10,30,0.82),rgba(36,36,62,0.72))]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-pink-300/25 bg-pink-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-pink-100">
              <MessageCircleHeart className="h-3.5 w-3.5" />
              {t("Dating Room", "相亲互动室")}
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.26em] text-white/35">{t("Encounter Scene", "相遇场景")}</p>
              <h1 className="mt-3 text-3xl font-black text-white md:text-5xl">{room.backdropTitle}</h1>
            </div>
            <p className="max-w-4xl text-base leading-8 text-white/72 md:text-lg">{room.backdropSummary}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">{t("Status", "当前状态")}</p>
              <strong className="mt-2 inline-flex items-center gap-2 text-lg font-black text-white">
                <Sparkles className="h-4 w-4 text-pink-300" />
                {statusLabel}
              </strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">{t("Heartbeat", "心动值")}</p>
              <strong className="mt-2 inline-flex items-center gap-2 text-lg font-black text-white">
                <Heart className="h-4 w-4 text-pink-300" />
                {heartbeat}
              </strong>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">{t("Vibe", "默契度")}</p>
              <strong className="mt-2 inline-flex items-center gap-2 text-lg font-black text-white">
                <ShieldAlert className="h-4 w-4 text-cyan-300" />
                {vibe}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <aside className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl xl:sticky xl:top-28 xl:self-start">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-pink-400 via-purple-400 to-fuchsia-500 text-2xl font-black text-white">
            {selfPersona.name.slice(0, 1)}
          </div>
          <h2 className="mt-4 text-2xl font-black text-white">{selfPersona.name}</h2>
          <p className="mt-2 text-sm leading-7 text-white/68">{selfOverlay?.publicBio || selfPersona.publicTraitTags.join(" / ")}</p>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-white/45">
                <span>{t("Heartbeat", "心动推进")}</span>
                <span>{heartbeat}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-purple-400" style={{ width: `${heartbeat}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-white/45">
                <span>{t("Vibe", "默契稳定")}</span>
                <span>{vibe}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${vibe}%` }} />
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-white/35">{t("Current Scene", "当前场景")}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{scene.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/68">{scene.summary}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70">
                <Gem className="h-4 w-4 text-pink-300" />
                {t("Diamonds", "星钻")} {wallet.diamonds}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-400/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                  <Target className="h-4 w-4" />
                  {t("Scene Objective", "本幕目标")}
                </div>
                <p className="mt-3 text-sm leading-7 text-white/80">{scene.objective}</p>
              </div>
              <div className="rounded-[24px] border border-amber-300/20 bg-amber-400/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                  <TriangleAlert className="h-4 w-4" />
                  {t("Scene Risk", "本幕风险")}
                </div>
                <p className="mt-3 text-sm leading-7 text-white/80">{scene.risk}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-white/35">{t("Emotional Pace", "情绪步调板")}</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{t("Cinematic Dialogue Flow", "视觉小说对话流")}</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70">{statusLabel}</div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {phaseSteps.map((step) => (
                  <div key={step.label} className={`rounded-[22px] border p-4 ${step.active ? "border-pink-300/25 bg-pink-400/10" : "border-white/10 bg-black/20"}`}>
                    <p className="text-sm font-semibold text-white">{step.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-h-[620px] space-y-5 overflow-y-auto p-5 md:p-6">
              {transcript.map((message) => {
                if (message.speaker === "system") {
                  return (
                    <div key={message.id} className="mx-auto max-w-2xl rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-center">
                      <p className="text-sm leading-7 text-white/72">{message.text}</p>
                    </div>
                  );
                }

                const isSelf = message.speaker === "self";
                const person = isSelf ? selfPersona : counterpartPersona;
                const tags = isSelf ? selfPersona.publicTraitTags : counterpartPersona.publicTraitTags;
                const avatarTone = isSelf ? "from-pink-400 via-purple-400 to-fuchsia-500" : "from-cyan-400 via-sky-500 to-indigo-500";
                const bubbleTone = isSelf ? "border-pink-300/18 bg-pink-400/10" : "border-cyan-300/18 bg-cyan-400/10";

                return (
                  <div key={message.id} className={`flex max-w-[88%] gap-3 ${isSelf ? "ml-auto" : "mr-auto"}`}>
                    {!isSelf ? (
                      <div className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${avatarTone} text-sm font-black text-white`}>
                        {person.name.slice(0, 1)}
                      </div>
                    ) : null}

                    <div className={`flex-1 rounded-[26px] border px-4 py-4 ${bubbleTone}`}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{person.name}</span>
                        <span className="text-[0.72rem] text-white/40">{tags.slice(0, 2).join(" / ")}</span>
                      </div>
                      {message.action ? <p className="text-sm italic leading-7 text-white/65">({message.action})</p> : null}
                      {message.dialogue ? <p className="mt-2 text-sm leading-7 text-white/85 md:text-base">“{message.dialogue}”</p> : null}
                      {!message.action && !message.dialogue && message.text ? (
                        <p className="text-sm leading-7 text-white/80 md:text-base">{message.text}</p>
                      ) : null}
                    </div>

                    {isSelf ? (
                      <div className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${avatarTone} text-sm font-black text-white`}>
                        {person.name.slice(0, 1)}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {liveSegments.length ? (
                <div className="mx-auto max-w-2xl rounded-[24px] border border-white/10 bg-black/20 px-5 py-4 text-center">
                  {splitSegments(liveSegments.join("")).map((segment, index) => (
                    <p key={`${segment}-${index}`} className="text-sm leading-7 text-white/72">
                      {segment}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-white/35">{t("Action Console", "行动控制台")}</p>
                <h2 className="mt-2 text-2xl font-black text-white">{t("Actions and Skills", "动作与技能卡")}</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/70">{scene.title}</div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {normalOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={Boolean(loading)}
                  onClick={() => void interact(option)}
                  className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-left transition hover:border-white/15 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <strong className="text-base text-white">{actionLabel(option)}</strong>
                  <p className="mt-2 text-sm leading-7 text-white/62">{option.flavor}</p>
                </button>
              ))}
            </div>

            {skillOption ? (
              <button
                type="button"
                disabled={Boolean(loading)}
                onClick={() => void interact(skillOption)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-4 text-sm font-semibold text-white shadow-[0_0_24px_rgba(232,121,249,0.28)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? t("Casting skill...", "技能发动中...") : `${skillOption.label} / ${skillOption.costDiamonds ?? 0} ${t("Diamonds", "星钻")}`}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}

            {statusText ? (
              <div className="mt-4 rounded-[22px] border border-pink-300/20 bg-pink-400/10 px-4 py-3 text-sm text-pink-50">
                {statusText}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <section className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-500 text-2xl font-black text-white">
              {counterpartPersona.name.slice(0, 1)}
            </div>
            <h2 className="mt-4 text-2xl font-black text-white">{counterpartPersona.name}</h2>
            <p className="mt-2 text-sm leading-7 text-white/68">{counterpartOverlay?.publicBio || counterpartPersona.publicTraitTags.join(" / ")}</p>
          </section>

          <section className="rounded-[30px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-white/35">{t("Current Advice", "当前建议")}</p>
            <h3 className="mt-2 text-xl font-black text-white">{t("Interaction Tips", "相处提示")}</h3>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-white/68">
              <li>{t("Let the scene objective guide how fast you push forward.", "先判断这一幕适合推进、稳住，还是故意留白。")}</li>
              <li>{t("The higher the heartbeat, the more one mistake gets amplified.", "心动值越高，单次失误越容易被放大。")}</li>
              <li>{t("Use high-cost skills when the room already has enough vibe.", "默契度更高时再用高价技能，收益通常更大。")}</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
