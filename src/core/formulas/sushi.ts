// Sushi station formulas needed elsewhere. Source: Toolbox sushiStation.ts "RoG_BonusQTY" / "MaxTier".

/** Number of consecutively discovered sushi types (stops at the first undiscovered one, capped at maxTier + 1). */
export const uniqueSushiCount = (tracking: number[], maxTier: number): number => {
  let count = 0;
  for (let i = 0; i <= maxTier; i++) {
    if ((tracking[i] ?? -1) >= 0) count = i + 1;
    else break;
  }
  return count;
};

/** "Rest of game" bonus `index`: its value once more than `index` unique sushi are known, else 0. */
export const sushiRestOfGameBonus = (uniqueSushi: number, values: number[], index: number): number =>
  uniqueSushi > index ? values[index] ?? 0 : 0;

/** Knowledge bonus of one sushi type ("Sushi knowledge", Toolbox getKnowledgeBonusSpecific); a perfected sushi (tracking >= 1) counts twice. */
export const sushiKnowledgeBonus = (p: { categoryValue: number; knowledgeLevel: number; tracking: number; tier: number }): number =>
  Math.max(0, p.categoryValue * p.knowledgeLevel * Math.min(2, 1 + p.tracking) * (1 + p.tier / 30));

/** Total knowledge bonus per category (sum over all tiers up to `maxTier`). Categories beyond the table's length count as 0 like in the source. */
export const sushiKnowledgeTotals = (p: {
  categories: number[];
  values: number[];
  levels: number[];
  tracking: number[];
  maxTier: number;
}): number[] => {
  const totals = new Array<number>(Math.max(p.values.length, 11)).fill(0);
  for (let tier = 0; tier <= p.maxTier; tier++) {
    const cat = p.categories[tier] ?? 0;
    totals[cat] += sushiKnowledgeBonus({ categoryValue: p.values[cat] ?? 0, knowledgeLevel: p.levels[tier] ?? 0, tracking: p.tracking[tier] ?? 0, tier });
  }
  return totals;
};

/** Chance to cook sushi `tier` as a perfect one ("perfectOdds"); `knowledgeCat10` = knowledge category 10 total in %. */
export const sushiPerfectOdds = (tier: number, knowledgeCat10: number): number =>
  ((0.6 * Math.pow(0.81, tier)) / (1 + tier / 8)) * (1 + knowledgeCat10 / 100);

/**
 * Station upgrade cost at its current level (Toolbox "UpgCost"). `position` = index of the upgrade in the on-screen order.
 * Discounts the save cannot give us (Jelly Operator 18, a Menagerie doubler on Wholesale Pricing) are left out,
 * so the result is an upper bound of the real cost.
 */
export const sushiUpgradeCost = (p: {
  position: number;
  level: number;
  costFactor: number;
  costExponent: number;
  /** Wholesale Pricing (upgrade 36) effect in %, i.e. level * bonusPerLevel. */
  wholesalePct: number;
  /** max(rest-of-game 26, 44) in %. */
  restOfGamePct: number;
  /** Knowledge category 6 total in %. */
  knowledgeDiscountPct: number;
}): number => {
  const v = p.position;
  return (
    Math.max(0.1, p.costFactor || 1) *
    (5 + v + Math.pow(Math.max(0, v - 1), 2)) *
    Math.pow(1.5 + Math.max(0, v - 3) / 16, Math.max(0, v - 4)) *
    Math.pow(1.3, Math.max(0, v - 20)) *
    (1 / (1 + p.wholesalePct / 100)) *
    Math.max(0.1, 1 - p.restOfGamePct / 100) *
    (1 / (1 + p.knowledgeDiscountPct / 100)) *
    Math.pow(p.costExponent, p.level)
  );
};
