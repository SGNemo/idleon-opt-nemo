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
