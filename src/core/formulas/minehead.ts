// Minehead formulas. Status per docs/FORMULAS.md: all TODO (unverified).

/** MH-01: Minehead upgrade cost (no Menagerie doubler on upgrade 26 considered).
 *  cost = base(i) * exp^level / (1 + QTY26/100) * max(0.1, 1 - max(sushi 1, sushi 16)/100)
 *  Checked in game: Base Damage I Lv 159 = 9.54M (see docs/FORMULAS.md). */
export const mineheadUpgradeCost = (o: {
  index: number;
  level: number;
  costExponent: number;
  mineCost: number;
  /** QTY(26): effect of the cost-reduction upgrade. */
  costReductionQty: number;
  /** max(sushi bonus 1, sushi bonus 16), in percent. */
  sushiDiscountPct: number;
}): number => {
  const i = o.index;
  const base = (5 + i + Math.pow(Math.max(0, i - 2), 1.3)) * Math.pow(2, Math.max(0, i - 4)) * Math.pow(o.mineCost, Math.max(0, i - 9));
  return base * (1 / (1 + o.costReductionQty / 100)) * Math.pow(o.costExponent, o.level) * Math.max(0.1, 1 - o.sushiDiscountPct / 100);
};

/** MH-03 (TODO): opponent max HP. */
export const mineheadOpponentHp = (t: number, mineHp: number): number =>
  (5 + 2 * t + t * t) *
  Math.pow(1.8, t) *
  Math.pow(1.85, Math.floor(Math.max(0, t - 4) / 3)) *
  Math.pow(4, Math.floor(Math.max(0, t - 5) / 7)) *
  Math.pow(mineHp, Math.max(0, t - 9));
