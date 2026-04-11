import type { PersonaSnapshot, TraitVector } from "@/lib/types";
import { addDays, createId, createLockedHash } from "@/lib/utils";

type ImportedAssessment = {
  scaleId: string;
  conclusion: string;
  totalScore?: number;
};

type ImportedProfile = {
  id?: string;
  nickname: string;
  relation?: string;
  ageMonths?: number | null;
  interests?: string[];
  fears?: string[];
  assessments?: ImportedAssessment[];
};

type PartnerProfilePayload = {
  profileId: string;
  name: string;
  adultOnlyEligible: boolean;
  source: string;
  expiresAt: string;
};

function createVectorFromAssessments(assessments: ImportedAssessment[] = []): TraitVector {
  const joined = assessments.map((item) => `${item.scaleId}:${item.conclusion}`).join(" ").toLowerCase();

  const base: TraitVector = {
    charm: 52,
    resilience: 54,
    focus: 58,
    empathy: 56,
    strategy: 57,
    chaos: 32,
    courage: 55,
  };

  if (/mbti/.test(joined)) {
    base.strategy += 8;
    base.focus += 4;
  }

  if (/holland/.test(joined)) {
    base.charm += 6;
    base.courage += 4;
  }

  if (/(焦虑|anxiety)/.test(joined)) {
    base.resilience -= 6;
    base.focus -= 4;
    base.empathy += 6;
  }

  if (/(抑郁|depress)/.test(joined)) {
    base.charm -= 5;
    base.resilience -= 5;
  }

  return base;
}

export async function createPersonaFromAiliangbiaoProfile(userId: string, profile: ImportedProfile): Promise<PersonaSnapshot> {
  const interests = profile.interests ?? ["叙事设计", "人格实验"];
  const fears = profile.fears ?? ["被错误定义"];
  const assessments = profile.assessments ?? [];
  const vector = createVectorFromAssessments(assessments);
  const ageMonths = profile.ageMonths ?? 360;
  const ageBand = ageMonths >= 216 ? "adult" : ageMonths >= 156 ? "teen" : "child";
  const relation = String(profile.relation || "SELF").toUpperCase() === "SELF" ? "SELF" : "OTHER";
  const adultOnlyEligible = relation === "SELF" && ageBand === "adult";

  const publicTraitTags = [
    adultOnlyEligible ? "成年主角" : "私密档案",
    vector.strategy > 60 ? "策略型" : "感受型",
    vector.charm > 60 ? "镜头感" : "慢热",
    vector.resilience > 60 ? "抗压" : "高敏",
  ];

  return {
    id: createId("persona"),
    userId,
    source: "ailiangbiao",
    sourceProfileId: profile.id,
    assessmentVersion: "ailiangbiao-prototype",
    name: profile.nickname,
    relation,
    ageBand,
    adultOnlyEligible,
    traitVector: vector,
    publicTraitTags,
    fears,
    interests,
    communicationStyle: vector.charm > 60 ? "theatrical-intimate" : "quiet-precise",
    careerTilt: vector.strategy > vector.empathy ? "strategy-led" : "people-led",
    riskFlags: adultOnlyEligible ? [] : ["private_only"],
    lockedHash: createLockedHash({ profile: profile.nickname, interests, fears, assessments }),
    expiresAt: addDays(30),
  };
}

export async function fetchPrototypeImportPayload() {
  return {
    externalUserId: "prototype-linked-user",
    profiles: [
      {
        id: "lb_self_adult",
        nickname: "Measure-born Hero",
        relation: "SELF",
        ageMonths: 336,
        interests: ["心理画像", "世界观构建", "策略游戏"],
        fears: ["被粗暴归类", "失去选择权"],
        assessments: [
          { scaleId: "MBTI", conclusion: "偏战略与抽象思维" },
          { scaleId: "HOLLAND", conclusion: "研究与创意兼具" },
        ],
      },
      {
        id: "lb_other_child",
        nickname: "Private Child Mirror",
        relation: "OTHER",
        ageMonths: 120,
        interests: ["星图", "图鉴"],
        fears: ["陌生嘈杂环境"],
        assessments: [{ scaleId: "SRS", conclusion: "仅限私密追踪，不进入公开竞技" }],
      },
    ],
  };
}

function getPartnerBaseUrl() {
  return process.env.AILIANGBIAO_BASE_URL?.replace(/\/$/, "");
}

function getPartnerHeaders() {
  const token = process.env.AILIANGBIAO_PARTNER_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export async function fetchPartnerImportPayload() {
  const baseUrl = getPartnerBaseUrl();
  if (!baseUrl) return null;

  const profilesResponse = await fetch(`${baseUrl}/api/partner/v1/profiles`, {
    headers: getPartnerHeaders(),
    cache: "no-store",
  });

  if (!profilesResponse.ok) return null;

  const profilesPayload = (await profilesResponse.json()) as { profiles?: PartnerProfilePayload[] };
  if (!profilesPayload.profiles?.length) return null;

  const profiles: ImportedProfile[] = [];

  for (const profile of profilesPayload.profiles) {
    const [snapshotResponse, assessmentsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/partner/v1/profiles/${encodeURIComponent(profile.profileId)}/persona-snapshot`, {
        headers: getPartnerHeaders(),
        cache: "no-store",
      }),
      fetch(`${baseUrl}/api/partner/v1/profiles/${encodeURIComponent(profile.profileId)}/assessments`, {
        headers: getPartnerHeaders(),
        cache: "no-store",
      }),
    ]);

    if (!snapshotResponse.ok) continue;

    const snapshotPayload = (await snapshotResponse.json()) as {
      sourceProfileId?: string;
      publicTraitTags?: string[];
      traitVector?: TraitVector;
      riskFlags?: string[];
    };
    const assessmentsPayload = assessmentsResponse.ok
      ? ((await assessmentsResponse.json()) as { items?: ImportedAssessment[] })
      : { items: [] };

    profiles.push({
      id: snapshotPayload.sourceProfileId || profile.profileId,
      nickname: profile.name,
      relation: profile.adultOnlyEligible ? "SELF" : "OTHER",
      ageMonths: profile.adultOnlyEligible ? 336 : 144,
      interests: snapshotPayload.publicTraitTags || ["partner import"],
      fears: snapshotPayload.riskFlags || [],
      assessments: assessmentsPayload.items || [],
    });
  }

  return profiles.length ? { externalUserId: "partner-linked-user", profiles } : null;
}

export async function fetchSinglePartnerPersona(profileId: string) {
  const baseUrl = getPartnerBaseUrl();
  if (!baseUrl) return null;

  const [snapshotResponse, assessmentsResponse] = await Promise.all([
    fetch(`${baseUrl}/api/partner/v1/profiles/${encodeURIComponent(profileId)}/persona-snapshot`, {
      headers: getPartnerHeaders(),
      cache: "no-store",
    }),
    fetch(`${baseUrl}/api/partner/v1/profiles/${encodeURIComponent(profileId)}/assessments`, {
      headers: getPartnerHeaders(),
      cache: "no-store",
    }),
  ]);

  if (!snapshotResponse.ok) return null;

  const snapshotPayload = (await snapshotResponse.json()) as {
    sourceProfileId?: string;
    publicTraitTags?: string[];
    traitVector?: TraitVector;
    riskFlags?: string[];
  };
  const assessmentsPayload = assessmentsResponse.ok
    ? ((await assessmentsResponse.json()) as { items?: ImportedAssessment[] })
    : { items: [] };

  return {
    id: snapshotPayload.sourceProfileId || profileId,
    nickname: `Linked ${profileId.slice(0, 6)}`,
    relation: "SELF",
    ageMonths: 336,
    interests: snapshotPayload.publicTraitTags || ["partner import"],
    fears: snapshotPayload.riskFlags || [],
    assessments: assessmentsPayload.items || [],
  } satisfies ImportedProfile;
}
