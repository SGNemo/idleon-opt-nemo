import { describe, expect, it } from 'vitest';
import { computeMissionProgress } from './menagerie-progress';

// Values taken from the owner's save (v143) and the matching in-game mission counters.
const spelunk: unknown[] = Array.from({ length: 60 }, () => []);
spelunk[1] = [353, 382, 337, 304, 264, 194, 175, 274, 354, 142, 0, 0, 0, 0, 0];
spelunk[47] = [128, 137, 127, 131, 125, 111, 114, 84, 75, 51, 0, 0, 0, 0, 0];
spelunk[9] = [1, 44, 66, 53, 41, 44, 1, 56, 65, 58, 79, 82, 51, 50, 1, 44, 55, 84, 84, 80, 50, 16, 45, 57, 59, 56, 52, 52, 48, 37, 33, 48, 51, 44, 49, 46, 37];
const holes: unknown[] = Array.from({ length: 12 }, () => []);
holes[11] = [753756962, 34, 0, 31, 0, 32, 14, 28, 407000000];
const save = { playerNames: ['a'], Spelunk: spelunk, Holes: holes, Meals: [[148, 149]], Research: [[], [], [], [], [], [], [], [0, 0, 0, 0, 20, 0, 0, 0, 7, 38, 6]] };

describe('menagerie mission progress (MENA-05)', () => {
  const p = computeMissionProgress(save, 17449, 64);
  it('Total Depths = Spelunk[1] + Spelunk[47] = 3,862 as shown in game', () => expect(p[2]).toBe(3862));
  it('Palette LVs = sum of Spelunk[9] = 1,819 as shown in game', () => expect(p[28]).toBe(1819));
  it('Cavern layer removals = Holes[11][1,3,5,7] = 125 as shown in game', () => expect(p[23]).toBe(125));
  it('Turkey Meal LVs = Meals[0][0] = 148 as shown in game', () => expect(p[7]).toBe(148));
  it('Minehead wins and Jelly operations come from Research[7]', () => {
    expect(p[9]).toBe(20);
    expect(p[11]).toBe(38);
  });
});
