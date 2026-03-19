// lib/rubrics/index.ts
import { rubric1VO } from "./1vo";

// Deze imports bestaan pas zodra jij die files aanmaakt
import { rubric2VO } from "./2vo";
import { rubric3VO } from "./3vo";
import { rubricBasisjaar } from "./basisjaar";

export const rubrics = {
  "1vo": rubric1VO,
  "2vo": rubric2VO,
  "3vo": rubric3VO,
  "basisjaar": rubricBasisjaar,
} as const;

export type RubricKey = keyof typeof rubrics;

export function getRubric(key: string) {
  return rubrics[(key as RubricKey) ?? "1vo"] ?? rubric1VO;
}