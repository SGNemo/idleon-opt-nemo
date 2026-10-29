import { Account } from '../model/account';
import { lampWishCost, newJarCost, studyReq, villagerExpReq, VILLAGER_NAMES } from './hole';

export interface LampWishData {
  name: string;
  x1: number;
  x2: number;
}

export interface InvestOption {
  kind: 'villager-level' | 'study-level' | 'lamp-wish' | 'opals';
  label: string;
  note: string;
  /** Lower = do first. 0 = free action that is ready now, 1 = affordable now, 2 = heuristic advice. */
  tier: 0 | 1 | 2;
}

const clean = (s: string) => s.replace(/_/g, ' ');

/**
 * "What to invest next" in Hole (status todo-formula: ordering heuristic, no rates).
 *  tier 0: villager/study can level up right now (costs nothing, only a click)
 *  tier 1: Lamp wishes that the available wishes pay for, cheapest first
 *  tier 2: opals go to the unlocked villager with the longest estimated wait; the estimate uses
 *          remaining EXP / (opals * (1 + gem shop)) and ignores the per-villager multipliers (HO-02 not complete)
 */
export function rankHoleInvestments(hole: Account['hole'], wishes: LampWishData[]): InvestOption[] {
  const out: InvestOption[] = [];

  VILLAGER_NAMES.forEach((name, i) => {
    const level = hole.villagerLevels[i] ?? 0;
    if (level >= 1 && (hole.villagerExp[i] ?? 0) >= villagerExpReq(level, i)) {
      out.push({ kind: 'villager-level', label: `${name} Lv ${level}`, note: 'EXP reicht für das nächste Level', tier: 0 });
    }
  });

  hole.studyLevels.forEach((lvl, t) => {
    const progress = hole.studyProgress[t] ?? 0;
    if (progress >= studyReq(lvl, t)) out.push({ kind: 'study-level', label: `Study ${t} Lv ${lvl}`, note: 'Fortschritt reicht für das nächste Level', tier: 0 });
  });

  wishes
    .map((w, t) => ({ w, t, cost: lampWishCost(hole.wishLevels[t] ?? 0, t, w.x1, w.x2) }))
    .filter(({ cost }) => cost <= hole.wishesAvailable)
    .sort((a, b) => a.cost - b.cost)
    .forEach(({ w, cost }) => out.push({ kind: 'lamp-wish', label: clean(w.name), note: `kostet ${cost} von ${hole.wishesAvailable} Wünschen`, tier: 1 }));

  const wait = VILLAGER_NAMES.map((name, i) => {
    const level = hole.villagerLevels[i] ?? 0;
    const opals = hole.opalsInvested[i] ?? 0;
    const remaining = Math.max(0, villagerExpReq(level, i) - (hole.villagerExp[i] ?? 0));
    return { name, level, wait: level >= 1 && opals > 0 ? remaining / (opals * (1 + (hole.gemShopLevels[i] ?? 0))) : Infinity, unlocked: level >= 1 };
  }).filter((v) => v.unlocked && v.wait > 0);
  const slowest = wait.sort((a, b) => b.wait - a.wait)[0];
  if (slowest) out.push({ kind: 'opals', label: `Opals -> ${slowest.name}`, note: 'längste geschätzte Wartezeit bis zum Level-Up (Heuristik)', tier: 2 });

  return out.sort((a, b) => a.tier - b.tier);
}

export { newJarCost };
