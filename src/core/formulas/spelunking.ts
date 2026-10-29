// Spelunking (World 7) formulas. Source: Toolbox parsers/world-7/spelunking.ts "getSpelunkingUpgradeCost" / "getSpelunkingCostDiscount".

/** Table index from which the shop multiplies the base cost by 1e7, and from which by a further 1e9. */
const COST_TIER_1 = 52;
const COST_TIER_2 = 66;

/** Marker for "no level cap" in the upgrade table. */
export const SPELUNKING_UNCAPPED = 99999;

/**
 * Amber cost of the next level of shop upgrade `index`. `discount` is the product of the cost reductions
 * (meal, sushi, jelly, royal guardian); the caller passes only the ones it knows, so with an incomplete
 * discount the result is an upper bound.
 */
export const spelunkingUpgradeCost = (p: {
  index: number;
  level: number;
  costBase: number;
  costGrowth: number;
  column: number;
  row: number;
  discount: number;
}): number => {
  let base = p.discount * (10 + p.level) * p.costBase * Math.pow(9.5, p.column) * Math.pow(6.3, p.row);
  if (p.index >= COST_TIER_1) base *= 1e7;
  if (p.index >= COST_TIER_2) base *= 1e9;
  return 0.25 * base * Math.pow(p.costGrowth, p.level) + Math.pow(p.level, 2) + 5 * p.level;
};

/** Sushi part of the shop discount: `max(1 - max(rog6, rog27) / 100, 0.1)` (Jelly 22 not included). */
export const spelunkingSushiDiscount = (rog6: number, rog27: number): number => Math.max(0.1, 1 - Math.max(rog6, rog27) / 100);
