import { describe, expect, it } from 'vitest';
import { loadGameData, loadRules } from '../../data/load-node';
import { miniSave } from '../__fixtures__/mini-save';
import { buildTasks, computeFacts, parseSave } from '..';
import { mineheadUpgradeCost } from '../formulas/minehead';
import { villagerExpReq } from '../formulas/hole';

const data = loadGameData(143);
const rules = loadRules();

describe('tasks', () => {
  it('builds a ranked list from facts', () => {
    const account = parseSave(miniSave);
    const tasks = buildTasks(rules, computeFacts(account, data));
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('minehead.tries');
    expect(ids).toContain('minehead.opponent');

    const tries = tasks.find((t) => t.id === 'minehead.tries')!;
    expect(tries.title).toBe('Minehead: 7 Versuche übrig');
    expect(tries.status).toBe('verified');

    const opp = tasks.find((t) => t.id === 'minehead.opponent')!;
    expect(opp.progress).toEqual({ current: 20, max: 32 });
    expect(opp.reason).not.toMatch(/[{}]/);

    // world 5 comes before world 7; urgent first inside a world
    const worlds = tasks.map((t) => t.world);
    expect(worlds).toEqual([...worlds].sort((a, b) => a - b));
  });

  it('drops tasks whose condition fails', () => {
    const account = parseSave(miniSave);
    account.minehead.dailyTriesLeft = 0;
    const ids = buildTasks(rules, computeFacts(account, data)).map((t) => t.id);
    expect(ids).not.toContain('minehead.tries');
  });

  it('marks formula-based tasks as todo-formula', () => {
    const tasks = buildTasks(rules, computeFacts(parseSave(miniSave), data));
    for (const t of tasks.filter((t) => t.id === 'minehead.upgrades')) expect(t.status).toBe('todo-formula');
  });
});

describe('sneaking facts', () => {
  it('counts unlocked Jade Emporium upgrades from the letter string', () => {
    const facts = computeFacts(parseSave(miniSave), data);
    // 52 rows, 4 of them unreleased UNDER_CONSTRUCTION placeholders -> fully bought
    expect(facts['sneaking.jadeUnlocked']).toBe(48);
    expect(facts['sneaking.jadeTotal']).toBe(48);
    expect(facts['sneaking.jadeBuyableCount']).toBe(0);
  });
});

describe('formulas (unverified, see docs/FORMULAS.md)', () => {
  it('MH-01 reproduces the in-game cost: Base Damage I Lv 159 = 9.54M with 50% sushi discount', () => {
    const cost = mineheadUpgradeCost({ index: 0, level: 159, costExponent: 1.1, mineCost: 1.31, costReductionQty: 0, sushiDiscountPct: 50 });
    expect(cost / 1e6).toBeCloseTo(9.54, 1);
  });
  it('sushi discount comes from the data: 64 sushi found -> bonus 16 = 50%', () => {
    const facts = computeFacts(parseSave(miniSave), data);
    expect(facts['minehead.sushiDiscountPct']).toBe(50);
  });
  it('villager exp requirement is finite and increasing', () => {
    for (let i = 0; i < 5; i++) expect(villagerExpReq(21, i)).toBeLessThan(villagerExpReq(22, i));
  });
});
