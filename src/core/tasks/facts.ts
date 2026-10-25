import { Account } from '../model/account';
import { GameData } from '../../data/schemas';
import { mineheadUpgradeCost, mineheadOpponentHp } from '../formulas/minehead';
import { planTimeToTarget } from '../formulas/minehead-optimizer';
import { DEFAULT_MINEHEAD_CALIBRATION, MineheadCalibration } from '../formulas/minehead-calibration';
import { sushiRestOfGameBonus, uniqueSushiCount } from '../formulas/sushi';
import { jadeEmporiumCost } from '../formulas/sneaking';
import { NUMBER_TO_LETTER } from '../save/letters';
import { VILLAGER_NAMES, villagerExpReq } from '../formulas/hole';
import { Facts } from './types';

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
  if (next && m.bestHit > 0) {
    const hp = mineheadOpponentHp(m.opponentsBeaten, account.serverVars.mineHp);
    const gap = hp / m.bestHit;
    facts['minehead.bossGapX'] = Math.round(gap * 100) / 100;
    if (gap > 1) {
      const plan = planTimeToTarget({
        upgrades: data.minehead.upgrades.map((u) => ({ index: u.index, name: u.name, effectPerLevel: u.effectPerLevel, maxLevel: u.maxLevel, costExponent: u.costExponent })),
        levels: m.upgradeLevels,
        doublers: calibration.doublers,
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
      const first = plan.steps[0];
      if (first) {
        facts['minehead.nextBuy'] = `${first.name.replace(/_/g, ' ')} Lv ${first.levelFrom} → ${first.levelTo} (${fmtCost(first.cost)})`;
        const totals = new Map<string, number>();
        for (const st of plan.steps) totals.set(st.name.replace(/_/g, ' '), (totals.get(st.name.replace(/_/g, ' ')) ?? 0) + (st.levelTo - st.levelFrom));
        facts['minehead.planSummary'] = [...totals].map(([n, c]) => `${n} +${c}`).join(', ');
        facts['minehead.hoursToTarget'] = Math.round(plan.hoursTotal);
        facts['minehead.planReached'] = plan.reached;
      }
    }
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

  // ---- Hole: daily Blinding Lanterns (cap 12 per day)
  facts['hole.lanternsLeft'] = Math.max(0, 12 - Math.min(12, account.hole.blindingLanternsUsed));

  return facts;
};
