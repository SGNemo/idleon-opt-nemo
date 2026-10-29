import type { FactProvider } from './index';
import { spelunkingSushiDiscount, spelunkingUpgradeCost, SPELUNKING_UNCAPPED } from '../../formulas/spelunking';
import { sushiRestOfGameBonus, uniqueSushiCount } from '../../formulas/sushi';
import { cleanName, describeBonus, fmtNum } from './util';

/** Shop upgrades that raise POW (0-3, "...the POW") or Amber income (7-10); they compound, so they come first. */
const CORE_UPGRADES = new Set([0, 1, 2, 3, 7, 8, 9, 10]);

/** Spelunking (World 7): Amber shop, open discoveries, next tunnel boss. */
export const spelunkingProvider: FactProvider = (account, data) => {
  const facts: Record<string, number | string | boolean | string[]> = {};
  const sp = account.spelunking;
  const sd = data.spelunking;
  const active = sp.amber > 0 || sp.upgradeLevels.some((l) => l > 0) || sp.caveClears.some((c) => c > 0);
  facts['spelunking.active'] = active;
  facts['spelunking.amber'] = sp.amber;
  if (!active) return facts;

  // ---- Shop. Only the sushi discount is known, so the cost is an upper bound (meal / Jelly 22 / Royal Guardian discounts missing).
  const unique = uniqueSushiCount(account.sushi.uniqueSushiTracking, data.sushi.names.length - 1);
  const discount = spelunkingSushiDiscount(sushiRestOfGameBonus(unique, data.sushi.restOfGameValues, 6), sushiRestOfGameBonus(unique, data.sushi.restOfGameValues, 27));
  const buyable = sd.upgrades
    .map((u) => {
      const level = sp.upgradeLevels[u.index] ?? 0;
      // assumption (Toolbox does not state it): `parent` must have level >= 1 before the upgrade shows up
      const unlocked = level >= 1 || u.parent === u.index || (sp.upgradeLevels[u.parent] ?? 0) >= 1;
      const maxed = u.maxLevel < SPELUNKING_UNCAPPED && level >= u.maxLevel;
      const cost = spelunkingUpgradeCost({ index: u.index, level: Math.max(0, level), costBase: u.costBase, costGrowth: u.costGrowth, column: u.column, row: u.row, discount });
      return { index: u.index, name: cleanName(u.name), level, cost, ok: unlocked && !maxed && level >= 0 && cost <= sp.amber };
    })
    .filter((u) => u.ok)
    .sort((a, b) => a.cost - b.cost);
  const text = (u: (typeof buyable)[number]) => `${u.name} (Lv ${u.level}, ${fmtNum(u.cost)})`;
  const core = buyable.filter((u) => CORE_UPGRADES.has(u.index));
  const rest = buyable.filter((u) => !CORE_UPGRADES.has(u.index));
  facts['spelunking.coreAffordableCount'] = core.length;
  facts['spelunking.coreAffordable'] = core.slice(0, 3).map(text);
  facts['spelunking.otherAffordableCount'] = rest.length;
  facts['spelunking.otherAffordable'] = rest.slice(0, 3).map(text);

  // ---- Discoveries per tunnel
  const found = new Set(sp.discoveries);
  let foundCount = 0;
  let total = 0;
  const open: string[] = [];
  for (const cave of sd.caves) {
    const missing = cave.rocks.filter((r) => !found.has(r));
    total += cave.rocks.length;
    foundCount += cave.rocks.length - missing.length;
    if (missing.length > 0 && open.length < 3) open.push(`Tunnel ${cave.index + 1}: ${missing.length} offen (${missing.slice(0, 3).map(cleanName).join(', ')}${missing.length > 3 ? ', …' : ''})`);
  }
  facts['spelunking.discoveriesFound'] = foundCount;
  facts['spelunking.discoveriesTotal'] = total;
  facts['spelunking.discoveriesOpenCount'] = total - foundCount;
  facts['spelunking.discoveriesOpen'] = open;

  // ---- Next tunnel boss (Spelunk[0] > 0 = lore boss beaten, per Toolbox)
  const cleared = sd.caves.filter((c) => (sp.caveClears[c.index] ?? 0) > 0).length;
  const next = sd.caves.find((c) => (sp.caveClears[c.index] ?? 0) <= 0);
  facts['spelunking.cavesCleared'] = cleared;
  facts['spelunking.cavesTotal'] = sd.caves.length;
  facts['spelunking.cavesOpenCount'] = sd.caves.length - cleared;
  if (next) {
    facts['spelunking.nextCave'] = `Tunnel ${next.index + 1}`;
    facts['spelunking.nextCaveBestDepth'] = sp.bestDepths[next.index] ?? 0;
    facts['spelunking.nextCaveReward'] = next.loreReward ? describeBonus(next.loreReward, 0) : 'ohne Belohnungstext in den Daten';
  }
  return facts;
};
