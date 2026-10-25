import { mineheadUpgradeCost } from './minehead';

/**
 * Damage model for ranking Minehead purchases (derived from MH-07, status TODO):
 *   damage ~ (1 + sum(base upgrades)) * (1 + sum(mega upgrades) / 100) * constant
 * All other MH-07 factors (grid, nomenclature, ...) are constant while buying upgrades and cancel in ratios,
 * so only the relative gain of one purchase is computed, never the absolute damage.
 * Doublers (Menagerie) are inputs; only 0 and 4 are observed (x2), the rest defaults to 1 and is unverified.
 */
export const BASE_UPGRADES = [0, 7, 25];
export const MEGA_UPGRADES = [4, 21, 27];

export interface OptimizerUpgrade {
  index: number;
  name: string;
  effectPerLevel: number;
  maxLevel: number;
  costExponent: number;
}

export interface OptimizerInput {
  upgrades: OptimizerUpgrade[];
  levels: number[];
  doublers: Record<number, number>;
  /** additive base-damage term not coming from upgrades (calibrated, see FORMULAS.md MH-07) */
  baseOffset?: number;
  currency: number;
  mineCost: number;
  costReductionQty: number;
  sushiDiscountPct: number;
  /** damage multiplier needed to beat the target opponent */
  targetMultiplier: number;
}

export interface OptimizerStep {
  index: number;
  name: string;
  levelFrom: number;
  levelTo: number;
  cost: number;
  damageMultiplierAfter: number;
}

function terms(levels: number[], ups: OptimizerUpgrade[], doublers: Record<number, number>, baseOffset = 0) {
  const sum = (idxs: number[]) =>
    idxs.reduce((acc, i) => {
      const u = ups.find((x) => x.index === i);
      return acc + (u ? (levels[i] ?? 0) * u.effectPerLevel * (doublers[i] ?? 1) : 0);
    }, 0);
  return { base: 1 + baseOffset + sum(BASE_UPGRADES), mega: 1 + sum(MEGA_UPGRADES) / 100 };
}

/** Greedy plan: repeatedly buy the damage upgrade level with the best relative gain per currency. */
export function planMineheadPurchases(input: OptimizerInput, maxSteps = 5000) {
  const levels = [...input.levels];
  const t0 = terms(levels, input.upgrades, input.doublers, input.baseOffset);
  const start = t0.base * t0.mega;
  let budget = input.currency;
  const steps: OptimizerStep[] = [];
  const ups = input.upgrades.filter((u) => BASE_UPGRADES.includes(u.index) || MEGA_UPGRADES.includes(u.index));
  const costOf = (u: OptimizerUpgrade) =>
    mineheadUpgradeCost({
      index: u.index,
      level: levels[u.index] ?? 0,
      costExponent: u.costExponent,
      mineCost: input.mineCost,
      costReductionQty: input.costReductionQty,
      sushiDiscountPct: input.sushiDiscountPct,
    });
  let multiplier = 1;
  for (let n = 0; n < maxSteps && multiplier < input.targetMultiplier; n++) {
    const cur = terms(levels, input.upgrades, input.doublers, input.baseOffset);
    let best: { u: OptimizerUpgrade; cost: number; score: number } | null = null;
    for (const u of ups) {
      if ((levels[u.index] ?? 0) >= u.maxLevel) continue;
      const cost = costOf(u);
      if (!(cost > 0) || cost > budget) continue;
      levels[u.index] = (levels[u.index] ?? 0) + 1;
      const next = terms(levels, input.upgrades, input.doublers, input.baseOffset);
      levels[u.index] -= 1;
      const gain = (next.base * next.mega) / (cur.base * cur.mega) - 1;
      const score = gain / cost;
      if (!best || score > best.score) best = { u, cost, score };
    }
    if (!best) break;
    const from = levels[best.u.index] ?? 0;
    levels[best.u.index] = from + 1;
    budget -= best.cost;
    const after = terms(levels, input.upgrades, input.doublers, input.baseOffset);
    multiplier = (after.base * after.mega) / start;
    const last = steps[steps.length - 1];
    if (last && last.index === best.u.index && last.levelTo === from) {
      last.levelTo = from + 1;
      last.cost += best.cost;
      last.damageMultiplierAfter = multiplier;
    } else {
      steps.push({ index: best.u.index, name: best.u.name, levelFrom: from, levelTo: from + 1, cost: best.cost, damageMultiplierAfter: multiplier });
    }
  }
  return { steps, reached: multiplier >= input.targetMultiplier, multiplier, budgetLeft: budget };
}
