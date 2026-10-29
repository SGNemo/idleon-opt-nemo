import { describe, expect, it } from 'vitest';
import { loadGameData, loadRules } from '../../../data/load-node';
import { miniSave } from '../../__fixtures__/mini-save';
import { buildTasks, computeFacts, parseSave } from '../..';
import { sushiKnowledgeTotals, sushiPerfectOdds, sushiUpgradeCost } from '../../formulas/sushi';
import { spelunkingUpgradeCost } from '../../formulas/spelunking';

const data = loadGameData(143);
const rules = loadRules();

// Sushi: 64 types found, upgrade 0 at level 2, 10k bucks; Spelunk: 1000 amber, POW upgrade 0 at Lv 5, one discovery
const save = {
  ...miniSave,
  Sushi: JSON.stringify([[], [], [2], [], [0, 0, 0, 10000], [...Array(60).fill(1), 0, 0, -1, -1], [], []]),
  Spelunk: JSON.stringify([
    [1, 1, 0], [20, 5, 0], [], [], [1000, 0, 0], [5, 0, 0], ['Smol_Pebbles'],
  ]),
};

describe('sushi formulas', () => {
  it('knowledge totals count a perfected sushi twice', () => {
    const base = { categories: [0, 1], values: [10, 5], levels: [3, 2], maxTier: 1 };
    const open = sushiKnowledgeTotals({ ...base, tracking: [0, 0] });
    const perfect = sushiKnowledgeTotals({ ...base, tracking: [1, 0] });
    expect(open[0]).toBeCloseTo(30);
    expect(perfect[0]).toBeCloseTo(60);
    expect(open[1]).toBeCloseTo(5 * 2 * 1 * (1 + 1 / 30));
  });

  it('perfect odds fall with the tier', () => {
    expect(sushiPerfectOdds(0, 0)).toBeCloseTo(0.6);
    expect(sushiPerfectOdds(8, 0)).toBeCloseTo((0.6 * Math.pow(0.81, 8)) / 2);
    expect(sushiPerfectOdds(1, 100)).toBeCloseTo(2 * sushiPerfectOdds(1, 0));
  });

  it('upgrade cost: first position, no discounts, level 0 = 5 * factor', () => {
    const c = sushiUpgradeCost({ position: 0, level: 0, costFactor: 1, costExponent: 1.5, wholesalePct: 0, restOfGamePct: 0, knowledgeDiscountPct: 0 });
    expect(c).toBe(5);
    const halved = sushiUpgradeCost({ position: 0, level: 0, costFactor: 1, costExponent: 1.5, wholesalePct: 0, restOfGamePct: 50, knowledgeDiscountPct: 0 });
    expect(halved).toBe(2.5);
  });
});

describe('spelunking formulas', () => {
  it('upgrade cost: level 0 of the POW upgrade', () => {
    // 0.25 * (10 * 0.07) * 1 + 0 = 0.175
    expect(spelunkingUpgradeCost({ index: 0, level: 0, costBase: 0.07, costGrowth: 1.5, column: 0, row: 0, discount: 1 })).toBeCloseTo(0.175);
  });

  it('applies the 1e7 / 1e9 tiers from index 52 / 66', () => {
    const at = (index: number) => spelunkingUpgradeCost({ index, level: 0, costBase: 1, costGrowth: 2, column: 0, row: 0, discount: 1 });
    expect(at(52) / at(51)).toBeCloseTo(1e7);
    expect(at(66) / at(65)).toBeCloseTo(1e7 * 1e9 / 1e7);
  });
});

describe('sushi and spelunking facts', () => {
  const facts = computeFacts(parseSave(save), data);

  it('parses the sushi and spelunk state', () => {
    const a = parseSave(save);
    expect(a.sushi).toMatchObject({ bucks: 10000, upgradeLevels: [2] });
    expect(a.spelunking).toMatchObject({ amber: 1000, upgradeLevels: [5, 0, 0], discoveries: ['Smol_Pebbles'], caveClears: [1, 1, 0] });
  });

  it('derives sushi facts', () => {
    expect(facts['sushi.active']).toBe(true);
    expect(facts['sushi.uniqueCount']).toBe(62);
    expect(facts['sushi.undiscoveredCount']).toBe(2);
    expect(facts['sushi.nextSushi']).toBe('Octolingo');
    expect(Number(facts['sushi.affordableCount'])).toBeGreaterThan(0);
    expect(facts['sushi.perfectoOpenCount']).toBe(2);
  });

  it('derives spelunking facts', () => {
    expect(facts['spelunking.active']).toBe(true);
    expect(facts['spelunking.cavesCleared']).toBe(2);
    expect(facts['spelunking.nextCave']).toBe('Tunnel 3');
    expect(facts['spelunking.discoveriesFound']).toBe(1);
    expect((facts['spelunking.coreAffordable'] as string[])[0]).toMatch(/^Learning the POW \(Lv 5,/);
  });

  it('builds ranked tasks, all todo-formula, no unfilled placeholders', () => {
    const tasks = buildTasks(rules, facts).filter((t) => t.system === 'Sushi Station' || t.system === 'Spelunking');
    expect(tasks.map((t) => t.id)).toEqual(
      expect.arrayContaining(['sushi.upgrades', 'sushi.perfecto', 'sushi.next-sushi', 'spelunking.core-upgrades', 'spelunking.next-cave', 'spelunking.discoveries']),
    );
    for (const t of tasks) {
      expect(t.status).toBe('todo-formula');
      expect(`${t.title} ${t.reason} ${t.gain}`).not.toMatch(/[{}]|\?/);
    }
  });

  it('stays silent on Spelunking when the save has no Spelunk data', () => {
    const ids = buildTasks(rules, computeFacts(parseSave(miniSave), data)).map((t) => t.id);
    expect(ids.filter((id) => id.startsWith('spelunking.'))).toEqual([]);
  });
});
