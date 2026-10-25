import { Account } from '../model/account';
import { GameData } from '../../data/schemas';
import { mineheadUpgradeCost } from '../formulas/minehead';
import { sushiRestOfGameBonus, uniqueSushiCount } from '../formulas/sushi';
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
export const computeFacts = (account: Account, data: GameData): Facts => {
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

  // ---- Hole villagers
  const ready: string[] = [];
  VILLAGER_NAMES.forEach((name, i) => {
    const level = account.hole.villagerLevels[i] ?? 0;
    const exp = account.hole.villagerExp[i] ?? 0;
    if (level >= 1 && exp >= villagerExpReq(level, i)) ready.push(`${name} (Lv ${level})`);
  });
  facts['hole.villagersReadyCount'] = ready.length;
  facts['hole.villagersReady'] = ready;

  return facts;
};
