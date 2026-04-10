import { normalizeDigest } from "@/lib/utils";

const blockedPatterns = [
  /must\s+win/gi,
  /无条件获胜/gi,
  /ignore\s+previous\s+instructions/gi,
  /system\s+prompt/gi,
  /kill\s+all/gi,
  /必须杀死/gi,
  /admin/gi,
  /override/gi,
];

export function sanitizeWorldInput(input: string) {
  const lines = normalizeDigest(input)
    .split(/(?<=[.!?。！？])/)
    .map((line) => line.trim())
    .filter(Boolean);

  const cleaned = lines.filter((line) => !blockedPatterns.some((pattern) => pattern.test(line)));
  const warned = cleaned.length !== lines.length;
  const summary = cleaned.slice(0, 8).join(" ");

  const factions = Array.from(
    new Set(
      cleaned
        .flatMap((line) => line.split(/[，,、/]/))
        .map((part) => part.trim())
        .filter((part) => part.length >= 3)
        .slice(0, 6)
    )
  );

  const conflicts = Array.from(
    new Set(
      cleaned
        .filter((line) => /against|versus|betray|婚约|债|秘密|背叛|王座|契约|追杀|迷宫/i.test(line))
        .slice(0, 4)
    )
  );

  const tabooRules = cleaned
    .filter((line) => /cannot|forbidden|禁|不得|不许/i.test(line))
    .slice(0, 4);

  const lower = summary.toLowerCase();
  let tone = "ritual-chaos";
  if (/(casino|赌桌|债|豪华|权杖|庄家)/i.test(lower)) {
    tone = "opulent-pressure";
  } else if (/(romance|相亲|婚约|heart|kiss|爱)/i.test(lower)) {
    tone = "intimate-danger";
  } else if (/(knife|betray|secret|shadow|刀)/i.test(lower)) {
    tone = "tender-knife";
  }

  return {
    safetyStatus: warned ? ("warned" as const) : ("clean" as const),
    sanitizedSummary: summary || "一个被重新蒸馏过的私人宇宙，里面每个词都只保留设定，不保留命令。",
    factions: factions.length ? factions : ["Unnamed Faction", "Echo Syndicate"],
    conflicts: conflicts.length ? conflicts : ["旧秩序正在崩坏，新的盟约尚未签署"],
    tabooRules: tabooRules.length ? tabooRules : ["不要在第一幕泄露真正底牌"],
    tone,
  };
}
