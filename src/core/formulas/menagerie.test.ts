import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../data/load-node';
import { boostCostAtLevel, missionRequirement } from './menagerie';

const d = loadGameData(143).menagerie;

describe('menagerie formulas vs. game screens (save v143)', () => {
  it('MENA-01: boost costs match all 15 visible boosts', () => {
    const levels = [21, 19, 4, 31, 30, 3, 5, 7, 2, 9, 2, 7, 1, 9, 9];
    const ui = [29213094, 17587519, 10007677, 339421, 662656, 7157524, 713354, 518991, 7075446, 116213, 24093519, 209921, 1885550, 871225, 1257017];
    levels.forEach((level, i) => expect(Math.round(boostCostAtLevel(d, i, level))).toBe(ui[i]));
  });
  it('MENA-02: mission requirements match the first 14 missions', () => {
    const claims = [7, 6, 7, 5, 6, 4, 4, 5, 7, 4, 5, 7, 5, 3];
    const ui = [18000, 7, 4000, 325, 350, 1300, 25, 150, 10, 21, 65, 42, 650, 1600];
    ui.forEach((req, i) => expect(missionRequirement(d.missions[i].baseReq, d.missions[i].increment, claims[i])).toBe(req));
  });
});

import { rankMenagerieBoosts } from './menagerie-optimizer';

describe('menagerie boost ranking (model)', () => {
  const input = { data: d, boostLevels: [21, 19, 4, 31, 30, 3, 5, 7, 2, 9, 2, 7, 1, 9, 9], rank: 25, lumi: 12.16e6, lumiPerHour: 440_451 };
  it('puts the Minehead doubler first when it saves boss time', () => {
    const r = rankMenagerieBoosts({ ...input, mineheadDoublerSavedHours: 61 });
    expect(r[0].index).toBe(8);
  });
  it('prices the rank boost as Lumi/hr payback and orders the rest by cost', () => {
    const r = rankMenagerieBoosts(input);
    expect(r[0].index).toBe(1);
    expect(r[0].paybackHours).toBeGreaterThan(0);
    const rest = r.slice(1).map((x) => x.cost);
    expect([...rest].sort((a, b) => a - b)).toEqual(rest);
  });
});
