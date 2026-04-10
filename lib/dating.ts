import { datingModeCatalog } from "@/lib/catalog";
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
  persona: PersonaSnapshot;
  overlay?: PersonaOverlay;
  dossier: DatingDossier;
  modeId: string;
  prompt: string;
}) {
  const mode = datingModeCatalog.find((item) => item.id === args.modeId) ?? datingModeCatalog[0];

  const counterpartProfiles: Record<string, string[]> = {
    real_rehearsal: [
      "对方谨慎但有幽默感，讨厌被推销式表达包围。",
      "TA 会观察你是否能自然接住沉默。",
    ],
    legend_blindbox: [
      "你的盲盒对象像一位把悲伤也经营成审美资本的都市神话。",
      "TA 会被真诚打动，但会对套路味过敏。",
    ],
    fictional_extreme: [
      "对象来自一场政治婚约，表面高贵，实则把每个微表情都当谈判筹码。",
      "任何过度示弱都可能被误判为没有底牌。",
    ],
  };

  const suggestion = pick(args.dossier.openingLines, args.prompt.length);
  const spark = args.persona.publicTraitTags.some((tag) => /慢热|高敏/.test(tag))
    ? "你的慢半拍如果不遮掩，反而会成为可信信号。"
    : "你现在最强的武器不是华丽，而是选择说少一点。";

  const analysis = [
    `Mode: ${mode.label}`,
    ...counterpartProfiles[mode.id],
    `推荐开场: ${suggestion}`,
    `这句会有效，因为它让对方先展示内在规则，而不是先上条件清单。`,
    `风险提醒: ${args.dossier.redFlags[0] ?? "避免一次说完全部履历，让留白替你工作。"}`,
    `火花判断: ${spark}`,
  ];

  const script = [
    `${args.persona.name}: ${suggestion}`,
    `Counterpart: ${pick(counterpartProfiles[mode.id], args.prompt.length + 3)}`,
    `${args.persona.name}: 我更想知道你最近一次认真喜欢上某件事，是在哪个瞬间。`,
  ];

  return {
    mode,
    analysis,
    script,
  };
}
