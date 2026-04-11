import { createOneApiGeminiProxy } from "@/lib/one-api-gemini";
import type { Locale } from "@/lib/i18n";
import type { MatchParticipant, PersonaSnapshot, RoundScore, WorldPack, DatingDossier, PersonaOverlay } from "@/lib/types";

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const lines = trimmed.split("\n");
  return lines.slice(1, -1).join("\n").trim();
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(stripCodeFence(text)) as T;
  } catch {
    return null;
  }
}

export function isOneApiConfigured() {
  return Boolean(process.env.ONE_API_BASE_URL && process.env.ONE_API_KEY);
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
  if (!isOneApiConfigured()) {
    return null;
  }

  const proxy = createOneApiGeminiProxy();
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

  const raw = await proxy.generateText(prompt, { temperature: 0.35, maxTokens: 1800 });
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
  if (!isOneApiConfigured()) {
    return null;
  }

  const proxy = createOneApiGeminiProxy();
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

  const raw = await proxy.generateText(prompt, { temperature: 0.7, maxTokens: 1600 });
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
  if (!isOneApiConfigured()) {
    return null;
  }

  const proxy = createOneApiGeminiProxy();
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

  const text = await proxy.generateText(prompt, { temperature: 0.8, maxTokens: 220 });
  return text.trim() || null;
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
  if (!isOneApiConfigured()) {
    return null;
  }

  const proxy = createOneApiGeminiProxy();
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

  const text = await proxy.generateText(prompt, { temperature: 0.9, maxTokens: 360 });
  return text.trim() || null;
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
  if (!isOneApiConfigured()) {
    return null;
  }

  const proxy = createOneApiGeminiProxy();
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

  const raw = await proxy.generateText(prompt, { temperature: 0.8, maxTokens: 2200 });
  return safeJsonParse<{ chapter?: string[] }>(raw);
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
