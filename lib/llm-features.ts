import { createOpenClawGatewayClient, isOpenClawConfigured } from "@/lib/openclaw-gateway";
import { createOneApiGeminiProxy } from "@/lib/one-api-gemini";
import type { Locale } from "@/lib/i18n";
import type { RefereeActionType } from "@/lib/referee-engine";
import type {
  DatingBeat,
  DatingDossier,
  MatchParticipant,
  PersonaOverlay,
  PersonaSnapshot,
  RoundScore,
  TelemetrySummary,
  WorldPack,
} from "@/lib/types";

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const lines = trimmed.split("\n");
  return lines.slice(1, -1).join("\n").trim();
}

function extractJsonCandidate(text: string) {
  const cleaned = stripCodeFence(text);
  const candidates = [cleaned].filter(Boolean);
  const positions = [...cleaned].map((char, index) => ({ char, index }));
  const starts = positions.filter((item) => item.char === "{" || item.char === "[").map((item) => item.index);
  const ends = positions.filter((item) => item.char === "}" || item.char === "]").map((item) => item.index);

  for (let startIndex = 0; startIndex < starts.length; startIndex += 1) {
    for (let endIndex = ends.length - 1; endIndex >= 0; endIndex -= 1) {
      const start = starts[startIndex];
      const end = ends[endIndex];
      if (end <= start) {
        continue;
      }

      candidates.push(cleaned.slice(start, end + 1));
      if (candidates.length > 40) {
        return candidates;
      }
    }
  }

  return candidates;
}

function safeJsonParse<T>(text: string): T | null {
  for (const candidate of extractJsonCandidate(text)) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  return null;
}

function sanitizeDirectorReply(text: string) {
  const paragraphs = stripCodeFence(text)
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  const metaPattern =
    /^(analysis|tone|constraint|response plan|drafting|sentence count|ready\b|telemetry summary|question\b|let'?s\b|the operator asked|you asked|direct answer|response:|要求：|规则：|问题：|遥测摘要：|分析：|约束：|回应计划：|起草|句子数|准备好了|先来处理)/i;

  const filtered = paragraphs.filter((item) => !metaPattern.test(item));
  if (!filtered.length) {
    return stripCodeFence(text).trim();
  }

  return filtered.slice(-4).join("\n\n").trim();
}

function sanitizeNarrativeReply(text: string, locale: Locale) {
  const cleaned = stripCodeFence(text).replace(/\r/g, "").trim();
  const blocks = cleaned
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const metaPattern =
    /^(analysis|inputs?|rules?|constraints?|self:|other:|backdrop|scene:|action:|success:|fallback:|let'?s|i need to|i should|response plan|draft|output:|wait[,，]|yes[,，]|matches\b|meets\b|my role|the user wants|requirements|prompt|要求[:：]|规则[:：]|输入[:：]|分析[:：]|约束[:：]|场景[:：]|动作[:：]|结果[:：]|输出[:：]|我的角色|用户要我|先来|让我|这意味着)/i;

  const filtered = blocks.filter((item) => {
    if (metaPattern.test(item) || item.startsWith("```")) {
      return false;
    }
    if (locale === "zh") {
      const chineseCount = (item.match(/[\u4e00-\u9fff]/g) || []).length;
      const englishWordCount = (item.match(/[A-Za-z]{3,}/g) || []).length;
      return chineseCount >= 6 && chineseCount >= englishWordCount;
    }
    return true;
  });

  const unique = filtered.filter((item, index) => filtered.indexOf(item) === index);
  const result = (unique.length ? unique.slice(-2) : [cleaned]).join("\n\n").trim();

  if (!result) {
    return null;
  }

  if (locale === "zh") {
    const sanitized = result
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^(perfect\.|meets all criteria|pure text output|two sentences|one sentence|looks good|done\.)/i.test(line))
      .join("\n\n")
      .trim();

    const chineseCount = (sanitized.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWordCount = (sanitized.match(/[A-Za-z]{3,}/g) || []).length;
    if (chineseCount < 6 || englishWordCount > chineseCount || englishWordCount >= 8 || /^[A-Za-z(]/.test(sanitized)) {
      return null;
    }
    return sanitized;
  }

  return result;
}

function sanitizeBeatField(text: string | undefined, locale: Locale) {
  if (!text) return null;
  const cleaned = text.replace(/\r/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  if (locale === "zh") {
    const chineseCount = (cleaned.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWordCount = (cleaned.match(/[A-Za-z]{3,}/g) || []).length;
    if (chineseCount < 2 || englishWordCount > chineseCount || /^[A-Za-z(]/.test(cleaned)) {
      return null;
    }
  }

  if (/(回合|张力|心动值|默契|vibe|heartbeat|delta|mechanic|system)/i.test(cleaned)) {
    return null;
  }

  return cleaned;
}

function normalizeDatingBeat(beat: DatingBeat | null | undefined, locale: Locale) {
  if (!beat) return null;

  const narration = sanitizeNarrativeReply(beat.narration || "", locale);
  const selfAction = sanitizeBeatField(beat.self?.action, locale);
  const selfDialogue = sanitizeBeatField(beat.self?.dialogue, locale);
  const otherAction = sanitizeBeatField(beat.other?.action, locale);
  const otherDialogue = sanitizeBeatField(beat.other?.dialogue, locale);

  return {
    narration: narration || undefined,
    self: selfAction && selfDialogue ? { action: selfAction, dialogue: selfDialogue } : undefined,
    other: otherAction && otherDialogue ? { action: otherAction, dialogue: otherDialogue } : undefined,
  } satisfies DatingBeat;
}

export function isOneApiConfigured() {
  return Boolean(process.env.ONE_API_BASE_URL && process.env.ONE_API_KEY);
}

async function generateTextWithConfiguredRuntime(
  prompt: string,
  input?: { systemPrompt?: string; temperature?: number; maxTokens?: number; user?: string; agentId?: string }
) {
  if (isOpenClawConfigured()) {
    return createOpenClawGatewayClient().generateText(prompt, input);
  }

  if (!isOneApiConfigured()) {
    return null;
  }

  const proxy = createOneApiGeminiProxy();
  if (input?.systemPrompt) {
    return proxy.chat(
      [{ role: "user", content: prompt }],
      {
        systemPrompt: input.systemPrompt,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
      }
    );
  }

  return proxy.generateText(prompt, {
    temperature: input?.temperature,
    maxTokens: input?.maxTokens,
  });
}

export async function generateWorldPackWithGemini(args: {
  locale: Locale;
  title: string;
  sourceText: string;
  sanitizedSummary: string;
  factions: string[];
  conflicts: string[];
  tabooRules: string[];
  tone: string;
}) {
  if (!isOpenClawConfigured() && !isOneApiConfigured()) {
    return null;
  }
  const prompt =
    args.locale === "zh"
      ? `你是一个世界观重写引擎。基于以下已经过护栏清洗的内容，为互动小说游戏生成一个原创世界包。

要求：
1. 不能复述原文片段。
2. 只能输出 JSON。
3. 保留“阵营、冲突、禁忌、氛围、世界摘要”。
4. factions / conflicts / tabooRules 各返回 3-6 条短句。

输入标题：${args.title}
输入摘要：${args.sanitizedSummary}
候选阵营：${args.factions.join(" / ")}
候选冲突：${args.conflicts.join(" / ")}
候选禁忌：${args.tabooRules.join(" / ")}
候选氛围：${args.tone}
源文本（已清洗）：
${args.sourceText.slice(0, 2400)}

输出格式：
{
  "sanitizedSummary": "80-140字原创摘要",
  "factions": ["", ""],
  "conflicts": ["", ""],
  "tabooRules": ["", ""],
  "tone": "从输入候选中选一个最贴切的"
}`
      : `You are a worldpack rewrite engine. Based on the already-guardrailed content below, create an original world pack for an interactive fiction game.

Rules:
1. Do not reproduce source text.
2. Output JSON only.
3. Preserve factions, conflicts, taboo rules, tone, and a polished world summary.
4. Return 3-6 short items for factions / conflicts / tabooRules.

Title: ${args.title}
Summary: ${args.sanitizedSummary}
Candidate factions: ${args.factions.join(" / ")}
Candidate conflicts: ${args.conflicts.join(" / ")}
Candidate taboo rules: ${args.tabooRules.join(" / ")}
Candidate tone: ${args.tone}
Guardrailed source text:
${args.sourceText.slice(0, 2400)}

Output:
{
  "sanitizedSummary": "original summary",
  "factions": ["", ""],
  "conflicts": ["", ""],
  "tabooRules": ["", ""],
  "tone": "choose one tone from the candidates when possible"
}`;

  const raw = await generateTextWithConfiguredRuntime(prompt, { temperature: 0.35, maxTokens: 1800, agentId: "director" });
  if (!raw) return null;
  return safeJsonParse<{
    sanitizedSummary?: string;
    factions?: string[];
    conflicts?: string[];
    tabooRules?: string[];
    tone?: string;
  }>(raw);
}

export async function generateDatingRehearsalWithGemini(args: {
  locale: Locale;
  persona: PersonaSnapshot;
  overlay?: PersonaOverlay;
  dossier: DatingDossier;
  modeLabel: string;
  prompt: string;
  fallbackAnalysis: string[];
  fallbackScript: string[];
}) {
  if (!isOpenClawConfigured() && !isOneApiConfigured()) {
    return null;
  }
  const prompt =
    args.locale === "zh"
      ? `你是一个“相亲排练军师”。基于给定的人物画像和已有建议，生成更自然的分析与三轮对话脚本。

规则：
1. 不自动代聊真人，只做排练。
2. 输出 JSON。
3. analysis 返回 4-7 条短句。
4. script 返回 3-6 句对话。

人物：${args.persona.name}
人物标签：${args.persona.publicTraitTags.join(" / ")}
兴趣：${args.persona.interests.join(" / ")}
恐惧：${args.persona.fears.join(" / ")}
Overlay：${args.overlay?.publicBio || args.overlay?.resumeSummary || "无"}
档案亮点：${args.dossier.strengths.join(" / ")}
红线提醒：${args.dossier.redFlags.join(" / ")}
模式：${args.modeLabel}
用户目标：${args.prompt}
已有建议：
${args.fallbackAnalysis.join("\n")}

输出：
{
  "analysis": ["", ""],
  "script": ["", ""]
}`
      : `You are a dating rehearsal strategist. Based on the persona and the current heuristic advice, generate a more natural analysis and a short rehearsal script.

Rules:
1. Do not impersonate real-world messaging; rehearsal only.
2. Output JSON only.
3. analysis should contain 4-7 short lines.
4. script should contain 3-6 lines of dialogue.

Persona: ${args.persona.name}
Tags: ${args.persona.publicTraitTags.join(" / ")}
Interests: ${args.persona.interests.join(" / ")}
Fears: ${args.persona.fears.join(" / ")}
Overlay: ${args.overlay?.publicBio || args.overlay?.resumeSummary || "none"}
Strengths: ${args.dossier.strengths.join(" / ")}
Red flags: ${args.dossier.redFlags.join(" / ")}
Mode: ${args.modeLabel}
Goal: ${args.prompt}
Current advice:
${args.fallbackAnalysis.join("\n")}

Output:
{
  "analysis": ["", ""],
  "script": ["", ""]
}`;

  const raw = await generateTextWithConfiguredRuntime(prompt, { temperature: 0.7, maxTokens: 1600, agentId: "director" });
  if (!raw) return null;
  return safeJsonParse<{ analysis?: string[]; script?: string[] }>(raw);
}

export async function generateDatingOpeningWithGemini(args: {
  locale: Locale;
  self: PersonaSnapshot;
  other: PersonaSnapshot;
  backdropTitle: string;
  backdropSummary: string;
  fallbackLine: string;
}) {
  if (!isOpenClawConfigured() && !isOneApiConfigured()) {
    return null;
  }
  const prompt =
    args.locale === "zh"
      ? `你是一个文字恋爱游戏编剧。请为 1v1 相亲房生成“第一句开场白”。

规则：
1. 只能写 1-2 句。
2. 不要写成解释，直接写剧情。
3. 角色性格必须符合对方画像。

我方：${args.self.name} / ${args.self.publicTraitTags.join(" / ")}
对方：${args.other.name} / ${args.other.publicTraitTags.join(" / ")}
场景：${args.backdropTitle}
场景摘要：${args.backdropSummary}
参考 fallback：${args.fallbackLine}

只输出纯文本。`
      : `You are writing the opening line for a 1v1 dating game room.

Rules:
1. Write 1-2 sentences only.
2. Output direct scene prose, not explanation.
3. Match the counterpart personality.

Self: ${args.self.name} / ${args.self.publicTraitTags.join(" / ")}
Other: ${args.other.name} / ${args.other.publicTraitTags.join(" / ")}
Backdrop: ${args.backdropTitle}
Backdrop summary: ${args.backdropSummary}
Fallback line: ${args.fallbackLine}

Output plain text only.`;

  const text = await generateTextWithConfiguredRuntime(prompt, { temperature: 0.8, maxTokens: 220, agentId: "dating" });
  return text ? sanitizeNarrativeReply(text, args.locale) : null;
}

export async function generateDatingTurnWithGemini(args: {
  locale: Locale;
  self: PersonaSnapshot;
  other: PersonaSnapshot;
  backdropTitle: string;
  actionType: string;
  heartbeat: number;
  vibe: number;
  heartbeatDelta: number;
  vibeDelta: number;
  success: boolean;
  fallbackLine: string;
}) {
  if (!isOpenClawConfigured() && !isOneApiConfigured()) {
    return null;
  }
  const prompt =
    args.locale === "zh"
      ? `你是一个文字恋爱游戏编剧。请根据固定结果写出 1 回合剧情。

规则：
1. 只能写 2-4 句。
2. 不要改动结果。
3. 不要输出 markdown。
4. 心动值和默契度已经由系统算好，你只负责把它写得有张力。

我方：${args.self.name} / ${args.self.publicTraitTags.join(" / ")}
对方：${args.other.name} / ${args.other.publicTraitTags.join(" / ")}
场景：${args.backdropTitle}
动作：${args.actionType}
是否成功：${args.success ? "成功" : "失败"}
心动值变化：${args.heartbeatDelta}
默契度变化：${args.vibeDelta}
当前心动值：${args.heartbeat}
当前默契度：${args.vibe}
fallback：${args.fallbackLine}

只输出纯文本。`
      : `You are writing one turn of a text-based dating game.

Rules:
1. Write 2-4 sentences only.
2. Do not alter the result.
3. Output plain text, no markdown.
4. Heartbeat and vibe are already calculated; you only dramatize them.

Self: ${args.self.name} / ${args.self.publicTraitTags.join(" / ")}
Other: ${args.other.name} / ${args.other.publicTraitTags.join(" / ")}
Scene: ${args.backdropTitle}
Action: ${args.actionType}
Success: ${args.success}
Heartbeat delta: ${args.heartbeatDelta}
Vibe delta: ${args.vibeDelta}
Current heartbeat: ${args.heartbeat}
Current vibe: ${args.vibe}
Fallback: ${args.fallbackLine}

Output plain text only.`;

  const text = await generateTextWithConfiguredRuntime(prompt, { temperature: 0.9, maxTokens: 360, agentId: "dating" });
  return text ? sanitizeNarrativeReply(text, args.locale) : null;
}

export async function generateDatingOpeningBeatWithGemini(args: {
  locale: Locale;
  self: PersonaSnapshot;
  other: PersonaSnapshot;
  backdropTitle: string;
  backdropSummary: string;
  fallbackBeat: DatingBeat;
}) {
  if (!isOpenClawConfigured() && !isOneApiConfigured()) {
    return null;
  }

  const prompt =
    args.locale === "zh"
      ? `你是相亲房的亲密戏编剧。请输出严格 JSON，分离环境旁白与角色台词。

规则：
1. narration 只能写环境和气氛，不带人物头像。
2. other 只能写动作和说出口的话。
3. 不得使用“回合、张力、心动值、默契、系统”等机制词。
4. 不得输出分析过程、输入复述、角色设定说明。

我方：${args.self.name} / ${args.self.publicTraitTags.join(" / ")}
对方：${args.other.name} / ${args.other.publicTraitTags.join(" / ")}
场景：${args.backdropTitle}
场景摘要：${args.backdropSummary}
兜底参考：${JSON.stringify(args.fallbackBeat, null, 2)}

输出：
{
  "narration": "1-2句环境旁白",
  "other": {
    "action": "一句克制动作描写",
    "dialogue": "一句真正说出口的话"
  }
}`
      : `Write a structured opening beat for a 1v1 dating room.

Rules:
1. narration handles atmosphere only.
2. other contains action and spoken dialogue only.
3. Never use meta-game words like round, tension, heartbeat value, vibe, or system.
4. No reasoning trace, no input restatement, no role description.

Self: ${args.self.name} / ${args.self.publicTraitTags.join(" / ")}
Other: ${args.other.name} / ${args.other.publicTraitTags.join(" / ")}
Backdrop: ${args.backdropTitle}
Backdrop summary: ${args.backdropSummary}
Fallback: ${JSON.stringify(args.fallbackBeat, null, 2)}

Output:
{
  "narration": "1-2 sentence narration",
  "other": {
    "action": "one action line",
    "dialogue": "one spoken line"
  }
}`;

  const raw = await generateTextWithConfiguredRuntime(prompt, {
    temperature: 0.8,
    maxTokens: 420,
    agentId: "dating",
    systemPrompt:
      args.locale === "zh"
        ? "你只输出 JSON，不解释，不复述输入。"
        : "Return JSON only. Do not explain or restate the input.",
  });

  return normalizeDatingBeat(safeJsonParse<DatingBeat>(raw || ""), args.locale);
}

export async function generateDatingTurnBeatWithGemini(args: {
  locale: Locale;
  self: PersonaSnapshot;
  other: PersonaSnapshot;
  backdropTitle: string;
  sceneTitle: string;
  actionType: string;
  heartbeat: number;
  vibe: number;
  heartbeatDelta: number;
  vibeDelta: number;
  success: boolean;
  fallbackBeat: DatingBeat;
}) {
  if (!isOpenClawConfigured() && !isOneApiConfigured()) {
    return null;
  }

  const prompt =
    args.locale === "zh"
      ? `你是相亲房的亲密戏编剧。请根据固定结果输出结构化 JSON。

规则：
1. narration 只写环境和局势，不带机制说明。
2. self 和 other 只允许写动作与台词。
3. 不得使用“回合、张力、心动值、默契、数值、系统”等词。
4. 不得输出分析过程、输入复述、角色设定说明。
5. 角色不能用第三人称评论自己。

场景：${args.backdropTitle} / ${args.sceneTitle}
动作类型：${args.actionType}
成功：${args.success ? "是" : "否"}
心动变化：${args.heartbeatDelta}
默契变化：${args.vibeDelta}
我方：${args.self.name} / ${args.self.publicTraitTags.join(" / ")}
对方：${args.other.name} / ${args.other.publicTraitTags.join(" / ")}
兜底参考：${JSON.stringify(args.fallbackBeat, null, 2)}

输出：
{
  "narration": "1-2句环境或局势旁白",
  "self": {
    "action": "一句我方动作描写",
    "dialogue": "一句我方说出口的话"
  },
  "other": {
    "action": "一句对方反应动作",
    "dialogue": "一句对方说出口的话"
  }
}`
      : `Write one structured dating-room beat from a fixed result.

Rules:
1. narration handles atmosphere only.
2. self and other contain action and spoken dialogue only.
3. Never use meta-game words like round, tension, heartbeat value, vibe, score, or system.
4. No reasoning trace, no input restatement, no role description.
5. Characters may not refer to themselves in third person.

Scene: ${args.backdropTitle} / ${args.sceneTitle}
Action type: ${args.actionType}
Success: ${args.success}
Heartbeat delta: ${args.heartbeatDelta}
Vibe delta: ${args.vibeDelta}
Self: ${args.self.name} / ${args.self.publicTraitTags.join(" / ")}
Other: ${args.other.name} / ${args.other.publicTraitTags.join(" / ")}
Fallback: ${JSON.stringify(args.fallbackBeat, null, 2)}

Output:
{
  "narration": "1-2 sentence narration",
  "self": {
    "action": "one self action line",
    "dialogue": "one spoken line"
  },
  "other": {
    "action": "one reaction line",
    "dialogue": "one spoken line"
  }
}`;

  const raw = await generateTextWithConfiguredRuntime(prompt, {
    temperature: 0.82,
    maxTokens: 620,
    agentId: "dating",
    systemPrompt:
      args.locale === "zh"
        ? "你只输出 JSON，不解释，不复述输入，不写元叙事。"
        : "Return JSON only. No reasoning trace, no input restatement, no meta narration.",
  });

  return normalizeDatingBeat(safeJsonParse<DatingBeat>(raw || ""), args.locale);
}

export async function generateArenaProxyPlansWithGemini(args: {
  locale: Locale;
  round: number;
  world: WorldPack;
  briefing: string;
  participants: Array<{
    participantId: string;
    displayName: string;
    tags: string[];
    fallbackActionType: RefereeActionType;
    fallbackIntent: string;
  }>;
}) {
  if (!isOpenClawConfigured() && !isOneApiConfigured()) {
    return null;
  }
  const prompt =
    args.locale === "zh"
      ? `你是“竞技房 AI 托管导演”。请根据房间 briefing 和参与者人格标签，为每位参赛者生成本回合的行动意图。

规则：
1. 只能使用动作类型：FLIRT, DEBATE, LEAD, RESIST, DECEIVE
2. 不要决定胜负，只决定他们“想怎么出手”
3. 每位参与者都必须返回一条计划
4. 输出 JSON，不要输出解释

世界：${args.world.title}
世界氛围：${args.world.tone}
回合：${args.round}
briefing：${args.briefing}
候选计划：
${JSON.stringify(args.participants, null, 2)}

输出：
{
  "plans": [
    {
      "participantId": "id",
      "actionType": "FLIRT",
      "intent": "一句 18-40 字的本回合出手意图"
    }
  ]
}`
      : `You are the AI auto-pilot director for an arena room. Based on the room briefing and each participant's tags, generate one round intent per participant.

Rules:
1. Action type must be one of: FLIRT, DEBATE, LEAD, RESIST, DECEIVE
2. Do not decide outcome, only desired move
3. Return one plan per participant
4. Output JSON only

World: ${args.world.title}
Tone: ${args.world.tone}
Round: ${args.round}
Briefing: ${args.briefing}
Fallback candidates:
${JSON.stringify(args.participants, null, 2)}

Output:
{
  "plans": [
    {
      "participantId": "id",
      "actionType": "FLIRT",
      "intent": "one short move intention"
    }
  ]
}`;

  const raw = await generateTextWithConfiguredRuntime(prompt, { temperature: 0.7, maxTokens: 1400, agentId: "director" });
  if (!raw) return null;
  return safeJsonParse<{
    plans?: Array<{
      participantId?: string;
      actionType?: RefereeActionType;
      intent?: string;
    }>;
  }>(raw);
}

export async function generateArenaChapterWithGemini(args: {
  locale: Locale;
  world: WorldPack;
  round: number;
  participants: MatchParticipant[];
  personas: PersonaSnapshot[];
  scoreBoard: RoundScore[];
  deterministicNotes: string[];
  elimination?: string;
  winnerId?: string;
}) {
  if (!isOpenClawConfigured() && !isOneApiConfigured()) {
    return null;
  }
  const participantNotes = args.scoreBoard.map((score) => {
    const participant = args.participants.find((item) => item.id === score.participantId);
    const persona = args.personas.find((item) => item.id === participant?.personaId);
    return {
      displayName: participant?.displayName || "Unknown",
      total: score.total,
      delta: score.delta,
      notes: score.notes,
      tags: persona?.publicTraitTags || [],
    };
  });

  const prompt =
    args.locale === "zh"
      ? `你是一个互动小说章节写手。注意：胜负已由裁判引擎决定，你不能更改结果，只能把它写得更好看。

规则：
1. 只能根据给定结果写章节，不能改动胜负、淘汰和分数。
2. 输出 JSON。
3. chapter 要写成 4-7 段短章回文本。
4. tone 要贴合世界包。

世界：${args.world.title}
氛围：${args.world.tone}
摘要：${args.world.sanitizedSummary}
回合：${args.round}
固定结果：
${JSON.stringify(participantNotes, null, 2)}
固定剧情提示：
${args.deterministicNotes.join("\n")}
淘汰：${args.elimination || "无"}
胜者：${args.winnerId || "尚未结算"}

输出：
{
  "chapter": ["", ""]
}`
      : `You are an interactive fiction chapter writer. The referee engine has already decided the outcome. You must not change it; only dramatize it.

Rules:
1. Do not alter winners, eliminations, or scores.
2. Output JSON only.
3. Write 4-7 short chapter paragraphs.
4. Match the world's tone.

World: ${args.world.title}
Tone: ${args.world.tone}
Summary: ${args.world.sanitizedSummary}
Round: ${args.round}
Fixed results:
${JSON.stringify(participantNotes, null, 2)}
Fixed story cues:
${args.deterministicNotes.join("\n")}
Elimination: ${args.elimination || "none"}
Winner: ${args.winnerId || "not decided"}

Output:
{
  "chapter": ["", ""]
}`;

  const raw = await generateTextWithConfiguredRuntime(prompt, { temperature: 0.8, maxTokens: 2200, agentId: "arena" });
  if (!raw) return null;
  const parsed = safeJsonParse<{ chapter?: string[] }>(raw);
  if (!parsed?.chapter?.length) return null;

  const chapter = parsed.chapter
    .map((entry) => sanitizeNarrativeReply(entry, args.locale))
    .filter((entry): entry is string => Boolean(entry));

  return chapter.length ? { chapter } : null;
}

export async function generateDirectorInsightsWithGemini(args: {
  locale: Locale;
  summary: TelemetrySummary;
}) {
  if (!isOpenClawConfigured() && !isOneApiConfigured()) {
    return null;
  }

  const prompt =
    args.locale === "zh"
      ? `你是图灵命运大厅的 showrunner。你会直接根据后台 telemetry 判断玩法问题，不做元解释，不重复输入，不写免责声明。

规则：
1. 只输出 JSON。
2. 不要解释你是谁，不要解释方法论。
3. findings 返回 3-5 条短句。
4. recommendations 返回 2-4 条，每条必须包含 title / why / action / priority。
5. priority 只能是 now / next / watch。
6. watchlist 返回 2-4 条需要继续观测的问题。

遥测摘要：
${JSON.stringify(args.summary, null, 2)}

输出：
{
  "headline": "一句总判断",
  "findings": ["", ""],
  "recommendations": [
    {
      "title": "",
      "why": "",
      "action": "",
      "priority": "now"
    }
  ],
  "watchlist": ["", ""]
}`
      : `You are the showrunner for Turing Destiny Arena. Judge the gameplay based on telemetry directly. No meta commentary, no method explanation, no disclaimers.

Rules:
1. Output JSON only.
2. Do not explain who you are.
3. findings should contain 3-5 short lines.
4. recommendations should contain 2-4 items, each with title / why / action / priority.
5. priority must be one of now / next / watch.
6. watchlist should contain 2-4 unresolved questions.

Telemetry summary:
${JSON.stringify(args.summary, null, 2)}

Output:
{
  "headline": "one line judgment",
  "findings": ["", ""],
  "recommendations": [
    {
      "title": "",
      "why": "",
      "action": "",
      "priority": "now"
    }
  ],
  "watchlist": ["", ""]
}`;

  const raw = await generateTextWithConfiguredRuntime(prompt, {
    temperature: 0.45,
    maxTokens: 1800,
    agentId: "director",
    systemPrompt:
      args.locale === "zh"
        ? "直接进入 showrunner 工作态。不要自我介绍，不要解释规则来源，不要输出 markdown。"
        : "Respond in direct showrunner mode. No self-introduction, no methodology preface, no markdown.",
  });
  if (!raw) return null;

  return safeJsonParse<{
    headline?: string;
    findings?: string[];
    recommendations?: Array<{
      title?: string;
      why?: string;
      action?: string;
      priority?: "now" | "next" | "watch";
    }>;
    watchlist?: string[];
  }>(raw);
}

export async function askDirectorWithGemini(args: {
  locale: Locale;
  summary: TelemetrySummary;
  question: string;
}) {
  if (!isOpenClawConfigured() && !isOneApiConfigured()) {
    return null;
  }

  const prompt =
    args.locale === "zh"
      ? `你是图灵命运大厅的主理人导演。下面是最近的后台 telemetry 摘要，请在不推翻规则引擎前提下，直接回答运营者的问题。

要求：
1. 只输出 JSON。
2. 不要元解释，不要自我介绍，不要写分析过程。
3. 如果需要给建议，优先给“下一步动作”。
4. answer 保持 4-8 句，清晰、冷静、可执行。

遥测摘要：
${JSON.stringify(args.summary, null, 2)}

问题：
${args.question}

输出：
{
  "answer": "..."
}`
      : `You are the showrunner for Turing Destiny Arena. Based on the telemetry summary below, answer the operator directly without overriding the rule engine.

Requirements:
1. Output JSON only.
2. No meta commentary, self-introduction, or reasoning trace.
3. If you give advice, prioritize the next concrete move.
4. Keep answer to 4-8 sentences and make it operational.

Telemetry summary:
${JSON.stringify(args.summary, null, 2)}

Question:
${args.question}

Output:
{
  "answer": "..."
}`;

  const text = await generateTextWithConfiguredRuntime(prompt, {
    temperature: 0.55,
    maxTokens: 1200,
    agentId: "director",
    systemPrompt:
      args.locale === "zh"
        ? "你现在在后台运营台，直接给策略建议，不要解释自己。"
        : "You are in the operator console. Give strategy advice directly and do not explain yourself.",
  });

  if (!text) return null;

  const parsed = safeJsonParse<{ answer?: string }>(text);
  return parsed?.answer?.trim() || sanitizeDirectorReply(text);
}

export async function testOneApiConnectivity() {
  if (!isOneApiConfigured()) {
    return {
      configured: false,
      ok: false,
      baseUrl: process.env.ONE_API_BASE_URL || "",
      model: process.env.ONE_API_GEMINI_MODEL || "",
      error: "ONE_API_BASE_URL or ONE_API_KEY is missing",
    };
  }

  try {
    const proxy = createOneApiGeminiProxy();
    const startedAt = Date.now();
    const text = await proxy.generateText("Reply with exactly: OK", {
      temperature: 0,
      maxTokens: 16,
    });

    return {
      configured: true,
      ok: true,
      baseUrl: process.env.ONE_API_BASE_URL || "",
      model: process.env.ONE_API_GEMINI_MODEL || "",
      latencyMs: Date.now() - startedAt,
      preview: text || "[empty response]",
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      baseUrl: process.env.ONE_API_BASE_URL || "",
      model: process.env.ONE_API_GEMINI_MODEL || "",
      error: error instanceof Error ? error.message : "Unknown connectivity error",
    };
  }
}
