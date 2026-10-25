import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSave } from '../core';
import { GameDataSchema } from './schemas';

const read = (version: number, name: string) => JSON.parse(readFileSync(`data/${version}/${name}.json`, 'utf8'));
const versions: number[] = JSON.parse(readFileSync('data/versions.json', 'utf8'));
const load = (version: number) =>
  GameDataSchema.parse(Object.fromEntries(['meta', 'minehead', 'sneaking', 'hole', 'sushi', 'achievements'].map((n) => [n, read(version, n)])));

describe.each(versions)('game data %s', (version) => {
  const data = load(version);

  it('matches the table sizes the game uses', () => {
    expect(data.minehead.upgrades).toHaveLength(30);
    expect(data.minehead.opponents).toHaveLength(32);
    expect(data.sneaking.floors.baseDoorMaxHp).toHaveLength(12);
    expect(data.sneaking.floors.dropLists).toHaveLength(12);
    expect(data.sneaking.upgrades.length).toBeGreaterThanOrEqual(24);
    expect(data.minehead.glimbo.every((g) => g.vaultName !== '')).toBe(true);
  });

  it('maps misleadingly named source fields', () => {
    const u = data.minehead.upgrades[0];
    expect(u.name).toBe('Base_Damage_I');
    expect(u.maxLevel).toBe(9999); // uncapped marker
    expect(u.costExponent).toBe(1.1);
    expect(u.effectPerLevel).toBe(1);
  });

  it('records where the data came from', () => {
    expect(data.meta.gameVersion).toBe(version);
    expect(data.meta.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
  });
});

// Cross-check against a real save when one is present locally (fixtures/ is git-ignored).
const hasSave = existsSync('fixtures/save.json');
const localAccount = () => parseSave(readFileSync('fixtures/save.json', 'utf8'));

describe.skipIf(!hasSave)('data vs local save', () => {
  it('save has a data set for its game version', () => {
    expect(versions).toContain(localAccount().gameVersion);
  });

  it('save arrays are at least as long as the data tables', () => {
    const account = localAccount();
    const data = load(account.gameVersion ?? -1);
    expect(account.minehead.upgradeLevels.length).toBeGreaterThanOrEqual(data.minehead.upgrades.length);
    expect(account.minehead.glimboTrades.length).toBeGreaterThanOrEqual(data.minehead.glimbo.length);
    expect(account.sneaking.upgradeLevels.length).toBeGreaterThanOrEqual(data.sneaking.upgrades.length);
    expect(account.sneaking.doorHp).toHaveLength(data.sneaking.floors.baseDoorMaxHp.length);
  });
});
