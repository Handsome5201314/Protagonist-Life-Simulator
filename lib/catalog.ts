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
    flavor: "让一句普通的话，听起来像命运亲手递来的邀请函。",
  },
  {
    id: "iron_nerve",
    name: "Iron Nerve",
    rarity: "common",
    costRenown: 10,
    allowedModes: ["arena"],
    modifier: { resilience: 12, courage: 8 },
    flavor: "越接近崩盘边缘，越能把表情稳成一条冷线。",
  },
  {
    id: "mirror_read",
    name: "Mirror Read",
    rarity: "common",
    costRenown: 9,
    allowedModes: ["arena", "dating"],
    modifier: { empathy: 12, strategy: 7 },
    flavor: "从一个停顿里读出整段没有说出口的真实历史。",
  },
  {
    id: "spotlight_burst",
    name: "Spotlight Burst",
    rarity: "rare",
    costRenown: 16,
    allowedModes: ["arena", "dating"],
    modifier: { charm: 15, courage: 14, chaos: 9 },
    flavor: "赌上体面，换一秒钟全场视线都只属于你。",
  },
  {
    id: "cold_geometry",
    name: "Cold Geometry",
    rarity: "rare",
    costRenown: 15,
    allowedModes: ["arena"],
    modifier: { strategy: 16, focus: 12, empathy: -6 },
    flavor: "先把所有情绪摁进图纸里，最后再决定谁该留下。",
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
    label: "真实陪练",
    description: "基于你的分身设定做真实约会演练，输出可复用开场和边界表达。",
  },
  {
    id: "legend_blindbox",
    label: "传说盲盒局",
    description: "和极端人格预设相遇，专门制造强反差与高戏剧张力。",
  },
  {
    id: "fictional_extreme",
    label: "虚构高压局",
    description: "把自己投进一场被剧情强化过的相亲局，练习极端情绪下的判断。",
  },
];

export function getSkillById(skillId: string) {
  return skillCatalog.find((skill) => skill.id === skillId);
}
