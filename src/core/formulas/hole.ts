// Hole formulas. Status per docs/FORMULAS.md.

export const VILLAGER_NAMES = ['Explore', 'Engineer', 'Bonuses', 'Measure', 'Studies'] as const;

/**
 * HO-01: EXP needed for the next level of villager `index`.
 * Verified for index 4 only (Studies Lv 245 levelable with 3.35e19 EXP, requirement 3.23e19, Lv 246 would need 3.66e19);
 * indices 0-3 are source-only. The source wraps the 3.4^ term in a constant that evaluates to 1, so it is dropped here.
 */
export const villagerExpReq = (level: number, index: number): number => {
  switch (index) {
    case 0:
      return level === 1
        ? 5
        : 10 * (-1.5 + (10 + 7 * Math.pow(level, 2.1)) * Math.pow(2.1, level) * (1 + 0.75 * Math.max(0, level - 4)) * Math.pow(3.4, Math.max(0, level - 12)));
    case 1:
      return 30 * (10 + 6 * Math.pow(level, 1.8)) * Math.pow(1.57, level);
    case 2:
      return 50 * (10 + 5 * Math.pow(level, 1.7)) * Math.pow(1.4, level);
    case 3:
      return 120 * (30 + 10 * Math.pow(level, 2)) * Math.pow(2, level);
    case 4:
      return 500 * (10 + 5 * Math.pow(level, 1.3)) * Math.pow(1.13, level);
    default:
      return 10 * Math.pow(10, 20);
  }
};

/** HO-05 (TODO): progress needed for the next level of study `t`. */
export const studyReq = (studyLevel: number, t: number): number => 4e3 * Math.pow(1.25, studyLevel) * Math.pow(1.5, Math.floor(t / 5));

/**
 * HO-14 (TODO): Lamp wish cost at `wishLevel` (game "LampWishCost").
 * Wish 0 is capped at level 10 (then 999999), wish 2 has its own curve, all others are linear from the data (`x1`, `x2`).
 */
export const lampWishCost = (wishLevel: number, t: number, x1: number, x2: number): number => {
  if (t === 0) return wishLevel < 11 ? Math.floor(1 + 2 * wishLevel + wishLevel * wishLevel) : 999999;
  if (t === 2) return Math.floor(1 + 2 * wishLevel + Math.pow(wishLevel, 1.7));
  return Math.floor(wishLevel * x2 + x1);
};

/** HO-15 (TODO): cost of the next jar type; `n` = jar types already unlocked. */
export const newJarCost = (n: number): number => 50 * Math.pow(1 + n, 1.5) * Math.pow(4.8, n);

/** HO-16: blinding lanterns usable per day (cap lives in game code, counter in the save). */
export const BLINDING_LANTERNS_PER_DAY = 12;

/** HO-13: layers destroyed in total = Holes[11][1]+[3]+[5]+[7]. */
export const totalLayersDestroyed = (perCavern: number[]): number => perCavern.reduce((a, b) => a + Math.max(0, Math.round(b)), 0);
