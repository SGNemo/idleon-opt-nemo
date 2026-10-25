import { describe, expect, it } from 'vitest';
import { loadGameData, loadRules } from '../../data/load-node';
import { miniSave } from '../__fixtures__/mini-save';
import { buildTasks, computeFacts, parseSave } from '..';
import { mineheadUpgradeCost, mineheadOpponentHp } from '../formulas/minehead';
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

describe('endgame facts', () => {
  it('counts open achievements per world from AchieveReg (-1 = done)', () => {
    const account = parseSave(miniSave);
    const facts = computeFacts(account, data);
    const world1 = data.achievements.filter((a) => a.world === 1);
    // registry in the mini save: indices 0,1,4 done; 2 and 3 open (0 and 5 progress)
    const doneInMini = world1.filter((a) => account.achievements.registry[a.index] === -1).length;
    expect(facts['endgame.w1.total']).toBe(world1.length);
    expect(facts['endgame.w1.done']).toBe(doneInMini);
    expect(facts['endgame.w1.open']).toBe(world1.length - doneInMini);
  });
});

describe('formulas (unverified, see docs/FORMULAS.md)', () => {
  it('MH-01 reproduces the in-game cost: Base Damage I Lv 159 = 9.54M with 50% sushi discount', () => {
    const cost = mineheadUpgradeCost({ index: 0, level: 159, costExponent: 1.1, mineCost: 1.31, costReductionQty: 0, sushiDiscountPct: 50 });
    expect(cost / 1e6).toBeCloseTo(9.54, 1);
  });
  it('MH-01 matches six displayed upgrade costs of the Minehead screen (within display rounding)', () => {
    // [index, level, exponent, displayed cost]; mineCost 1.31, sushi discount 50%
    const shown: [number, number, number, number][] = [
      [0, 160, 1.1, 10.5e6],
      [1, 10, 0, 182e6],
      [2, 11, 0, 14.8e9],
      [3, 112, 0, 28.3e6],
      [4, 153, 0, 195e6],
      [5, 152, 0, 27.8e6],
    ];
    for (const [index, level, , displayed] of shown) {
      const costExponent = data.minehead.upgrades[index].costExponent;
      const cost = mineheadUpgradeCost({ index, level, costExponent, mineCost: 1.31, costReductionQty: 0, sushiDiscountPct: 50 });
      expect(Math.abs(cost / displayed - 1)).toBeLessThan(0.005);
    }
  });
  it('sushi discount comes from the data: 64 sushi found -> bonus 16 = 50%', () => {
    const facts = computeFacts(parseSave(miniSave), data);
    expect(facts['minehead.sushiDiscountPct']).toBe(50);
  });
  it('villager exp requirement is finite and increasing', () => {
    for (let i = 0; i < 5; i++) expect(villagerExpReq(21, i)).toBeLessThan(villagerExpReq(22, i));
  });
});

describe('minehead plan facts', () => {
  it('derives a boss gap and a next purchase when the opponent is stronger than the best hit', () => {
    const account = parseSave(miniSave);
    account.minehead.bestHit = 3e8;
    account.minehead.currency = 1e12;
    account.minehead.opponentsBeaten = 18;
    const facts = computeFacts(account, data);
    expect(Number(facts['minehead.bossGapX'])).toBeGreaterThan(1);
    expect(typeof facts['minehead.nextBuy']).toBe('string');
  });
});

describe('jelly operator', () => {
  it('reads obstructions and operations from Research[7] and names the next obstruction', () => {
    const account = parseSave(miniSave);
    account.jelly.obstructionsDefeated = 38;
    account.jelly.operationsLeft = 6;
    const facts = computeFacts(account, data);
    expect(facts['jelly.operationsLeft']).toBe(6);
    expect(String(facts['jelly.nextObstruction'])).toMatch(/^#39 /);
    const tasks = buildTasks(rules, facts);
    expect(tasks.some((t) => t.id === 'jelly.operations')).toBe(true);
  });
});

describe('minehead formulas vs. game screens', () => {
  it('MH-03: Brainhead (index 20) shows 22B HP in game, A_MineHP 1.01', () => {
    expect(Math.abs(mineheadOpponentHp(20, 1.01) / 22e9 - 1)).toBeLessThan(0.01);
  });
  it('MH-01: Mega Damage II Lv6 costs 214M in game', () => {
    const u = data.minehead.upgrades[21];
    const cost = mineheadUpgradeCost({ index: 21, level: 6, costExponent: u.costExponent, mineCost: 1.31, costReductionQty: 0, sushiDiscountPct: 50 });
    expect(Math.abs(cost / 214e6 - 1)).toBeLessThan(0.005);
  });
});

describe('menagerie facts', () => {
  it('counts owned vs. placed Minehead doublers and flags claimable missions', () => {
    const account = parseSave(miniSave);
    account.menagerie.rank = 25;
    account.menagerie.lumi = 12e6;
    account.menagerie.boostLevels = [21, 19, 4, 31, 30, 3, 5, 7, 2];
    account.menagerie.bundleDoublers = true;
    account.menagerie.mineheadDoublersPlaced = [11, 7, 9, 0, 4];
    account.menagerie.missionProgress[7] = 150; // Turkey Meal Lv 150 reached
    account.menagerie.claims[7] = 5;
    const facts = computeFacts(account, data);
    expect(facts['menagerie.mineheadDoublersOwned']).toBe(5);
    expect(facts['menagerie.mineheadDoublersLeft']).toBe(0);
    expect(facts['menagerie.doublerBoostAffordable']).toBe(true);
    expect(facts['menagerie.claimable']).toContain('Turkey Meal LVs');
  });
});

describe('daily/weekly flag rules', () => {
  it('turn OptLacc flags at 0 into tasks and ignore flags already set', () => {
    const account = parseSave(miniSave);
    account.accountOptions = [];
    account.accountOptions[190] = 0;
    account.accountOptions[189] = 3;
    account.accountOptions[182] = 1;
    const ids = buildTasks(rules, computeFacts(account, data)).map((t) => t.id);
    expect(ids).toContain('weekly.boss-reset');
    expect(ids).toContain('weekly.boss-trophy');
    expect(ids).not.toContain('weekly.shimmer');
    expect(ids).not.toContain('daily.random-event');
  });
});
