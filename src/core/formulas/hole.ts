// Hole formulas. Status per docs/FORMULAS.md: all TODO (unverified).

export const VILLAGER_NAMES = ['Explore', 'Engineer', 'Bonuses', 'Measure', 'Studies'] as const;

/** HO-01 (TODO): EXP needed for the next level of villager `index`. */
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
