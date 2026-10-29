import { describe, expect, it } from 'vitest';
import { loadGameData, loadRules } from '../../data/load-node';
import { miniSave } from '../__fixtures__/mini-save';
import { buildTasks, computeFacts, parseSave } from '..';

const data = loadGameData(143);
const rules = loadRules();

/** Synthetic save: mini save plus the keys the daily rules read. `opt` overrides OptLacc entries. */
const save = (opt: Record<number, number> = {}, extra: Record<string, unknown> = {}) => ({
  ...miniSave,
  OptLacc: Array.from({ length: 700 }, (_, i) => opt[i] ?? (miniSave.OptLacc as number[])[i] ?? 0),
  ...extra,
});
const ids = (s: object): string[] => buildTasks(rules, computeFacts(parseSave(s), data)).map((t) => t.id);

describe('daily rules: parsing of the extra save keys', () => {
  it('finds the Glimmerwick Candle (Quest114) in an inventory or the chest, only with quantity > 0', () => {
    expect(parseSave(save()).dailies.ownsGlimmerwickCandle).toBe(false);
    expect(parseSave(save({}, { InventoryOrder_1: ['Null', 'Quest114'], ItemQTY_1: [0, 1] })).dailies.ownsGlimmerwickCandle).toBe(true);
    expect(parseSave(save({}, { ChestOrder: ['Quest114'], ChestQuantity: [1] })).dailies.ownsGlimmerwickCandle).toBe(true);
    expect(parseSave(save({}, { ChestOrder: ['Quest114'], ChestQuantity: [0] })).dailies.ownsGlimmerwickCandle).toBe(false);
  });
  it('reads guild rows, post office boxes, Arcane/Compass levels and the rift number', () => {
    const a = parseSave(
      save({}, {
        Guild: JSON.stringify([[1, 2], [0, 0, 10], [1, 0, 1]]),
        PostOfficeInfo1: JSON.stringify([[5, 3, 0], [0, 0, 0]]),
        PostOfficeInfo0: JSON.stringify([[0, 0, 1], [0, 0, 0]]),
        Arcane: JSON.stringify([0, 0, 0, 0, 0, 7]),
        Compass: JSON.stringify([[0, 0, 0, 0, 0, 0, 0, 0, 0, 2]]),
        Rift: JSON.stringify([26, 0, []]),
      }),
    );
    expect(a.dailies.guildTasks).toEqual([{ index: 0, progress: 10 }, { index: 1, progress: 1 }]);
    expect(a.dailies.postOfficeShipments[0]).toEqual({ totalShipments: 5, streak: 3, shield: 0, completedAnOrder: true });
    expect(a.dailies.arcaneLevels[5]).toBe(7);
    expect(a.dailies.compassLevels[9]).toBe(2);
    expect(a.dailies.riftCurrent).toBe(26);
  });
});

describe('daily rules: no false alarms without their unlock', () => {
  it('stays silent on the plain mini save', () => {
    const got = ids(save());
    for (const id of ['daily.glimmerwick', 'daily.guild-daily', 'weekly.guild-weekly', 'daily.arcanist-weapons', 'daily.arcanist-rings', 'daily.top-of-the-mornin', 'event.tournament-register', 'event.raid-register', 'daily.gilded-stamps', 'daily.alchemy-particles', 'daily.post-office']) {
      expect(got).not.toContain(id);
    }
  });
  it('arcanist drops need the quality upgrade; top of the mornin needs the compass upgrade; gilded needs the rift bonus', () => {
    const noUnlock = save({ 396: 10, 397: 10, 365: 50, 154: 3 });
    const f = computeFacts(parseSave(noUnlock), data);
    expect([f['dailies.arcanistWeaponLeft'], f['dailies.arcanistRingLeft'], f['dailies.topOfTheMorninLeft'], f['dailies.gildedStamps']]).toEqual([0, 0, 0, 0]);
    const unlocked = save({ 396: 10, 397: 100, 365: 50, 154: 3 }, { Arcane: [0, 0, 0, 0, 0, 1], Compass: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 1]], Rift: [25] });
    const g = computeFacts(parseSave(unlocked), data);
    expect(g['dailies.arcanistWeaponLeft']).toBe(90);
    expect(g['dailies.arcanistRingLeft']).toBe(0); // ring upgrade (index 23) still unbought
    expect(g['dailies.topOfTheMorninLeft']).toBe(50);
    expect(g['dailies.gildedStamps']).toBe(3);
    expect(ids(unlocked)).toEqual(expect.arrayContaining(['daily.arcanist-weapons', 'daily.top-of-the-mornin', 'daily.gilded-stamps']));
    expect(ids(unlocked)).not.toContain('daily.arcanist-rings');
  });
});

describe('daily rules: alerts and their clearing', () => {
  const candle = { InventoryOrder_0: ['Quest114'], ItemQTY_0: [1] };
  it('Glimmerwick: due while owned and not wished; cleared by 492 (today) or 491 (wish came true)', () => {
    expect(ids(save({}, candle))).toContain('daily.glimmerwick');
    expect(ids(save({ 492: 1 }, candle))).not.toContain('daily.glimmerwick');
    expect(ids(save({ 491: 1 }, candle))).not.toContain('daily.glimmerwick');
  });
  it('tournament / raid: open until registered through the current day', () => {
    expect(ids(save({ 496: 4, 511: 4 }))).toContain('event.tournament-register');
    expect(ids(save({ 496: 4, 511: 5 }))).not.toContain('event.tournament-register');
    expect(ids(save({ 613: 2, 611: 2 }))).toContain('event.raid-register');
    expect(ids(save({ 613: 2, 611: 3 }))).not.toContain('event.raid-register');
  });
  it('guild: counts rows below their requirement, only with the guild check flag; daily = first 5 rows', () => {
    const rows = [[0, 0], [0, 0, 299], [1, 0, 1], [3, 0, 5], [2, 0, 1], [4, 0, 0], [5, 0, 250], [6, 0, 5]];
    const guild = { Guild: JSON.stringify(rows) };
    expect(ids(save({}, guild))).not.toContain('daily.guild-daily');
    const f = computeFacts(parseSave(save({ 37: 1 }, guild)), data);
    expect(f['dailies.guildDailyOpen']).toBe(3); // 299/300, 5/20, 0/35 open; 1/1 and 1/1 done
    expect(f['dailies.guildWeeklyOpen']).toBe(1); // 250/250 done, 5/20 open
    expect(ids(save({ 37: 1 }, guild))).toEqual(expect.arrayContaining(['daily.guild-daily', 'weekly.guild-weekly']));
  });
  it('alchemy particles: open while OptLacc 135 > 0', () => {
    expect(ids(save({ 135: 2 }))).toContain('daily.alchemy-particles');
  });
  it('post office: lists used boxes without a completed order today; ignores never-used boxes', () => {
    const s = save({}, {
      PostOfficeInfo1: JSON.stringify([[5, 3, 0], [7, 0, 0], [0, 0, 0], [9, 1, 2]]),
      PostOfficeInfo0: JSON.stringify([[0, 0, 0], [0, 0, 1], [0, 0, 0], [0, 0, 0]]),
    });
    const f = computeFacts(parseSave(s), data);
    expect(f['dailies.postOfficeOpen']).toEqual(['Shipment 1', 'Shipment 4']);
    expect(ids(s)).toContain('daily.post-office');
  });
  it('every new rule is marked todo-formula and has no unfilled placeholders', () => {
    const s = save({ 135: 1, 154: 1, 365: 5, 396: 1, 397: 1, 496: 2, 613: 1, 37: 1 }, {
      InventoryOrder_0: ['Quest114'], ItemQTY_0: [1],
      Arcane: [0, 0, 0, 0, 0, 1, ...Array(17).fill(0), 1], Compass: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 1]], Rift: [30],
      Guild: [[0], [0, 0, 0], [5, 0, 0]],
      PostOfficeInfo1: [[1, 1, 0]], PostOfficeInfo0: [[0, 0, 0]],
    });
    const tasks = buildTasks(rules, computeFacts(parseSave(s), data)).filter((t) => /^(daily|weekly|event)\./.test(t.id) && !/^(weekly\.(boss|shimmer)|daily\.(random-event|killroy))/.test(t.id));
    expect(tasks.length).toBeGreaterThanOrEqual(10);
    for (const t of tasks) {
      expect(t.status).toBe('todo-formula');
      expect(t.title + t.reason).not.toMatch(/[{}]/);
    }
  });
});
