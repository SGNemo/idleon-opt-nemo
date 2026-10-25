import { MenagerieData } from '../../data/schemas';

/** MenagerieStuff:Cost type 0 (mission): requirement grows by `increment` per claim. */
export const missionRequirement = (baseReq: number, increment: number, claims: number): number => Math.floor(baseReq + increment * claims);

/** MenagerieStuff:Cost type 2 (boost) at a given level. */
export const boostCostAtLevel = (data: MenagerieData, index: number, level: number): number => {
  const group = data.costExponentGroups.find((g) => g.indices.includes(index));
  const exponent = group?.exponent ?? data.costExponentOtherwise;
  return 3 * level + Math.pow(level, 1.5) + (5 + Math.pow(index, 1.5)) * Math.pow(Math.max(1.45, 2.25 + (index / 4) * -0.15), index) * Math.pow(exponent, level);
};

/** MenagerieStuff:Cost type 1 (unlock). */
export const unlockCost = (index: number): number => (10 + index * index) * Math.pow(Math.max(1.6, 2.5 + (index / 4) * -0.15), index);

/** Boosts shown: MenagerieStuff:UpgUnlocked type 2. */
export const visibleBoosts = (rank: number): number => Math.round(Math.min(6, rank) + Math.floor(Math.max(0, rank - 6) / 2));
