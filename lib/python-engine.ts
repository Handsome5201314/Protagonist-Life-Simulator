import { z } from "zod";

import type { Locale } from "@/lib/i18n";

export const interactRequestSchema = z.object({
  roomId: z.string().optional(),
  action: z.string().min(1),
  sourceDna: z.object({
    social_energy: z.number().min(0).max(1),
    empathy_resonance: z.number().min(0).max(1),
    rational_logic: z.number().min(0).max(1),
    stress_resilience: z.number().min(0).max(1),
    behavioral_flexibility: z.number().min(0).max(1),
  }),
  targetDna: z
    .object({
      social_energy: z.number().min(0).max(1),
      empathy_resonance: z.number().min(0).max(1),
      rational_logic: z.number().min(0).max(1),
      stress_resilience: z.number().min(0).max(1),
      behavioral_flexibility: z.number().min(0).max(1),
    })
    .optional(),
  traits: z
    .array(
      z.object({
        id: z.string().min(1),
        modifier: z.number().optional(),
        applies_to: z.array(z.string()).optional(),
      })
    )
    .default([]),
  locale: z.enum(["zh", "en"]).optional(),
  seed: z.string().optional(),
});

export type InteractRequest = z.infer<typeof interactRequestSchema>;

export function getPythonEngineBaseUrl() {
  return (process.env.PYTHON_ENGINE_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

export function mapInteractRequestToPython(body: InteractRequest, fallbackLocale: Locale = "zh") {
  return {
    room_id: body.roomId,
    action: body.action,
    source_dna: body.sourceDna,
    target_dna: body.targetDna,
    traits: body.traits,
    locale: body.locale || fallbackLocale,
    seed: body.seed,
  };
}
