import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../data/load-node';
import { planMineheadPurchases } from './minehead-optimizer';

const d = loadGameData(143);
const ups = d.minehead.upgrades.map((u) => ({ index: u.index, name: u.name, effectPerLevel: u.effectPerLevel, maxLevel: u.maxLevel, costExponent: u.costExponent }));
const levels = Array.from({ length: 30 }, () => 0);
levels[0] = 160; levels[4] = 153; levels[7] = 132; levels[21] = 6;

describe('minehead optimizer (model MH-07, unverified)', () => {
  const base = { upgrades: ups, levels, doublers: { 0: 2, 4: 2, 7: 2 }, mineCost: 1.31, costReductionQty: 0, sushiDiscountPct: 50, targetMultiplier: 1.29 };
  it('never spends more than the budget and only increases damage', () => {
    const r = planMineheadPurchases({ ...base, currency: 1.76e9 });
    const spent = r.steps.reduce((a, s) => a + s.cost, 0);
    expect(spent).toBeLessThanOrEqual(1.76e9);
    expect(r.multiplier).toBeGreaterThan(1);
    expect(r.budgetLeft).toBeCloseTo(1.76e9 - spent, -3);
  });
  it('buys nothing with an empty wallet', () => {
    expect(planMineheadPurchases({ ...base, currency: 0 }).steps).toHaveLength(0);
  });
});

import { planTimeToTarget } from './minehead-optimizer';

describe('time-to-target planner', () => {
  const lv = Array.from({ length: 30 }, () => 0);
  lv[0] = 160; lv[4] = 153; lv[5] = 152; lv[7] = 136; lv[21] = 6;
  const common = { upgrades: ups, levels: lv, baseOffset: 655, currency: 1.69e9, mineCost: 1.31, costReductionQty: 0, sushiDiscountPct: 50, targetMultiplier: 1.29, incomePerHour: 62_194_730, incomeOffset: 0, bestHit: 1.7e10 };
  const baseline = { 0: 2, 4: 2, 7: 2 };
  it('a doubler on the income upgrade shortens the time to the target', () => {
    const without = planTimeToTarget({ ...common, doublers: baseline, baselineDoublers: baseline });
    const withIncome = planTimeToTarget({ ...common, doublers: { ...baseline, 5: 2 }, baselineDoublers: baseline });
    expect(withIncome.hoursTotal).toBeLessThan(without.hoursTotal * 0.7);
  });
});
