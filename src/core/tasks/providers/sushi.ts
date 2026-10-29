import type { FactProvider } from './index';
import { sushiRestOfGameBonus, sushiKnowledgeTotals, sushiPerfectOdds, sushiUpgradeCost, uniqueSushiCount } from '../../formulas/sushi';
import { cleanName, describeBonus, fmtNum } from './util';

/** Sushi Station (World 7): upgrades affordable with Sushi Bucks, perfecto candidates, next sushi to discover. */
export const sushiProvider: FactProvider = (account, data) => {
  const facts: Record<string, number | string | boolean | string[]> = {};
  const sd = data.sushi;
  const maxTier = sd.names.length - 1;
  const tracking = account.sushi.uniqueSushiTracking;
  const unique = uniqueSushiCount(tracking, maxTier);
  facts['sushi.active'] = unique > 0;
  facts['sushi.uniqueCount'] = unique;
  facts['sushi.totalTypes'] = sd.names.length;
  facts['sushi.bucks'] = account.sushi.bucks;
  if (unique === 0) return facts;

  const totals = sushiKnowledgeTotals({
    categories: sd.knowledgeCategories,
    values: sd.knowledgeValues,
    levels: account.sushi.knowledgeLevels,
    tracking,
    maxTier,
  });

  // ---- Upgrades payable with Bucks (upper-bound cost: Jelly 18 and a doubler on Wholesale Pricing not known)
  const levels = account.sushi.upgradeLevels;
  const wholesale = sd.upgrades[36];
  const wholesalePct = wholesale ? wholesale.bonusPerLevel * (levels[36] ?? 0) : 0;
  const restOfGamePct = Math.max(sushiRestOfGameBonus(unique, sd.restOfGameValues, 26), sushiRestOfGameBonus(unique, sd.restOfGameValues, 44));
  const affordable = sd.upgrades
    .map((u) => {
      const position = sd.upgradeOrder.indexOf(u.index);
      const level = levels[u.index] ?? 0;
      const maxed = u.maxLevel < 999 && level >= u.maxLevel;
      const cost =
        position < 0
          ? Infinity
          : sushiUpgradeCost({ position, level, costFactor: u.costFactor, costExponent: u.costExponent, wholesalePct, restOfGamePct, knowledgeDiscountPct: totals[6] ?? 0 });
      return { name: cleanName(u.name), level, maxed, cost };
    })
    .filter((u) => !u.maxed && u.cost <= account.sushi.bucks)
    .sort((a, b) => a.cost - b.cost);
  facts['sushi.affordableCount'] = affordable.length;
  facts['sushi.affordable'] = affordable.slice(0, 3).map((u) => `${u.name} (Lv ${u.level}, ${fmtNum(u.cost)})`);

  // ---- Perfecto: discovered but never cooked perfectly (tracking 0); a perfected sushi counts twice for its knowledge bonus
  const unperfected = sd.names
    .map((name, tier) => ({ name: cleanName(name), tier, found: (tracking[tier] ?? -1) >= 0, perfect: (tracking[tier] ?? 0) >= 1 }))
    .filter((s) => s.found && !s.perfect);
  facts['sushi.perfectoOpenCount'] = unperfected.length;
  facts['sushi.perfectoNext'] = unperfected.slice(0, 3).map((s) => `${s.name} (${(100 * sushiPerfectOdds(s.tier, totals[10] ?? 0)).toPrecision(2)} %)`);

  // ---- Next sushi to discover and the "rest of game" bonus it unlocks
  facts['sushi.undiscoveredCount'] = sd.names.length - unique;
  if (unique < sd.names.length) {
    facts['sushi.nextSushi'] = cleanName(sd.names[unique] ?? '');
    facts['sushi.nextSushiBonus'] = describeBonus(sd.restOfGameDescriptions[unique] ?? '', sd.restOfGameValues[unique] ?? 0);
  }
  return facts;
};
