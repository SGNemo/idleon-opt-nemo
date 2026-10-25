import { describe, expect, it } from 'vitest';
import { miniSave } from '../__fixtures__/mini-save';
import { SaveFormatError } from './normalize';
import { parseSave } from './parse-save';

describe('parseSave', () => {
  it('reads characters, server vars and minehead state', () => {
    const a = parseSave(miniSave);
    expect(a.characters.map((c) => c.name)).toEqual(['Svannek', 'Zweinsens']);
    expect(a.characters[0]).toMatchObject({ classId: 14, level: 1644 });
    expect(a.serverVars).toEqual({ mineCost: 1.31, mineHp: 1.01 });
    expect(a.gameVersion).toBe(143);
    expect(a.minehead).toMatchObject({ opponentsBeaten: 20, dailyTriesLeft: 7, upgradeLevels: [159, 10, 11, 112, 153], glimboTrades: [47, 246, 74] });
    expect(a.minehead.bestHit).toBeCloseTo(1.7036e10, -6);
  });

  it('reads sneaking and hole state', () => {
    const a = parseSave(miniSave);
    expect(a.sneaking.selectedMastery).toBe(3);
    expect(a.sneaking.highestMastery).toBe(4);
    expect(a.sneaking.ninjas).toEqual([{ floor: 8 }, { floor: 3 }]);
    expect(a.sneaking.upgradeLevels).toEqual([541, 2769]);
    expect(a.sneaking.jadeCoins).toBeCloseTo(2.6e92, -90);
    expect(a.hole.villagerLevels).toEqual([22, 61, 86]);
  });

  it('accepts a .data wrapper and raw JSON text', () => {
    const a = parseSave(JSON.stringify({ data: miniSave }));
    expect(a.characters).toHaveLength(2);
  });

  it('accepts serverVars spelling and falls back to defaults for missing keys', () => {
    const { servervars, Research, ...rest } = miniSave;
    void servervars;
    void Research;
    const a = parseSave({ ...rest, serverVars: { A_MineCost: 2 } });
    expect(a.serverVars).toEqual({ mineCost: 2, mineHp: 1 });
    expect(a.minehead.opponentsBeaten).toBe(0);
    expect(a.present['Research']).toBe(false);
  });

  it('rejects non-saves', () => {
    expect(() => parseSave('nope')).toThrow(SaveFormatError);
    expect(() => parseSave({ foo: 1 })).toThrow(SaveFormatError);
  });
});
