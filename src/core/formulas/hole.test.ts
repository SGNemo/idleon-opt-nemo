import { describe, expect, it } from 'vitest';
import { fountainBonus, lampWishCost, newJarCost, studyProgressPerHour, studyReq, totalLayersDestroyed, villagerExpReq } from './hole';
import { rankHoleInvestments } from './hole-optimizer';
import { parseSave } from '../save/parse-save';

describe('hole formulas', () => {
  it('HO-01: Studies Lv 245 with 3.35e19 EXP is levelable, Lv 246 would not be (game value)', () => {
    expect(villagerExpReq(245, 4)).toBeLessThan(3.35e19);
    expect(villagerExpReq(246, 4)).toBeGreaterThan(3.35e19);
  });
  it('HO-05 study requirement', () => expect(studyReq(2, 5)).toBeCloseTo(4000 * 1.5625 * 1.5));
  it('HO-14 lamp wish cost', () => {
    expect(lampWishCost(3, 0, 0, 0)).toBe(16);
    expect(lampWishCost(11, 0, 0, 0)).toBe(999999);
    expect(lampWishCost(4, 3, 6, 3)).toBe(18);
  });
  it('HO-15 new jar cost', () => expect(newJarCost(0)).toBe(50));
  it('HO-13 layers (game: 34+31+32+28 = 125)', () => expect(totalLayersDestroyed([34, 31, 32, 28])).toBe(125));
});

describe('hole parse + optimizer', () => {
  const holes: unknown[] = Array.from({ length: 28 }, () => []);
  holes[1] = [22, 61, 86, 5, 245];
  holes[2] = [0, 0, 0, 0, 3.35e19];
  holes[3] = [10, 10, 10, 10, 10];
  holes[11] = Array.from({ length: 90 }, () => 0);
  (holes[11] as number[])[25] = 6;
  holes[21] = [1, 0];
  holes[26] = [1];
  holes[27] = [5000];
  const a = parseSave({ playerNames: ['a'], Holes: holes });
  it('reads study and wish state', () => {
    expect(a.hole.studyLevels).toEqual([1]);
    expect(a.hole.wishesAvailable).toBe(6);
  });
  it('ranks ready levels before wishes before opal advice', () => {
    const r = rankHoleInvestments(a.hole, [{ name: 'More_Wishes', x1: 1, x2: 3 }, { name: 'Another_Try', x1: 6, x2: 0 }]);
    expect(r[0]!.kind).toMatch(/level/);
    expect(r.map((o) => o.tier)).toEqual([...r.map((o) => o.tier)].sort());
    expect(r.some((o) => o.kind === 'lamp-wish')).toBe(true);
  });
});

describe('HO-06 study rate', () => {
  it('base rate is 100/h without any bonus', () => expect(studyProgressPerHour({ fountain: 0, schematicSum: 0, studiesVillagerLevel: 0, jar16: 0, stamp: 0, cosmo: 0 })).toBe(100));
  it('villager level 20 with base 5% per level doubles it', () => expect(studyProgressPerHour({ fountain: 0, schematicSum: 0, studiesVillagerLevel: 20, jar16: 0, stamp: 0, cosmo: 0 })).toBe(200));
  it('fountain bonus uses marble tier', () => expect(fountainBonus([[], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4]], [[], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2]], 3, 1, 14)).toBe(Math.round(4 * 3 * 2.5)));
});
