import { Account } from '../../model/account';
import { Facts } from '../types';
import type { FactProvider } from './index';

// Facts for the daily/weekly rules in data/rules/dailies-*.json. Sources (IdleonToolbox, commit in data/143/meta.json):
// utility/dashboard/account.js (alert conditions), parsers/*.ts (unlock gates). Details and line numbers: docs/FORMULAS.md (DA-*).

/** account.js:45 ARCANIST_DAILY_DROP_CAP */
const ARCANIST_DAILY_DROP_CAP = 100;
/** Rift list index of the "Stamp_Mastery" bonus (website-data shared-data riftInfo[25]); unlocked when Rift[0] >= index (parsers/world-4/rift.ts isRiftBonusUnlocked). */
const RIFT_STAMP_MASTERY_INDEX = 25;
/** Arcane upgrades "Wand_Drops" / "Ring_Drops" (tesseract[5] / [23], x5 = 5 per level) and Compass "Top_of_the_Mornin'" (compass[9], x5 = 10 per level): bonus > 0 <=> level > 0. */
const ARCANE_WAND_DROPS = 5;
const ARCANE_RING_DROPS = 23;
const COMPASS_TOP_OF_THE_MORNIN = 9;
/** `requirement` per guild task index (website-data shared-data guildTasks); first 5 save rows are daily, the rest weekly (parsers/guild.ts parseGuildTasks). */
export const GUILD_TASK_REQUIREMENTS = [300, 1, 1, 20, 35, 250, 20, 300, 1, 1, 1, 4, 1, 11, 5, 1, 15, 15, 15, 15, 15, 25, 5, 1, 4, 17];
const GUILD_DAILY_ROWS = 5;
const SHIPMENT_NAMES = ['Shipment 1', 'Shipment 2', 'Shipment 3', 'Shipment 4', 'Shipment 5', 'Shipment 6'];

const opt = (account: Account, index: number): number => {
  const v = account.accountOptions[index];
  return typeof v === 'number' ? v : 0;
};

const openGuildTasks = (account: Account): { daily: number; weekly: number } => {
  // account.js:144: only checked while OptLacc[37] is set (guild daily check)
  if (!opt(account, 37)) return { daily: 0, weekly: 0 };
  const open = account.dailies.guildTasks.map((t) => t.progress < (GUILD_TASK_REQUIREMENTS[t.index] ?? Infinity));
  return { daily: open.slice(0, GUILD_DAILY_ROWS).filter(Boolean).length, weekly: open.slice(GUILD_DAILY_ROWS).filter(Boolean).length };
};

export const dailiesProvider: FactProvider = (account) => {
  const facts: Facts = {};
  const d = account.dailies;

  // account.js:310: candle wish still open (491 != 1), not yet wished on today (492 != 1), candle owned
  facts['dailies.glimmerwick'] = opt(account, 491) !== 1 && opt(account, 492) !== 1 && d.ownsGlimmerwickCandle ? 1 : 0;

  // account.js:326: per type, cap - dropped today (396 weapons / 397 rings), only once the quality upgrade is bought
  const left = (dropped: number, unlockedBy: number): number => ((d.arcaneLevels[unlockedBy] ?? 0) > 0 ? Math.max(0, ARCANIST_DAILY_DROP_CAP - dropped) : 0);
  facts['dailies.arcanistWeaponLeft'] = left(opt(account, 396), ARCANE_WAND_DROPS);
  facts['dailies.arcanistRingLeft'] = left(opt(account, 397), ARCANE_RING_DROPS);

  // account.js:343: kills left today = OptLacc[365], only with the Compass upgrade bought
  facts['dailies.topOfTheMorninLeft'] = (d.compassLevels[COMPASS_TOP_OF_THE_MORNIN] ?? 0) > 0 ? Math.max(0, opt(account, 365)) : 0;

  // account.js:288/298: registered-through (511 / 611) must exceed the current day (496 / 613). Companion ownership is server data
  // and not in the save: a tournament day >= 1 in the save is used as the "event has been seen" gate instead. A stale day can only
  // hide the alert, not create a false one.
  facts['dailies.tournamentOpen'] = opt(account, 496) >= 1 && opt(account, 511) <= opt(account, 496) ? 1 : 0;
  facts['dailies.raidOpen'] = opt(account, 613) >= 1 && opt(account, 611) <= opt(account, 613) ? 1 : 0;

  const guild = openGuildTasks(account);
  facts['dailies.guildDailyOpen'] = guild.daily;
  facts['dailies.guildWeeklyOpen'] = guild.weekly;

  // account.js:397: gilded stamps counter (154) only counts once the rift bonus "Stamp_Mastery" is unlocked
  facts['dailies.gildedStamps'] = d.riftCurrent >= RIFT_STAMP_MASTERY_INDEX ? Math.max(0, opt(account, 154)) : 0;

  // account.js:555: particle bubble upgrades left today (135)
  facts['dailies.particleUpgradesLeft'] = Math.max(0, opt(account, 135));

  // account.js:599: shipments without a completed order today. Boxes never shipped from are skipped (our guard, Toolbox lists all six).
  const idle = d.postOfficeShipments.map((s, i) => ({ s, i })).filter(({ s, i }) => i < SHIPMENT_NAMES.length && !s.completedAnOrder && (s.totalShipments > 0 || s.streak > 0));
  facts['dailies.postOfficeOpenCount'] = idle.length;
  facts['dailies.postOfficeOpen'] = idle.map(({ i }) => SHIPMENT_NAMES[i]);

  return facts;
};
