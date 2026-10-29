import { Account } from '../model/account';
import { GameData } from '../../data/schemas';
import { mineheadUpgradeCost, mineheadOpponentHp } from '../formulas/minehead';
import { missionRequirement, boostCostAtLevel, unlockCost, visibleBoosts } from '../formulas/menagerie';
import { rankMenagerieBoosts } from '../formulas/menagerie-optimizer';
import { planTimeToTarget } from '../formulas/minehead-optimizer';
import { DEFAULT_MINEHEAD_CALIBRATION, MineheadCalibration } from '../formulas/minehead-calibration';
import { sushiRestOfGameBonus, uniqueSushiCount } from '../formulas/sushi';
import { jadeEmporiumCost } from '../formulas/sneaking';
import { NUMBER_TO_LETTER } from '../save/letters';
import { VILLAGER_NAMES, villagerExpReq } from '../formulas/hole';
import { Facts } from './types';
import { FACT_PROVIDERS } from './providers';

const prettyDescription = (template: string, value: number): string =>
  template
    .split('{').join(String(value))
    .split('}').join((1 + value / 100).toFixed(2))
    .split('@').join('')
    .replace(/_/g, ' ')
    .trim();

const fmtCost = (n: number): string => (n >= 1e6 ? n.toExponential(2).replace('e+', 'e') : String(Math.round(n)));

/** Derive the values rules can reference, from the parsed account and the game data. */
export const computeFacts = (account: Account, data: GameData, calibration: MineheadCalibration = DEFAULT_MINEHEAD_CALIBRATION): Facts => {
  const facts: Facts = {};

  // ---- Minehead
  const m = account.minehead;
  const opponents = data.minehead.opponents;
  facts['minehead.triesLeft'] = m.dailyTriesLeft;
  facts['minehead.opponentsBeaten'] = m.opponentsBeaten;
  facts['minehead.opponentsTotal'] = opponents.length;
  const next = opponents[m.opponentsBeaten];
  if (next) {
    facts['minehead.nextOpponent'] = `${next.ordinal.replace(/_/g, ' ')} ${next.name}`.trim();
    facts['minehead.nextOpponentBonus'] = prettyDescription(next.bonusDescription, next.bonusValue);
  }
  const unique = uniqueSushiCount(account.sushi.uniqueSushiTracking, data.sushi.names.length - 1);
  const sushiDiscountPct = Math.max(
    sushiRestOfGameBonus(unique, data.sushi.restOfGameValues, 1),
    sushiRestOfGameBonus(unique, data.sushi.restOfGameValues, 16),
  );
  const costReduction = data.minehead.upgrades[26];
  const costReductionQty = costReduction ? costReduction.effectPerLevel * (m.upgradeLevels[26] ?? 0) : 0;
  facts['minehead.sushiDiscountPct'] = sushiDiscountPct;
  const affordable = data.minehead.upgrades
    .map((u) => {
      const level = m.upgradeLevels[u.index] ?? 0;
      const maxed = u.maxLevel < 999 && level >= u.maxLevel;
      const cost = mineheadUpgradeCost({ index: u.index, level, costExponent: u.costExponent, mineCost: account.serverVars.mineCost, costReductionQty, sushiDiscountPct });
      return { name: u.name.replace(/_/g, ' '), level, maxed, cost };
    })
    .filter((u) => !u.maxed && u.cost <= m.currency)
    .sort((a, b) => a.cost - b.cost);
  facts['minehead.affordableCount'] = affordable.length;
  facts['minehead.affordableTop'] = affordable.slice(0, 3).map((u) => `${u.name} (Lv ${u.level}, ${fmtCost(u.cost)})`);
  facts['minehead.currency'] = m.currency;

  // Boss gap + purchase plan (model MH-03/MH-07/MH-08, calibrated; see docs/FORMULAS.md)
  const placed = account.menagerie.mineheadDoublersPlaced;
  const doublers: Record<number, number> = placed.length > 0 ? Object.fromEntries(placed.map((i) => [i, 2])) : calibration.doublers;
  const mineheadDoublersOwned = (account.menagerie.boostLevels[8] ?? 0) + (account.menagerie.bundleDoublers ? 3 : 0);
  if (next && m.bestHit > 0) {
    const hp = mineheadOpponentHp(m.opponentsBeaten, account.serverVars.mineHp);
    const gap = hp / m.bestHit;
    facts['minehead.bossGapX'] = Math.round(gap * 100) / 100;
    if (gap > 1) {
      const planWith = (d: Record<number, number>) =>
        planTimeToTarget({
          upgrades: data.minehead.upgrades.map((u) => ({ index: u.index, name: u.name, effectPerLevel: u.effectPerLevel, maxLevel: u.maxLevel, costExponent: u.costExponent })),
          levels: m.upgradeLevels,
          doublers: d,
          baselineDoublers: doublers,
          baseOffset: calibration.baseOffset,
          incomeOffset: calibration.incomeOffset,
          incomePerHour: calibration.incomePerHour,
          bestHit: m.bestHit,
          currency: m.currency,
          mineCost: account.serverVars.mineCost,
          costReductionQty,
          sushiDiscountPct,
          targetMultiplier: gap,
        });
      const plan = planWith(doublers);
      const first = plan.steps[0];
      if (first) {
        facts['minehead.nextBuy'] = `${first.name.replace(/_/g, ' ')} Lv ${first.levelFrom} → ${first.levelTo} (${fmtCost(first.cost)})`;
        const totals = new Map<string, number>();
        for (const st of plan.steps) totals.set(st.name.replace(/_/g, ' '), (totals.get(st.name.replace(/_/g, ' ')) ?? 0) + (st.levelTo - st.levelFrom));
        facts['minehead.planSummary'] = [...totals].map(([n, c]) => `${n} +${c}`).join(', ');
        facts['minehead.hoursToTarget'] = Math.round(plan.hoursTotal);
        facts['minehead.planReached'] = plan.reached;
      }
      // What one more doubler on Miney Farmey I (income) would change
      if (!(5 in doublers) || doublers[5] !== 2) {
        const alt = planWith({ ...doublers, 5: 2 });
        facts['menagerie.doublerOnIncomeHours'] = Math.round(alt.hoursTotal);
        facts['menagerie.doublerOnIncomeSavedHours'] = Math.max(0, Math.round(plan.hoursTotal - alt.hoursTotal));
      }
    }
  }

  // ---- Account option flags (OptLacc[n] as fact `opt.n`), used by the daily/weekly rules
  account.accountOptions.forEach((v, i) => {
    if (typeof v === 'number') facts[`opt.${i}`] = v;
  });
  facts['weekly.maxSkulls'] = 5;

  // ---- Menagerie
  const g = account.menagerie;
  const mdata = data.menagerie;
  const cleanText = (t: string) => t.replace(/_/g, ' ').replace(/[}{@]/g, '').replace('膛', '').trim();
  facts['menagerie.lumi'] = g.lumi;
  facts['menagerie.rank'] = g.rank;
  const visibleMissions = Math.min(mdata.missions.length, 1 + (g.boostLevels[0] ?? 0) + (g.bundleMissions ? 3 : 0));
  const missionRows = mdata.missions.map((ms) => {
    const claims = g.claims[ms.index] ?? 0;
    const req = missionRequirement(ms.baseReq, ms.increment, claims);
    const cur = g.missionProgress[ms.index] ?? null;
    return { name: cleanText(ms.shortName), cur, req, can: cur !== null && cur >= req, visible: ms.index < visibleMissions };
  });
  const claimable = missionRows.filter((r) => r.visible && r.can);
  facts['menagerie.claimableCount'] = claimable.length;
  facts['menagerie.claimable'] = claimable.map((r) => r.name);
  facts['menagerie.missionsClosest'] = missionRows
    .filter((r) => r.visible && !r.can && r.cur !== null && r.req > 0 && r.cur / r.req > 0.5)
    .sort((a, b) => (b.cur! / b.req) - (a.cur! / a.req))
    .slice(0, 4)
    .map((r) => `${r.name} (${fmtCost(r.cur!)}/${fmtCost(r.req)})`);
  const visibleUnlocks = Math.min(7, g.rank) + Math.floor(Math.max(0, g.rank - 7) / 2);
  const affordableUnlocks = mdata.unlocks
    .filter((u) => u.index < visibleUnlocks && !(g.unlocksOwned[u.index] >= 1) && unlockCost(u.index) <= g.lumi)
    .map((u) => `${cleanText(u.name)} (${fmtCost(unlockCost(u.index))})`);
  facts['menagerie.affordableUnlocks'] = affordableUnlocks;
  facts['menagerie.affordableUnlocksCount'] = affordableUnlocks.length;
  facts['menagerie.missionsClosestCount'] = (facts['menagerie.missionsClosest'] as string[]).length;
  const boostRows = mdata.boosts
    .filter((b) => b.index < visibleBoosts(g.rank))
    .map((b) => ({ b, level: g.boostLevels[b.index] ?? 0, cost: boostCostAtLevel(mdata, b.index, g.boostLevels[b.index] ?? 0) }))
    .filter((r) => r.cost <= g.lumi)
    .sort((a, b) => a.cost - b.cost);
  facts['menagerie.affordableBoosts'] = boostRows.slice(0, 4).map((r) => `${cleanText(r.b.description)} Lv ${r.level} (${fmtCost(r.cost)})`);
  facts['menagerie.affordableBoostCount'] = boostRows.length;
  const ranking = rankMenagerieBoosts({
    data: mdata,
    boostLevels: g.boostLevels,
    rank: g.rank,
    lumi: g.lumi,
    lumiPerHour: calibration.lumiPerHour,
    mineheadDoublerSavedHours: Number(facts['menagerie.doublerOnIncomeSavedHours'] ?? 0),
  });
  facts['menagerie.boostRanking'] = ranking.slice(0, 4).map((r) => `${r.name} Lv ${r.level} (${fmtCost(r.cost)} Lumi, ${r.hoursToAfford <= 0 ? 'bezahlbar' : `in ${Math.round(r.hoursToAfford)} h`}; ${r.note})`);
  const dBoostLevel = g.boostLevels[8] ?? 0;
  const dCost = boostCostAtLevel(mdata, 8, dBoostLevel);
  facts['menagerie.mineheadDoublersOwned'] = mineheadDoublersOwned;
  facts['menagerie.mineheadDoublersPlaced'] = placed.length;
  facts['menagerie.mineheadDoublersLeft'] = mineheadDoublersOwned - placed.length;
  facts['menagerie.doublerBoostCost'] = fmtCost(dCost);
  facts['menagerie.doublerBoostAffordable'] = dCost <= g.lumi;
  facts['menagerie.doublerPlacedOn'] = placed.map((i) => data.minehead.upgrades[i]?.name.replace(/_/g, ' ') ?? `#${i}`);

  // ---- Jelly Operator
  const j = account.jelly;
  const obstruction = data.jelly[j.obstructionsDefeated];
  facts['jelly.operationsLeft'] = j.operationsLeft;
  facts['jelly.obstructionsDefeated'] = j.obstructionsDefeated;
  facts['jelly.obstructionsTotal'] = data.jelly.length;
  if (obstruction) {
    facts['jelly.nextObstruction'] = `#${j.obstructionsDefeated + 1} ${obstruction.name.replace(/_/g, ' ')}`;
    facts['jelly.nextBonus'] = prettyDescription(obstruction.bonusDescription, obstruction.bonusValue);
  }

  // ---- Sneaking: Jade Emporium
  const emporium = data.sneaking.emporium;
  const owned = (index: number): boolean => account.sneaking.jadeEmporiumUnlocks.includes(NUMBER_TO_LETTER[index] ?? '\u0000');
  // The game ships unreleased placeholder rows named UNDER_CONSTRUCTION; they are not purchasable.
  const released = emporium.upgrades.filter((u) => !/^UNDER[_ ]CONSTRUCTION/i.test(u.name));
  const locked = released
    .filter((u) => !owned(u.index))
    .map((u) => {
      const row = emporium.displayOrder.indexOf(u.index);
      return { name: u.name.replace(/_/g, ' '), row, cost: jadeEmporiumCost(row) };
    })
    .sort((a, b) => a.row - b.row);
  const buyable = locked.filter((u) => u.cost <= account.sneaking.jadeCoins);
  facts['sneaking.jadeTotal'] = released.length;
  facts['sneaking.jadeUnlocked'] = released.length - locked.length;
  facts['sneaking.jadeBuyableCount'] = buyable.length;
  facts['sneaking.jadeBuyable'] = buyable.slice(0, 3).map((u) => `${u.name} (${fmtCost(u.cost)})`);
  if (locked[0]) facts['sneaking.jadeNext'] = `${locked[0].name} (${fmtCost(locked[0].cost)})`;
  facts['sneaking.jadeCoins'] = account.sneaking.jadeCoins;

  // ---- Hole villagers
  const ready: string[] = [];
  VILLAGER_NAMES.forEach((name, i) => {
    const level = account.hole.villagerLevels[i] ?? 0;
    const exp = account.hole.villagerExp[i] ?? 0;
    if (level >= 1 && exp >= villagerExpReq(level, i)) ready.push(`${name} (Lv ${level})`);
  });
  facts['hole.villagersReadyCount'] = ready.length;
  facts['hole.villagersReady'] = ready;

  // ---- Endgame check: achievements per world (done = AchieveReg[i] === -1)
  for (let world = 1; world <= 6; world++) {
    const list = data.achievements.filter((a) => a.world === world);
    const open = list
      .filter((a) => account.achievements.registry[a.index] !== -1)
      .map((a) => {
        const raw = a.steamIndex !== undefined ? account.achievements.steam[a.steamIndex] : account.achievements.registry[a.index];
        const current = Math.max(0, raw ?? 0);
        return { name: a.name.replace(/_/g, ' '), current, quantity: a.quantity, ratio: a.quantity > 0 ? Math.min(1, current / a.quantity) : 0 };
      })
      .sort((a, b) => b.ratio - a.ratio);
    facts[`endgame.w${world}.total`] = list.length;
    facts[`endgame.w${world}.done`] = list.length - open.length;
    facts[`endgame.w${world}.open`] = open.length;
    facts[`endgame.w${world}.closest`] = open.slice(0, 4).map((o) => `${o.name} (${fmtCost(o.current)}/${fmtCost(o.quantity)})`);
  }

  for (const provider of FACT_PROVIDERS) Object.assign(facts, provider(account, data, facts));

  return facts;
};
