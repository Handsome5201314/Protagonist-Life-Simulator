import type { TraitVector } from "@/lib/types";

export type SkillDefinition = {
  id: string;
  name: string;
  rarity: "common" | "rare";
  costRenown: number;
  allowedModes: Array<"arena" | "dating">;
  modifier: Partial<TraitVector>;
  flavor: string;
};

export const skillCatalog: SkillDefinition[] = [
  {
    id: "silver_tongue",
    name: "Silver Tongue",
    rarity: "common",
    costRenown: 8,
    allowedModes: ["arena", "dating"],
    modifier: { charm: 10, empathy: 6 },
    flavor: "让一句普通的话，听起来像命运的邀请函。",
  },
  {
    id: "iron_nerve",
    name: "Iron Nerve",
    rarity: "common",
    costRenown: 10,
    allowedModes: ["arena"],
    modifier: { resilience: 12, courage: 8 },
    flavor: "越接近崩盘，表情越像是已经准备过十次。",
  },
  {
    id: "mirror_read",
    name: "Mirror Read",
    rarity: "common",
    costRenown: 9,
    allowedModes: ["arena", "dating"],
    modifier: { empathy: 12, strategy: 7 },
    flavor: "从一句停顿里读出整段未说出口的历史。",
  },
  {
    id: "spotlight_burst",
    name: "Spotlight Burst",
    rarity: "rare",
    costRenown: 16,
    allowedModes: ["arena", "dating"],
    modifier: { charm: 15, courage: 14, chaos: 9 },
    flavor: "赌上体面，换一秒钟所有视线都属于你。",
  },
  {
    id: "cold_geometry",
    name: "Cold Geometry",
    rarity: "rare",
    costRenown: 15,
    allowedModes: ["arena"],
    modifier: { strategy: 16, focus: 12, empathy: -6 },
    flavor: "把所有感情先摁进图纸，最后再决定谁活。 ",
  },
];

export const worldToneWeights: Record<string, Partial<TraitVector>> = {
  "opulent-pressure": { strategy: 8, courage: 5, chaos: 2 },
  "intimate-danger": { charm: 7, empathy: 8, courage: 3 },
  "ritual-chaos": { chaos: 10, courage: 6 },
  "tender-knife": { empathy: 10, focus: 4, charm: 6 },
};

export const rewardTiers = [
  { threshold: 8, tier: "bronze", renownBonus: 6, seasonPoints: 10 },
  { threshold: 15, tier: "silver", renownBonus: 12, seasonPoints: 18 },
  { threshold: 24, tier: "gold", renownBonus: 20, seasonPoints: 28 },
] as const;

export const datingModeCatalog = [
  {
    id: "real_rehearsal",
    label: "Real Rehearsal",
    description: "真实自我陪练，输出可复制开场白与边界提醒。",
  },
  {
    id: "legend_blindbox",
    label: "Legend Blindbox",
    description: "和极端人格预设相亲，制造反差爆梗素材。",
  },
  {
    id: "fictional_extreme",
    label: "Fictional Extreme",
    description: "把自己投进一场过火的戏剧化相亲局。",
  },
];

export function getSkillById(skillId: string) {
  return skillCatalog.find((skill) => skill.id === skillId);
}
