import type { Task } from '../core';

/** Pure view logic for the task list (filter, sort, group, done state). No Angular, no DOM. */

export type Effort = Task['effort'];
export type TaskStatus = Task['status'];
export type SortMode = 'priority' | 'effort' | 'title';

export interface Filters {
  /** null = all */
  world: number | null;
  system: string | null;
  effort: Effort | null;
  status: TaskStatus | null;
  /** Case-insensitive substring over title, reason, gain and system. */
  search: string;
  hideDone: boolean;
}

export const NO_FILTERS: Filters = { world: null, system: null, effort: null, status: null, search: '', hideDone: false };

const EFFORT_RANK: Record<Effort, number> = { low: 0, medium: 1, high: 2 };

/** done map: task id -> local date (YYYY-MM-DD) on which it was ticked. */
export type DoneMap = Record<string, string>;

export const isDone = (done: DoneMap, id: string, daily: boolean, today: string): boolean => {
  const on = done[id];
  if (on === undefined) return false;
  return daily ? on === today : true;
};

export const toggleDone = (done: DoneMap, id: string, daily: boolean, today: string): DoneMap => {
  const next = { ...done };
  if (isDone(done, id, daily, today)) delete next[id];
  else next[id] = today;
  return next;
};

/** Drops stale daily ticks so the stored map does not grow without bound. */
export const pruneDone = (done: DoneMap, dailyIds: ReadonlySet<string>, today: string): DoneMap =>
  Object.fromEntries(Object.entries(done).filter(([id, on]) => !dailyIds.has(id) || on === today));

/** Local calendar date as YYYY-MM-DD (the in-game reset moment is not modelled; midnight local time is used). */
export const localDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const matches = (t: Task, f: Filters, done: boolean): boolean => {
  if (f.world !== null && t.world !== f.world) return false;
  if (f.system !== null && t.system !== f.system) return false;
  if (f.effort !== null && t.effort !== f.effort) return false;
  if (f.status !== null && t.status !== f.status) return false;
  if (f.hideDone && done) return false;
  const q = f.search.trim().toLowerCase();
  if (q && !`${t.title}\n${t.reason}\n${t.gain}\n${t.system}`.toLowerCase().includes(q)) return false;
  return true;
};

/** 'priority': urgent first, then priority desc. 'effort': low effort first, then priority. 'title': A-Z. */
export const compareTasks = (mode: SortMode): ((a: Task, b: Task) => number) => {
  const byPriority = (a: Task, b: Task) => Number(b.urgent) - Number(a.urgent) || b.priority - a.priority;
  switch (mode) {
    case 'priority':
      return (a, b) => byPriority(a, b) || a.title.localeCompare(b.title);
    case 'effort':
      return (a, b) => EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort] || byPriority(a, b) || a.title.localeCompare(b.title);
    case 'title':
      return (a, b) => a.title.localeCompare(b.title);
  }
};

export interface WorldGroup {
  world: number;
  tasks: Task[];
  /** Open (not done) tasks in this group after filtering. */
  open: number;
}

/** Done tasks sink to the bottom of their group; groups are ordered by world. */
export const buildView = (
  tasks: Task[],
  filters: Filters,
  sort: SortMode,
  isTaskDone: (t: Task) => boolean,
): WorldGroup[] => {
  const cmp = compareTasks(sort);
  const visible = tasks.filter((t) => matches(t, filters, isTaskDone(t)));
  const worlds = [...new Set(visible.map((t) => t.world))].sort((a, b) => a - b);
  return worlds.map((world) => {
    const inWorld = visible.filter((t) => t.world === world);
    const open = inWorld.filter((t) => !isTaskDone(t));
    const closed = inWorld.filter(isTaskDone);
    return { world, tasks: [...open.sort(cmp), ...closed.sort(cmp)], open: open.length };
  });
};

/** Distinct values for the filter dropdowns. */
export const filterOptions = (tasks: Task[]): { worlds: number[]; systems: string[] } => ({
  worlds: [...new Set(tasks.map((t) => t.world))].sort((a, b) => a - b),
  systems: [...new Set(tasks.map((t) => t.system))].sort((a, b) => a.localeCompare(b)),
});

/** Notice if the save's game version has no matching data set; null when they agree. */
export const versionNotice = (saveVersion: number | null, dataVersion: number): string | null => {
  if (saveVersion === null) return `Save has no game version; using data set v${dataVersion}. Numbers may be off.`;
  if (saveVersion !== dataVersion) return `Save is game v${saveVersion} but data set is v${dataVersion}. Numbers may be off.`;
  return null;
};

/** Key-value storage subset so tests can pass a fake. */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const loadDone = (store: KV | null, key: string): DoneMap => {
  try {
    const raw = store?.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((e): e is [string, string] => typeof e[1] === 'string'));
  } catch {
    return {};
  }
};

export const saveDone = (store: KV | null, key: string, done: DoneMap): void => {
  try {
    store?.setItem(key, JSON.stringify(done));
  } catch {
    /* storage unavailable or full: keep in memory only */
  }
};
