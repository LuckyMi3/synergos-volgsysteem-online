// lib/profiles/compute.ts

import type { OntwikkelKey, VaardigheidKey } from "./axes";

export type ProfileMoment = "ALL" | "M1" | "M2" | "M3";

export type OntwikkelValues = Record<OntwikkelKey, number>;
export type VaardigheidValues = Record<VaardigheidKey, number>;

export type ProfileAssessmentScore = {
  themeId: string;
  questionId: string;
  score: number;
};

export type ProfileAssessmentTeacherScore = {
  themeId: string;
  questionId: string;
  correctedScore: number | null;
};

export type ProfileAssessment = {
  assessmentId?: string;
  rubricKey: string;
  moment: Exclude<ProfileMoment, "ALL">;
  scores: ProfileAssessmentScore[];
  teacherScores?: ProfileAssessmentTeacherScore[];
};

type AxisAccumulator<K extends string> = Record<K, { total: number; weight: number }>;
type AxisWeights<K extends string> = Partial<Record<K, number>>;

type MappingEntry = {
  ontwikkel?: AxisWeights<OntwikkelKey>;
  vaardigheid?: AxisWeights<VaardigheidKey>;
};

type RubricMapping = {
  themeDefaults?: Record<string, MappingEntry>;
  questionOverrides?: Record<string, MappingEntry>;
};

const ZERO_ONTWIKKEL: OntwikkelValues = {
  zelfinzicht: 0,
  lichaamsbewustzijn: 0,
  relationeel: 0,
  draagkracht: 0,
  creativiteit: 0,
  integratie: 0,
};

const ZERO_VAARDIGHEID: VaardigheidValues = {
  lichamelijkheid: 0,
  betekenis: 0,
  relatie: 0,
  methodisch: 0,
  professioneel: 0,
  positionering: 0,
};

const RUBRIC_MAPPINGS: Record<string, RubricMapping> = {
  basisjaar: {
    themeDefaults: {},
    questionOverrides: {},
  },

  "1vo": {
    themeDefaults: {
      lichaamsbewustzijn: {
        ontwikkel: {
          lichaamsbewustzijn: 1,
        },
        vaardigheid: {
          lichamelijkheid: 1,
        },
      },
      aanraking: {
        ontwikkel: {
          lichaamsbewustzijn: 0.45,
          relationeel: 0.35,
          draagkracht: 0.2,
        },
        vaardigheid: {
          lichamelijkheid: 0.5,
          relatie: 0.35,
          professioneel: 0.15,
        },
      },
      afstemming: {
        ontwikkel: {
          relationeel: 0.7,
          draagkracht: 0.3,
        },
        vaardigheid: {
          relatie: 0.7,
          lichamelijkheid: 0.3,
        },
      },
      grenzen: {
        ontwikkel: {
          draagkracht: 0.6,
          zelfinzicht: 0.15,
          relationeel: 0.25,
        },
        vaardigheid: {
          professioneel: 0.45,
          relatie: 0.35,
          lichamelijkheid: 0.2,
        },
      },
      aanwezigheid: {
        ontwikkel: {
          draagkracht: 0.45,
          lichaamsbewustzijn: 0.25,
          integratie: 0.3,
        },
        vaardigheid: {
          lichamelijkheid: 0.5,
          professioneel: 0.2,
          relatie: 0.3,
        },
      },
      zelfreflectie: {
        ontwikkel: {
          zelfinzicht: 0.65,
          integratie: 0.35,
        },
        vaardigheid: {
          professioneel: 0.45,
          methodisch: 0.55,
        },
      },
      professionele_houding: {
        ontwikkel: {
          zelfinzicht: 0.45,
          draagkracht: 0.2,
          integratie: 0.35,
        },
        vaardigheid: {
          professioneel: 0.7,
          methodisch: 0.2,
          positionering: 0.1,
        },
      },
    },
  },

  "2vo": {
    themeDefaults: {
      c1: {
        ontwikkel: {
          lichaamsbewustzijn: 0.45,
          zelfinzicht: 0.2,
          integratie: 0.35,
        },
        vaardigheid: {
          lichamelijkheid: 0.4,
          betekenis: 0.2,
          methodisch: 0.4,
        },
      },
      c2: {
        ontwikkel: {
          relationeel: 0.2,
          draagkracht: 0.15,
          integratie: 0.65,
        },
        vaardigheid: {
          lichamelijkheid: 0.35,
          relatie: 0.2,
          methodisch: 0.45,
        },
      },
      c3: {
        ontwikkel: {
          relationeel: 0.45,
          draagkracht: 0.15,
          creativiteit: 0.1,
          integratie: 0.3,
        },
        vaardigheid: {
          betekenis: 0.25,
          relatie: 0.45,
          methodisch: 0.3,
        },
      },
      c4: {
        ontwikkel: {
          zelfinzicht: 0.35,
          integratie: 0.65,
        },
        vaardigheid: {
          betekenis: 0.35,
          methodisch: 0.65,
        },
      },
      c5: {
        ontwikkel: {
          relationeel: 0.2,
          draagkracht: 0.25,
          creativiteit: 0.25,
          integratie: 0.3,
        },
        vaardigheid: {
          betekenis: 0.1,
          relatie: 0.2,
          methodisch: 0.7,
        },
      },
      c6: {
        ontwikkel: {
          zelfinzicht: 0.4,
          draagkracht: 0.3,
          integratie: 0.3,
        },
        vaardigheid: {
          professioneel: 0.85,
          relatie: 0.15,
        },
      },
      c7: {
        ontwikkel: {
          creativiteit: 0.7,
          draagkracht: 0.15,
          relationeel: 0.15,
        },
        vaardigheid: {
          betekenis: 0.2,
          methodisch: 0.35,
          professioneel: 0.15,
          positionering: 0.3,
        },
      },
      c8: {
        ontwikkel: {
          integratie: 0.7,
          zelfinzicht: 0.3,
        },
        vaardigheid: {
          betekenis: 0.2,
          methodisch: 0.45,
          professioneel: 0.15,
          positionering: 0.2,
        },
      },
      c9: {
        ontwikkel: {
          zelfinzicht: 0.6,
          integratie: 0.4,
        },
        vaardigheid: {
          professioneel: 0.55,
          methodisch: 0.45,
        },
      },
    },
  },

  "3vo": {
    themeDefaults: {},
    questionOverrides: {},
  },
};

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeKey(input: string | null | undefined) {
  return String(input ?? "").trim().toLowerCase();
}

function normalizeRubricKey(input: string | null | undefined) {
  const key = normalizeKey(input);

  if (key.includes("3vo")) return "3vo";
  if (key.includes("2vo")) return "2vo";
  if (key.includes("1vo")) return "1vo";
  if (key.includes("basis")) return "basisjaar";

  return key;
}

function createAccumulator<K extends string>(keys: readonly K[]): AxisAccumulator<K> {
  return keys.reduce((acc, key) => {
    acc[key] = { total: 0, weight: 0 };
    return acc;
  }, {} as AxisAccumulator<K>);
}

function finalizeAccumulator<K extends string>(
  accumulator: AxisAccumulator<K>,
  fallback: Record<K, number>
): Record<K, number> {
  const output = { ...fallback };

  for (const key of Object.keys(accumulator) as K[]) {
    const entry = accumulator[key];
    output[key] = entry.weight > 0 ? clamp01(entry.total / entry.weight) : 0;
  }

  return output;
}

function normalizeScore(score: number, min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
  return clamp01((score - min) / (max - min));
}

function inferScaleForRubric(rubricKey: string) {
  const normalized = normalizeRubricKey(rubricKey);

  if (normalized === "1vo") {
    return { min: 0, max: 10 };
  }

  return { min: 1, max: 5 };
}

function buildTeacherScoreMap(rows: ProfileAssessmentTeacherScore[] | undefined) {
  const map = new Map<string, number>();

  for (const row of rows ?? []) {
    if (!isFiniteNumber(row.correctedScore)) continue;
    map.set(`${normalizeKey(row.themeId)}__${normalizeKey(row.questionId)}`, row.correctedScore);
  }

  return map;
}

function findMapping(rubricKey: string, themeId: string, questionId: string) {
  const mapping = RUBRIC_MAPPINGS[normalizeRubricKey(rubricKey)];
  if (!mapping) return null;

  const themeKey = normalizeKey(themeId);
  const questionKey = `${themeKey}.${normalizeKey(questionId)}`;

  return mapping.questionOverrides?.[questionKey] ?? mapping.themeDefaults?.[themeKey] ?? null;
}

function applyWeights<K extends string>(
  accumulator: AxisAccumulator<K>,
  weights: AxisWeights<K> | undefined,
  normalizedScore: number
) {
  if (!weights) return;

  for (const [axisKey, axisWeight] of Object.entries(weights) as Array<[K, number | undefined]>) {
    if (!isFiniteNumber(axisWeight) || axisWeight <= 0) continue;
    accumulator[axisKey].total += normalizedScore * axisWeight;
    accumulator[axisKey].weight += axisWeight;
  }
}

export function computeProfiles(params: {
  hasData: boolean;
  moment: ProfileMoment;
  assessments?: ProfileAssessment[];
  rubricKey?: string | null;
}): {
  ontwikkel: OntwikkelValues;
  vaardigheid: VaardigheidValues;
} {
  const { hasData, moment, assessments = [], rubricKey } = params;

  if (!hasData || assessments.length === 0) {
    return {
      ontwikkel: { ...ZERO_ONTWIKKEL },
      vaardigheid: { ...ZERO_VAARDIGHEID },
    };
  }

  const selectedAssessments = assessments.filter((assessment) => {
    if (moment !== "ALL" && assessment.moment !== moment) return false;

    if (rubricKey) {
      return normalizeRubricKey(assessment.rubricKey) === normalizeRubricKey(rubricKey);
    }

    return true;
  });

  if (selectedAssessments.length === 0) {
    return {
      ontwikkel: { ...ZERO_ONTWIKKEL },
      vaardigheid: { ...ZERO_VAARDIGHEID },
    };
  }

  const ontwikkelAccumulator = createAccumulator(Object.keys(ZERO_ONTWIKKEL) as OntwikkelKey[]);
  const vaardigheidAccumulator = createAccumulator(Object.keys(ZERO_VAARDIGHEID) as VaardigheidKey[]);

  for (const assessment of selectedAssessments) {
    const scale = inferScaleForRubric(assessment.rubricKey);
    const teacherScoreMap = buildTeacherScoreMap(assessment.teacherScores);

    for (const row of assessment.scores ?? []) {
      if (!isFiniteNumber(row.score)) continue;

      const scoreKey = `${normalizeKey(row.themeId)}__${normalizeKey(row.questionId)}`;
      const effectiveScore = teacherScoreMap.get(scoreKey) ?? row.score;
      const normalizedScore = normalizeScore(effectiveScore, scale.min, scale.max);
      const mapping = findMapping(assessment.rubricKey, row.themeId, row.questionId);

      if (!mapping) continue;

      applyWeights(ontwikkelAccumulator, mapping.ontwikkel, normalizedScore);
      applyWeights(vaardigheidAccumulator, mapping.vaardigheid, normalizedScore);
    }
  }

  return {
    ontwikkel: finalizeAccumulator(ontwikkelAccumulator, ZERO_ONTWIKKEL),
    vaardigheid: finalizeAccumulator(vaardigheidAccumulator, ZERO_VAARDIGHEID),
  };
}