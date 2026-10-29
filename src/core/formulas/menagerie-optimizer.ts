import { MenagerieData } from '../../data/schemas';
import { boostCostAtLevel, visibleBoosts } from './menagerie';

export interface BoostRanking {
  index: number;
  name: string;
  level: number;
  cost: number;
  hoursToAfford: number;
  /** Set when the boost's value can be priced: hours until it pays for itself in Lumi. */
  paybackHours?: number;
  note: string;
}

export interface BoostRankingInput {
  data: MenagerieData;
  boostLevels: number[];
  rank: number;
  lumi: number;
  lumiPerHour: number;
  /** Hours saved on the Minehead boss plan by one more doubler (boost 8), from the Minehead planner. */
  mineheadDoublerSavedHours?: number;
}

const clean = (t: string) => t.replace(/_/g, ' ').replace(/[}{@]/g, '').replace('\u81db', '').trim();

/**
 * Ranks the visible Menagerie boosts (model, status TODO):
 *  - boost 1 (rank bonus on Lumi/hr): payback = cost / extra Lumi per hour, with Lumi/hr ~ 1 + level * perLevel * rank / 100
 *  - boost 8 (Minehead doubler): ranked first when it shortens the Minehead boss plan
 *  - everything else has no priced value: ordered by cost only
 */
export function rankMenagerieBoosts(input: BoostRankingInput): BoostRanking[] {
  const { data, boostLevels, rank, lumi, lumiPerHour } = input;
  const rows: BoostRanking[] = data.boosts
    .filter((b) => b.index < visibleBoosts(rank))
    .map((b) => {
      const level = boostLevels[b.index] ?? 0;
      const cost = boostCostAtLevel(data, b.index, level);
      const row: BoostRanking = { index: b.index, name: clean(b.description), level, cost, hoursToAfford: Math.max(0, cost - lumi) / Math.max(1, lumiPerHour), note: 'kein Wert berechenbar' };
      if (b.index === 1) {
        const now = 1 + (level * b.perLevel * rank) / 100;
        const next = 1 + ((level + 1) * b.perLevel * rank) / 100;
        const extra = lumiPerHour * (next / now - 1);
        row.paybackHours = extra > 0 ? cost / extra : undefined;
        row.note = `Lumi/hr +${((next / now - 1) * 100).toFixed(1)} %`;
      }
      if (b.index === 8 && (input.mineheadDoublerSavedHours ?? 0) > 0) {
        row.note = `spart ca. ${input.mineheadDoublerSavedHours} h bis zum Minehead-Boss`;
      }
      return row;
    });
  const priority = (r: BoostRanking) => (r.index === 8 && (input.mineheadDoublerSavedHours ?? 0) > 0 ? 0 : r.paybackHours !== undefined ? 1 : 2);
  return rows.sort((a, b) => priority(a) - priority(b) || (a.paybackHours ?? a.cost) - (b.paybackHours ?? b.cost));
}
