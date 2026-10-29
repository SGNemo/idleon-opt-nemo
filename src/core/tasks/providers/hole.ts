import type { FactProvider } from './index';
import { lampWishCost, newJarCost, studyReq, totalLayersDestroyed, BLINDING_LANTERNS_PER_DAY } from '../../formulas/hole';
import { LampWishData, rankHoleInvestments } from '../../formulas/hole-optimizer';

const wishesOf = (raw: unknown[]): LampWishData[] =>
  raw.map((w) => {
    const o = (w ?? {}) as Record<string, unknown>;
    return { name: String(o['name'] ?? ''), x1: Number(o['x1'] ?? 0), x2: Number(o['x2'] ?? 0) };
  });

/** Hole facts: studies, lamp wishes, layers, jars, "invest next" list (see docs/FORMULAS.md HO-*). */
export const holeProvider: FactProvider = (account, data, facts) => {
  const h = account.hole;
  const out = { ...facts };

  const readyStudies = h.studyLevels.map((lvl, t) => ({ lvl, t })).filter(({ lvl, t }) => (h.studyProgress[t] ?? 0) >= studyReq(lvl, t));
  out['hole.studiesReadyCount'] = readyStudies.length;
  out['hole.studiesReady'] = readyStudies.map(({ lvl, t }) => `Study ${t} (Lv ${lvl})`);

  const wishes = wishesOf(data.hole.lampWishes);
  const affordable = wishes.filter((w, t) => lampWishCost(h.wishLevels[t] ?? 0, t, w.x1, w.x2) <= h.wishesAvailable);
  out['hole.wishesAvailable'] = h.wishesAvailable;
  out['hole.wishesAffordableCount'] = affordable.length;
  out['hole.wishesAffordable'] = affordable.map((w) => w.name.replace(/_/g, ' '));

  out['hole.layersDestroyed'] = totalLayersDestroyed(h.layersDestroyed);
  out['hole.lanternsLeft'] = Math.max(0, BLINDING_LANTERNS_PER_DAY - Math.min(BLINDING_LANTERNS_PER_DAY, h.blindingLanternsUsed));

  out['hole.jarsFound'] = h.jarCollectibleLevels.filter((l) => l >= 1).length;
  out['hole.newJarCost'] = newJarCost(h.jarTypesUnlocked);

  const invest = rankHoleInvestments(h, wishes);
  out['hole.investCount'] = invest.length;
  out['hole.investNext'] = invest.slice(0, 5).map((o) => `${o.label} (${o.note})`);
  return out;
};
