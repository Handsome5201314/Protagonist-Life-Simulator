import { datingModeCatalog } from "@/lib/catalog";
import type { Locale } from "@/lib/i18n";
import type { DatingDossier, PersonaOverlay, PersonaSnapshot } from "@/lib/types";
import { addDays, createId, pick } from "@/lib/utils";

export function createDatingDossier(args: {
  userId: string;
  persona: PersonaSnapshot;
  overlay?: PersonaOverlay;
  resumeText: string;
}) {
  const resumeFacts = args.resumeText
    .split(/\n|。|\./)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 6);

  const styleTags = [
    args.persona.communicationStyle,
    args.persona.careerTilt,
    args.overlay?.tonePreset ?? "measured-poetic",
  ].filter(Boolean);

  const strengths = [
    `${args.persona.name} 在陌生环境里依然保有叙事感。`,
    `最擅长把 ${args.persona.interests.slice(0, 2).join(" / ")} 变成可聊的话题。`,
    args.overlay?.resumeSummary ?? "履历层显示 TA 有把复杂信息解释清楚的能力。",
  ];

  const redFlags = args.persona.fears.map((fear) => `避免直接踩中: ${fear}`).slice(0, 3);
  const forbiddenTopics = [
    "连环盘问收入和婚期",
    "刚见面就用模板化夸赞轰炸",
    "把对方当 KPI 审核",
  ];

  const openingLines = [
    `如果今晚只能聊一件你真正上头的事，你会选什么？`,
    `你看起来像那种对世界有自己分类法的人，我很好奇第一条规则是什么。`,
    `我们先不谈条件交换，讲一个最近让你重新喜欢上生活的小场景吧。`,
  ];

  return {
    id: createId("dossier"),
    userId: args.userId,
    personaId: args.persona.id,
    resumeFacts,
    styleTags,
    redFlags,
    strengths,
    goal: "把相亲从简历互审，改造成一次带边界感的高质量探索。",
    openingLines,
    forbiddenTopics,
    expiresAt: addDays(30),
  } satisfies DatingDossier;
}

export function runDatingRehearsal(args: {
  locale?: Locale;
  persona: PersonaSnapshot;
  overlay?: PersonaOverlay;
  dossier: DatingDossier;
  modeId: string;
  prompt: string;
}) {
  const locale = args.locale || "en";
  const t = (en: string, zh: string) => (locale === "zh" ? zh : en);
  const mode = datingModeCatalog.find((item) => item.id === args.modeId) ?? datingModeCatalog[0];

  const counterpartProfiles: Record<string, string[]> = {
    real_rehearsal: [
      t("The counterpart is cautious but funny, and hates being sold to.", "对方谨慎但有幽默感，讨厌被推销式表达包围。"),
      t("They will notice whether you can hold silence without panic.", "TA 会观察你是否能自然接住沉默。"),
    ],
    legend_blindbox: [
      t("Your blindbox counterpart feels like an urban myth who turned sadness into aesthetic capital.", "你的盲盒对象像一位把悲伤也经营成审美资本的都市神话。"),
      t("They respond to sincerity and recoil from canned charm.", "TA 会被真诚打动，但会对套路味过敏。"),
    ],
    fictional_extreme: [
      t("The counterpart comes from a political marriage plot: elegant on the surface, negotiating with every micro-expression.", "对象来自一场政治婚约，表面高贵，实则把每个微表情都当谈判筹码。"),
      t("Too much visible weakness may be read as having no hidden cards.", "任何过度示弱都可能被误判为没有底牌。"),
    ],
  };

  const suggestion = pick(args.dossier.openingLines, args.prompt.length);
  const spark = args.persona.publicTraitTags.some((tag) => /慢热|高敏/.test(tag))
    ? t("If you stop hiding that half-beat delay, it becomes a trust signal.", "你的慢半拍如果不遮掩，反而会成为可信信号。")
    : t("Your strongest move right now is not brilliance, but restraint.", "你现在最强的武器不是华丽，而是选择说少一点。");

  const analysis = [
    `${t("Mode", "模式")}: ${locale === "zh" && mode.label === "Real Rehearsal" ? "真实陪练" : locale === "zh" && mode.label === "Legend Blindbox" ? "盲盒名人局" : locale === "zh" && mode.label === "Fictional Extreme" ? "虚构极端局" : mode.label}`,
    ...counterpartProfiles[mode.id],
    `${t("Recommended opener", "推荐开场")}: ${suggestion}`,
    t(
      "This line works because it asks the other person to reveal an internal rule instead of starting from a checklist.",
      "这句话会有效，因为它让对方先展示内在规则，而不是先上条件清单。"
    ),
    `${t("Risk reminder", "风险提醒")}: ${args.dossier.redFlags[0] ?? t("Do not unload your whole resume at once. Let silence do some of the work.", "不要一次说完全部履历，让留白替你工作。")}`,
    `${t("Spark read", "火花判断")}: ${spark}`,
  ];

  const script = [
    `${args.persona.name}: ${suggestion}`,
    `${t("Counterpart", "对方")}: ${pick(counterpartProfiles[mode.id], args.prompt.length + 3)}`,
    `${args.persona.name}: ${t("I would rather know the exact moment you last seriously fell for something.", "我更想知道你最近一次认真喜欢上某件事，是在哪个瞬间。")}`,
  ];

  return {
    mode,
    analysis,
    script,
  };
}
