/** Что нужно знать о ткани для оценки совместимости. */
export interface FabricTraits {
  id: string;
  name: string;
  weight_class: string;
  shrinkage_percent: number;
  requires_decatizing: boolean;
  difficulty_to_work_with: string;
  recommended_edge_finish: string[];
}

/** Что нужно знать о проекте для оценки совместимости. */
export interface ProjectNeeds {
  difficulty: string;
  recommended_fabrics: string[];
  recommended_weight_classes: string[];
  required_seams: string[];
}

export type CompatVerdict = "fits" | "with_caveats" | "poor";

export interface CompatResult {
  fabricId: string;
  fabricName: string;
  /** Оценка 0–100: чем выше, тем лучше ткань подходит проекту. */
  score: number;
  verdict: CompatVerdict;
  /** Что говорит в пользу ткани. */
  pros: string[];
  /** На что обратить внимание. */
  warnings: string[];
}

const WEIGHT_ORDER = ["light", "medium", "heavy", "very_heavy"];
const WEIGHT_LABELS: Record<string, string> = {
  light: "лёгкая",
  medium: "средняя",
  heavy: "тяжёлая",
  very_heavy: "очень тяжёлая",
};

const DIFFICULTY_RANK: Record<string, number> = {
  beginner: 0,
  easy: 0,
  intermediate: 1,
  medium: 1,
  advanced: 2,
  hard: 2,
};

/** Усадка выше этого порога требует предварительной стирки или декатировки. */
const SHRINKAGE_WARN_PERCENT = 5;

const SCORE_RECOMMENDED = 40;
const SCORE_WEIGHT = 30;
const SCORE_WEIGHT_NEAR = 10;
const SCORE_SEAMS = 15;
const SCORE_DIFFICULTY = 10;
const SCORE_SHRINKAGE = 5;

function weightLabel(weightClass: string): string {
  return WEIGHT_LABELS[weightClass] ?? weightClass;
}

function verdictFor(score: number): CompatVerdict {
  if (score >= 75) return "fits";
  if (score >= 50) return "with_caveats";
  return "poor";
}

/**
 * Оценивает, насколько ткань подходит проекту.
 *
 * Баллы: есть в рекомендациях проекта (40), вес в рекомендованных классах (30,
 * соседний класс — 10), швы проекта среди подходящих для ткани (до 15),
 * сложность ткани не выше сложности проекта (10), небольшая усадка (5).
 * Растяжимость отдельно не считается: у проекта нет такого поля, её
 * косвенно отражает пересечение швов.
 */
export function scoreFabricForProject(project: ProjectNeeds, fabric: FabricTraits): CompatResult {
  const pros: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  if (project.recommended_fabrics.includes(fabric.id)) {
    score += SCORE_RECOMMENDED;
    pros.push("Ткань есть в рекомендациях проекта");
  } else {
    warnings.push("Ткани нет в списке рекомендованных для проекта");
  }

  const weight = WEIGHT_ORDER.indexOf(fabric.weight_class);
  if (project.recommended_weight_classes.includes(fabric.weight_class)) {
    score += SCORE_WEIGHT;
    pros.push(`Вес подходит: ${weightLabel(fabric.weight_class)}`);
  } else {
    const distances = project.recommended_weight_classes
      .map((w) => WEIGHT_ORDER.indexOf(w))
      .filter((i) => i >= 0 && weight >= 0)
      .map((i) => Math.abs(i - weight));
    const wantedText = project.recommended_weight_classes.map(weightLabel).join(", ");
    if (distances.length > 0 && Math.min(...distances) === 1) {
      score += SCORE_WEIGHT_NEAR;
      warnings.push(
        `Вес (${weightLabel(fabric.weight_class)}) рядом с рекомендованным (${wantedText}), но не совпадает`
      );
    } else {
      warnings.push(`Вес (${weightLabel(fabric.weight_class)}) не подходит, нужен: ${wantedText}`);
    }
  }

  const required = project.required_seams;
  if (required.length === 0) {
    score += SCORE_SEAMS;
  } else {
    const covered = required.filter((s) => fabric.recommended_edge_finish.includes(s)).length;
    score += Math.round((SCORE_SEAMS * covered) / required.length);
    if (covered === required.length) {
      pros.push("Все швы проекта подходят для этой ткани");
    } else {
      warnings.push(`Швов проекта, подходящих для ткани: ${covered} из ${required.length}`);
    }
  }

  const fabricRank = DIFFICULTY_RANK[fabric.difficulty_to_work_with];
  const projectRank = DIFFICULTY_RANK[project.difficulty];
  if (fabricRank !== undefined && projectRank !== undefined && fabricRank > projectRank) {
    warnings.push("Ткань сложнее в работе, чем сам проект");
  } else {
    score += SCORE_DIFFICULTY;
  }

  if (fabric.shrinkage_percent > SHRINKAGE_WARN_PERCENT || fabric.requires_decatizing) {
    warnings.push(
      fabric.requires_decatizing
        ? `Перед раскроем нужна декатировка, усадка ${fabric.shrinkage_percent}%`
        : `Усадка ${fabric.shrinkage_percent}% — ткань лучше постирать до раскроя`
    );
  } else {
    score += SCORE_SHRINKAGE;
  }

  return {
    fabricId: fabric.id,
    fabricName: fabric.name,
    score,
    verdict: verdictFor(score),
    pros,
    warnings,
  };
}

/** Оценивает все ткани для проекта: лучшие сверху, при равенстве — по названию. */
export function rankFabricsForProject(
  project: ProjectNeeds,
  fabrics: FabricTraits[]
): CompatResult[] {
  return fabrics
    .map((fabric) => scoreFabricForProject(project, fabric))
    .sort((a, b) => b.score - a.score || a.fabricName.localeCompare(b.fabricName, "ru"));
}

export interface EstimateMetersInput {
  /** Метраж по выкройке для ткани шириной referenceWidthCm. */
  baseMeters: number;
  /** Ширина выбранного рулона, см. */
  widthCm: number;
  /** Ширина, для которой посчитан baseMeters, см. По умолчанию 150. */
  referenceWidthCm?: number;
  shrinkagePercent: number;
}

/**
 * Пересчитывает метраж под ширину рулона и усадку ткани.
 * Результат округляется вверх до 10 см, как режут в магазине.
 */
export function estimateMeters({
  baseMeters,
  widthCm,
  referenceWidthCm = 150,
  shrinkagePercent,
}: EstimateMetersInput): number {
  if (![baseMeters, widthCm, referenceWidthCm].every((n) => Number.isFinite(n) && n > 0)) {
    throw new RangeError("Метраж и ширина ткани должны быть положительными числами");
  }
  if (!Number.isFinite(shrinkagePercent) || shrinkagePercent < 0) {
    throw new RangeError("Усадка не может быть отрицательной");
  }
  const meters = baseMeters * (referenceWidthCm / widthCm) * (1 + shrinkagePercent / 100);
  return Math.ceil(meters * 10 - 1e-9) / 10;
}
