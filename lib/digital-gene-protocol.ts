import { z } from "zod";

import type { CoreDimensionVector, PersonaSnapshot, TraitVector } from "@/lib/types";
import { clamp, createId, createLockedHash, nowIso } from "@/lib/utils";

const unitInterval = z.number().min(0).max(1);

export const coreDimensionSchema = z.object({
  social_energy: unitInterval,
  empathy_resonance: unitInterval,
  rational_logic: unitInterval,
  stress_resilience: unitInterval,
  behavioral_flexibility: unitInterval,
});

export const digitalGeneProtocolSchema = z.object({
  version: z.string().min(1),
  dna_id: z.string().min(1),
  generated_at: z.string().min(1),
  display_name: z.string().min(1).optional(),
  relation: z.enum(["SELF", "OTHER"]).optional(),
  age_band: z.enum(["adult", "teen", "child"]).optional(),
  adult_only_eligible: z.boolean().optional(),
  core_dimensions: coreDimensionSchema,
  personality_tags: z.array(z.string()).default([]),
  initial_traits: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  fears: z.array(z.string()).default([]),
  communication_style: z.string().optional(),
  career_tilt: z.string().optional(),
  integrity_hash: z.string().min(1),
});

export type DigitalGeneProtocol = z.infer<typeof digitalGeneProtocolSchema>;

function toPercent(value: number) {
  return clamp(Math.round(value * 100), 0, 100);
}

function toUnit(value: number) {
  return clamp(Number((value / 100).toFixed(4)), 0, 1);
}

function normalizeTraitId(raw: string) {
  const [id] = raw.split(":");
  return id.trim();
}

function buildIntegrityPayload(payload: Omit<DigitalGeneProtocol, "integrity_hash">) {
  return {
    version: payload.version,
    dna_id: payload.dna_id,
    generated_at: payload.generated_at,
    display_name: payload.display_name || "",
    relation: payload.relation || "SELF",
    age_band: payload.age_band || "adult",
    adult_only_eligible: payload.adult_only_eligible ?? false,
    core_dimensions: payload.core_dimensions,
    personality_tags: payload.personality_tags,
    initial_traits: payload.initial_traits,
    interests: payload.interests,
    fears: payload.fears,
    communication_style: payload.communication_style || "",
    career_tilt: payload.career_tilt || "",
  };
}

export function buildDigitalGeneIntegrityHash(payload: Omit<DigitalGeneProtocol, "integrity_hash">) {
  return createLockedHash(buildIntegrityPayload(payload));
}

export function verifyDigitalGeneProtocol(input: unknown) {
  const payload = digitalGeneProtocolSchema.parse(input);
  const { integrity_hash, ...withoutHash } = payload;
  const expectedHash = buildDigitalGeneIntegrityHash(withoutHash);

  if (integrity_hash !== expectedHash) {
    throw new Error("Digital gene integrity hash mismatch");
  }

  return payload;
}

export function looksLikeDigitalGeneProtocol(input: unknown): input is Record<string, unknown> {
  if (!input || typeof input !== "object") return false;
  return "core_dimensions" in input || "integrity_hash" in input || "dna_id" in input;
}

export function coreDimensionsToTraitVector(dimensions: CoreDimensionVector): TraitVector {
  const social = toPercent(dimensions.social_energy);
  const empathy = toPercent(dimensions.empathy_resonance);
  const logic = toPercent(dimensions.rational_logic);
  const resilience = toPercent(dimensions.stress_resilience);
  const flexibility = toPercent(dimensions.behavioral_flexibility);

  return {
    charm: clamp(Math.round(social * 0.78 + empathy * 0.22), 0, 100),
    resilience,
    focus: clamp(Math.round(logic * 0.7 + resilience * 0.3), 0, 100),
    empathy,
    strategy: clamp(Math.round(logic * 0.72 + flexibility * 0.28), 0, 100),
    chaos: clamp(Math.round(flexibility * 0.6 + (100 - logic) * 0.4), 0, 100),
    courage: clamp(Math.round(social * 0.34 + resilience * 0.46 + flexibility * 0.2), 0, 100),
  };
}

export function traitVectorToCoreDimensions(vector: TraitVector): CoreDimensionVector {
  return {
    social_energy: toUnit(Math.round(vector.charm * 0.76 + vector.courage * 0.24)),
    empathy_resonance: toUnit(vector.empathy),
    rational_logic: toUnit(Math.round(vector.strategy * 0.58 + vector.focus * 0.42)),
    stress_resilience: toUnit(vector.resilience),
    behavioral_flexibility: toUnit(Math.round(vector.chaos * 0.58 + vector.courage * 0.18 + vector.charm * 0.24)),
  };
}

export function digitalGeneToPersonaSnapshot(args: {
  userId: string;
  payload: DigitalGeneProtocol;
  source?: PersonaSnapshot["source"];
}) {
  const payload = verifyDigitalGeneProtocol(args.payload);
  const relation = payload.relation ?? "SELF";
  const ageBand = payload.age_band ?? "adult";
  const adultOnlyEligible =
    payload.adult_only_eligible ?? (relation === "SELF" && ageBand === "adult");

  return {
    id: createId("persona"),
    userId: args.userId,
    source: args.source ?? "upload",
    sourceProfileId: payload.dna_id,
    assessmentVersion: payload.version,
    name: payload.display_name || `Genome ${payload.dna_id.slice(0, 8)}`,
    relation,
    ageBand,
    adultOnlyEligible,
    traitVector: coreDimensionsToTraitVector(payload.core_dimensions),
    publicTraitTags: payload.personality_tags.length ? payload.personality_tags : ["数字基因导入"],
    fears: payload.fears,
    interests: payload.interests,
    communicationStyle: payload.communication_style || "measured-adaptive",
    careerTilt: payload.career_tilt || "people-and-strategy",
    riskFlags: adultOnlyEligible ? [] : ["private_only"],
    traitFragmentIds: payload.initial_traits.map(normalizeTraitId),
    lockedHash: payload.integrity_hash,
    expiresAt: new Date(new Date(payload.generated_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies PersonaSnapshot;
}

export function personaSnapshotToDigitalGene(persona: PersonaSnapshot): DigitalGeneProtocol {
  const payloadWithoutHash = {
    version: "1.0",
    dna_id: persona.sourceProfileId || persona.id,
    generated_at: nowIso(),
    display_name: persona.dataGhost?.displayAlias || persona.name,
    relation: persona.relation,
    age_band: persona.ageBand,
    adult_only_eligible: persona.adultOnlyEligible,
    core_dimensions: traitVectorToCoreDimensions(persona.traitVector),
    personality_tags: persona.publicTraitTags,
    initial_traits: persona.traitFragmentIds ?? [],
    interests: persona.interests,
    fears: persona.fears,
    communication_style: persona.communicationStyle,
    career_tilt: persona.careerTilt,
  } satisfies Omit<DigitalGeneProtocol, "integrity_hash">;

  return {
    ...payloadWithoutHash,
    integrity_hash: buildDigitalGeneIntegrityHash(payloadWithoutHash),
  };
}
