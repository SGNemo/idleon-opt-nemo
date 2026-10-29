import type { FactProvider } from './index';
import { lampWishCost, newJarCost, studyReq, totalLayersDestroyed, BLINDING_LANTERNS_PER_DAY, plainSchematicBonus, fountainBonus, studyProgressPerHour } from '../../formulas/hole';
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

  // HO-06 (partial): stamp "Study_rate_for_Bolaia" and legend talent 29 (jar bonus multiplier) are not parsed yet and count as 0.
  const fountainUpg = data.hole.fountainUpgrades as { bonusPerLevel: number }[][];
  const info = data.hole.holesInfo;
  const jarMod = parseFloat(String(info[67]?.[16] ?? '').split('|')[1] ?? '0') || 0;
  const perHour = studyProgressPerHour({
    fountain: fountainBonus(h.fountainLevels, h.fountainMarble, fountainUpg[1]?.[14]?.bonusPerLevel ?? 0, 1, 14),
    schematicSum: plainSchematicBonus(h.schematics, 85, 2) + plainSchematicBonus(h.schematics, 87, 3) + plainSchematicBonus(h.schematics, 88, 5) + plainSchematicBonus(h.schematics, 99, 5),
    studiesVillagerLevel: h.villagerLevels[4] ?? 0,
    jar16: (h.jarCollectibleLevels[16] ?? 0) * jarMod,
    stamp: 0,
    cosmo: (data.hole.cosmoUpgrades as { x0: number }[][])[1]?.[4] ? Math.floor((data.hole.cosmoUpgrades as { x0: number }[][])[1]![4]!.x0 * (h.villageMajiks[4] ?? 0)) : 0,
  });
  out['hole.studyPerHour'] = perHour;
  const active = h.activeStudy;
  if (active >= 0 && h.studyLevels[active] !== undefined) {
    const left = studyReq(h.studyLevels[active]!, active) - (h.studyProgress[active] ?? 0);
    out['hole.activeStudy'] = `Study ${active} (Lv ${h.studyLevels[active]})`;
    out['hole.activeStudyHours'] = Math.max(0, Math.round((left / perHour) * 10) / 10);
  }

  const invest = rankHoleInvestments(h, wishes);
  out['hole.investCount'] = invest.length;
  out['hole.investNext'] = invest.slice(0, 5).map((o) => `${o.label} (${o.note})`);
  return out;
};
