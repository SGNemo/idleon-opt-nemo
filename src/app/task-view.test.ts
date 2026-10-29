import { describe, expect, it } from 'vitest';
import type { Task } from '../core';
import {
  buildView,
  filterOptions,
  isDone,
  loadDone,
  localDateKey,
  NO_FILTERS,
  pruneDone,
  saveDone,
  toggleDone,
  versionNotice,
} from './task-view';

const task = (o: Partial<Task> & { id: string }): Task => ({
  system: 'Minehead',
  world: 7,
  title: o.id,
  reason: '',
  effort: 'low',
  gain: '',
  status: 'verified',
  urgent: false,
  priority: 50,
  ...o,
});

const tasks = [
  task({ id: 'a', world: 7, priority: 10, effort: 'high' }),
  task({ id: 'b', world: 7, priority: 90, system: 'Jelly', status: 'todo-formula' }),
  task({ id: 'c', world: 2, priority: 50, urgent: true, system: 'Weekly Boss', reason: 'Raid reset' }),
  task({ id: 'd', world: 7, priority: 50, urgent: true, effort: 'medium' }),
];
const ids = (v: ReturnType<typeof buildView>) => v.map((g) => [g.world, g.tasks.map((t) => t.id)]);
const none = () => false;

describe('buildView', () => {
  it('groups by world and sorts urgent first, then priority', () => {
    expect(ids(buildView(tasks, NO_FILTERS, 'priority', none))).toEqual([
      [2, ['c']],
      [7, ['d', 'b', 'a']],
    ]);
  });

  it('sorts by effort (low first) and by title', () => {
    expect(ids(buildView(tasks, NO_FILTERS, 'effort', none))[1]).toEqual([7, ['b', 'd', 'a']]);
    expect(ids(buildView(tasks, NO_FILTERS, 'title', none))[1]).toEqual([7, ['a', 'b', 'd']]);
  });

  it('filters by world, system, effort and status', () => {
    expect(ids(buildView(tasks, { ...NO_FILTERS, world: 2 }, 'priority', none))).toEqual([[2, ['c']]]);
    expect(ids(buildView(tasks, { ...NO_FILTERS, system: 'Jelly' }, 'priority', none))).toEqual([[7, ['b']]]);
    expect(ids(buildView(tasks, { ...NO_FILTERS, effort: 'high' }, 'priority', none))).toEqual([[7, ['a']]]);
    expect(ids(buildView(tasks, { ...NO_FILTERS, status: 'todo-formula' }, 'priority', none))).toEqual([[7, ['b']]]);
  });

  it('searches title, reason, gain and system case-insensitively', () => {
    expect(ids(buildView(tasks, { ...NO_FILTERS, search: ' RAID ' }, 'priority', none))).toEqual([[2, ['c']]]);
    expect(ids(buildView(tasks, { ...NO_FILTERS, search: 'jelly' }, 'priority', none))).toEqual([[7, ['b']]]);
    expect(buildView(tasks, { ...NO_FILTERS, search: 'zzz' }, 'priority', none)).toEqual([]);
  });

  it('moves done tasks to the bottom or hides them, and counts open tasks', () => {
    const done = (t: Task) => t.id === 'd';
    const v = buildView(tasks, NO_FILTERS, 'priority', done);
    expect(v[1].tasks.map((t) => t.id)).toEqual(['b', 'a', 'd']);
    expect(v[1].open).toBe(2);
    expect(ids(buildView(tasks, { ...NO_FILTERS, hideDone: true }, 'priority', done))[1]).toEqual([7, ['b', 'a']]);
  });
});

describe('done state', () => {
  it('daily ticks expire on the next day, others persist', () => {
    const done = { x: '2026-10-28', y: '2026-10-28' };
    expect(isDone(done, 'x', true, '2026-10-28')).toBe(true);
    expect(isDone(done, 'x', true, '2026-10-29')).toBe(false);
    expect(isDone(done, 'y', false, '2026-10-29')).toBe(true);
    expect(isDone(done, 'z', false, '2026-10-29')).toBe(false);
  });

  it('toggles without mutating', () => {
    const a = {};
    const b = toggleDone(a, 'x', true, '2026-10-29');
    expect(a).toEqual({});
    expect(b).toEqual({ x: '2026-10-29' });
    expect(toggleDone(b, 'x', true, '2026-10-29')).toEqual({});
    // stale daily tick: toggling re-ticks for today instead of unticking
    expect(toggleDone({ x: '2026-10-28' }, 'x', true, '2026-10-29')).toEqual({ x: '2026-10-29' });
  });

  it('prunes only stale daily entries', () => {
    expect(pruneDone({ d: '2026-10-28', e: '2026-10-29', o: '2026-01-01' }, new Set(['d', 'e']), '2026-10-29')).toEqual({
      e: '2026-10-29',
      o: '2026-01-01',
    });
  });

  it('formats the local date key', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('storage', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  const throwing = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('denied');
    },
  };

  it('round-trips', () => {
    const s = mem();
    saveDone(s, 'k', { a: '2026-10-29' });
    expect(loadDone(s, 'k')).toEqual({ a: '2026-10-29' });
  });

  it('survives missing, throwing and corrupt storage', () => {
    expect(loadDone(null, 'k')).toEqual({});
    expect(loadDone(throwing, 'k')).toEqual({});
    expect(() => saveDone(throwing, 'k', {})).not.toThrow();
    const s = mem();
    s.setItem('k', '{not json');
    expect(loadDone(s, 'k')).toEqual({});
    s.setItem('k', '[1,2]');
    expect(loadDone(s, 'k')).toEqual({});
    s.setItem('k', JSON.stringify({ a: '2026-10-29', b: 3 }));
    expect(loadDone(s, 'k')).toEqual({ a: '2026-10-29' });
  });
});

describe('misc', () => {
  it('lists filter options', () => {
    expect(filterOptions(tasks)).toEqual({ worlds: [2, 7], systems: ['Jelly', 'Minehead', 'Weekly Boss'] });
  });

  it('flags version mismatch', () => {
    expect(versionNotice(143, 143)).toBeNull();
    expect(versionNotice(144, 143)).toContain('v144');
    expect(versionNotice(null, 143)).toContain('no game version');
  });
});
