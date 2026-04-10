import crypto from "node:crypto";

import type { TraitVector } from "@/lib/types";

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function addHours(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeDigest(input: string) {
  return input
    .replace(/[^\p{L}\p{N}\s,.;:!?-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
}

export function createLockedHash(payload: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function pick<T>(items: T[], seed: number) {
  if (!items.length) {
    throw new Error("Cannot pick from empty array");
  }
  return items[Math.abs(seed) % items.length];
}

export function seededNumber(seed: number, salt = 1) {
  const x = Math.sin(seed * 999 + salt * 13) * 10000;
  return x - Math.floor(x);
}

export function mergeTraitVector(base: TraitVector, modifier: Partial<TraitVector>) {
  return {
    charm: clamp(base.charm + (modifier.charm ?? 0), 0, 100),
    resilience: clamp(base.resilience + (modifier.resilience ?? 0), 0, 100),
    focus: clamp(base.focus + (modifier.focus ?? 0), 0, 100),
    empathy: clamp(base.empathy + (modifier.empathy ?? 0), 0, 100),
    strategy: clamp(base.strategy + (modifier.strategy ?? 0), 0, 100),
    chaos: clamp(base.chaos + (modifier.chaos ?? 0), 0, 100),
    courage: clamp(base.courage + (modifier.courage ?? 0), 0, 100),
  };
}

export function formatList(values: string[]) {
  return values.filter(Boolean).join(" / ");
}
