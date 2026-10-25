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

// ---------------------------------------------------------------------------
// Time-to-target planner: damage upgrades get closer to the boss, income upgrades (Miney Farmey I/II,
// Miney Damagey Synergy) pay back and shorten the waiting time. MH-08 income term (TODO):
//   income ~ 1 + (QTY(5) + QTY(22) + QTY(28) * log10(bestHit) + offset) / 100
// ---------------------------------------------------------------------------
export const INCOME_UPGRADES = [5, 22, 28];

export interface TimePlanInput extends OptimizerInput {
  incomePerHour: number;
  incomeOffset: number;
  bestHit: number;
}

export interface TimeStep extends OptimizerStep {
  kind: 'damage' | 'income';
  /** hours waited before this purchase became affordable */
  waitHours: number;
  hoursTotal: number;
}

export function planTimeToTarget(input: TimePlanInput, maxSteps = 4000) {
  const levels = [...input.levels];
  const ups = input.upgrades;
  const byIndex = (i: number) => ups.find((u) => u.index === i);
  const incomeEff = (u: OptimizerUpgrade) =>
    u.index === 28 ? u.effectPerLevel * Math.log10(Math.max(1, input.bestHit)) : u.effectPerLevel * (input.doublers[u.index] ?? 1);
  const incomeTerm = () => input.incomeOffset + INCOME_UPGRADES.reduce((a, i) => { const u = byIndex(i); return a + (u ? (levels[i] ?? 0) * incomeEff(u) : 0); }, 0);
  const income0Term = incomeTerm();
  const incomeNow = () => input.incomePerHour * (1 + incomeTerm() / 100) / (1 + income0Term / 100);
  const dmg = () => { const t = terms(levels, ups, input.doublers, input.baseOffset); return t.base * t.mega; };
  const dmg0 = dmg();
  const costOf = (u: OptimizerUpgrade) =>
    mineheadUpgradeCost({ index: u.index, level: levels[u.index] ?? 0, costExponent: u.costExponent, mineCost: input.mineCost, costReductionQty: input.costReductionQty, sushiDiscountPct: input.sushiDiscountPct });
  const open = (u: OptimizerUpgrade) => (levels[u.index] ?? 0) < u.maxLevel;

  let wallet = input.currency;
  let hours = 0;
  const steps: TimeStep[] = [];
  const damageUps = ups.filter((u) => (BASE_UPGRADES.includes(u.index) || MEGA_UPGRADES.includes(u.index)) && open(u));
  const incomeUps = ups.filter((u) => INCOME_UPGRADES.includes(u.index) && open(u));

  // damage-only completion cost, used to decide whether an income upgrade can still pay back in time
  const remainingDamageHours = (): number => {
    const sim = planMineheadPurchases({ ...input, levels: [...levels], currency: 1e30, targetMultiplier: input.targetMultiplier / (dmg() / dmg0) }, 2000);
    const cost = sim.steps.reduce((a, s) => a + s.cost, 0);
    return Math.max(0, cost - wallet) / incomeNow();
  };

  for (let n = 0; n < maxSteps && dmg() / dmg0 < input.targetMultiplier; n++) {
    const horizon = remainingDamageHours();
    let pick: { u: OptimizerUpgrade; cost: number; kind: 'damage' | 'income' } | null = null;
    // income candidate with the shortest payback that still pays back before the horizon
    let bestPayback = Infinity;
    for (const u of incomeUps) {
      if (!open(u)) continue;
      const cost = costOf(u);
      const before = incomeNow();
      levels[u.index] = (levels[u.index] ?? 0) + 1;
      const delta = incomeNow() - before;
      levels[u.index] -= 1;
      const payback = delta > 0 ? cost / delta : Infinity;
      if (payback < bestPayback) { bestPayback = payback; pick = { u, cost, kind: 'income' }; }
    }
    if (!pick || bestPayback >= horizon) {
      // best damage gain per cost
      let bestScore = -1;
      pick = null;
      const cur = dmg();
      for (const u of damageUps) {
        if (!open(u)) continue;
        const cost = costOf(u);
        levels[u.index] = (levels[u.index] ?? 0) + 1;
        const score = (dmg() / cur - 1) / cost;
        levels[u.index] -= 1;
        if (score > bestScore) { bestScore = score; pick = { u, cost, kind: 'damage' }; }
      }
    }
    if (!pick) break;
    let wait = 0;
    if (pick.cost > wallet) { wait = (pick.cost - wallet) / incomeNow(); hours += wait; wallet = pick.cost; }
    const from = levels[pick.u.index] ?? 0;
    levels[pick.u.index] = from + 1;
    wallet -= pick.cost;
    const last = steps[steps.length - 1];
    if (last && last.index === pick.u.index && last.levelTo === from && wait === 0) {
      last.levelTo = from + 1; last.cost += pick.cost; last.damageMultiplierAfter = dmg() / dmg0; last.hoursTotal = hours;
    } else {
      steps.push({ index: pick.u.index, name: pick.u.name, levelFrom: from, levelTo: from + 1, cost: pick.cost, damageMultiplierAfter: dmg() / dmg0, kind: pick.kind, waitHours: wait, hoursTotal: hours });
    }
  }
  return { steps, hoursTotal: hours, reached: dmg() / dmg0 >= input.targetMultiplier, multiplier: dmg() / dmg0 };
}
