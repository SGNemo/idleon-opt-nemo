// Minehead formulas. Status per docs/FORMULAS.md: all TODO (unverified).

/** MH-01 (TODO): upper bound of the upgrade cost. The real cost is multiplied by factors <= 1
 *  (cost-reduction upgrade QTY(26), sushi discount, floor 0.1), which this bound ignores. */
export const mineheadUpgradeCostUpperBound = (index: number, level: number, costExponent: number, mineCost: number): number => {
  const base = (5 + index + Math.pow(Math.max(0, index - 2), 1.3)) * Math.pow(2, Math.max(0, index - 4)) * Math.pow(mineCost, Math.max(0, index - 9));
  return base * Math.pow(costExponent, level);
};

/** MH-03 (TODO): opponent max HP. */
export const mineheadOpponentHp = (t: number, mineHp: number): number =>
  (5 + 2 * t + t * t) *
  Math.pow(1.8, t) *
  Math.pow(1.85, Math.floor(Math.max(0, t - 4) / 3)) *
  Math.pow(4, Math.floor(Math.max(0, t - 5) / 7)) *
  Math.pow(mineHp, Math.max(0, t - 9));
