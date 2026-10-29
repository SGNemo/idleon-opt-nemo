import { Component, computed, effect, signal } from '@angular/core';
import { Account, buildTasks, computeFacts, parseSave, Task } from '../core';
import { loadAppData, LoadedData } from './data-loader';
import {
  buildView,
  DoneMap,
  Effort,
  filterOptions,
  Filters,
  isDone,
  KV,
  loadDone,
  localDateKey,
  NO_FILTERS,
  pruneDone,
  saveDone,
  SortMode,
  TaskStatus,
  toggleDone,
  versionNotice,
  WorldGroup,
} from './task-view';

const STORAGE_KEY = 'idleon-opt:save';
const DONE_KEY = 'idleon-opt:done';

/** localStorage can throw (privacy mode, disabled); callers treat null as "no storage". */
const storage = (): KV | null => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

const readStored = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly raw = signal(readStored());
  readonly loaded = signal<LoadedData | null>(null);
  readonly loadError = signal<string | null>(null);

  readonly result = computed<{ account: Account | null; error: string | null }>(() => {
    const text = this.raw().trim();
    if (!text) return { account: null, error: null };
    try {
      return { account: parseSave(text), error: null };
    } catch (e) {
      return { account: null, error: e instanceof Error ? e.message : String(e) };
    }
  });

  readonly filters = signal<Filters>(NO_FILTERS);
  readonly sort = signal<SortMode>('priority');
  readonly collapsed = signal<ReadonlySet<number>>(new Set());
  readonly today = signal(localDateKey(new Date()));
  readonly done = signal<DoneMap>(loadDone(storage(), DONE_KEY));

  private readonly allTasks = computed<Task[]>(() => {
    const account = this.result().account;
    const loaded = this.loaded();
    if (!account || !loaded) return [];
    return buildTasks(loaded.rules, computeFacts(account, loaded.data));
  });

  private readonly dailyIds = computed<ReadonlySet<string>>(
    () => new Set((this.loaded()?.rules ?? []).filter((r) => r.daily).map((r) => r.id)),
  );

  readonly options = computed(() => filterOptions(this.allTasks()));

  readonly tasksByWorld = computed<WorldGroup[]>(() =>
    buildView(this.allTasks(), this.filters(), this.sort(), (t) => this.isTaskDone(t.id)),
  );

  readonly versionNotice = computed(() => {
    const account = this.result().account;
    const loaded = this.loaded();
    return account && loaded ? versionNotice(account.gameVersion, loaded.data.meta.gameVersion) : null;
  });

  isTaskDone(id: string): boolean {
    return isDone(this.done(), id, this.dailyIds().has(id), this.today());
  }

  isDaily(id: string): boolean {
    return this.dailyIds().has(id);
  }

  toggle(id: string): void {
    this.refreshToday();
    const next = toggleDone(this.done(), id, this.dailyIds().has(id), this.today());
    this.done.set(next);
    saveDone(storage(), DONE_KEY, next);
  }

  /** The tab may stay open past midnight; re-read the date when the user acts. */
  refreshToday(): void {
    const now = localDateKey(new Date());
    if (now === this.today()) return;
    this.today.set(now);
    const pruned = pruneDone(this.done(), this.dailyIds(), now);
    this.done.set(pruned);
    saveDone(storage(), DONE_KEY, pruned);
  }

  patchFilters(patch: Partial<Filters>): void {
    this.refreshToday();
    this.filters.update((f) => ({ ...f, ...patch }));
  }

  setWorld(v: string): void {
    this.patchFilters({ world: v === '' ? null : Number(v) });
  }
  setSystem(v: string): void {
    this.patchFilters({ system: v === '' ? null : v });
  }
  setEffort(v: string): void {
    this.patchFilters({ effort: v === '' ? null : (v as Effort) });
  }
  setStatus(v: string): void {
    this.patchFilters({ status: v === '' ? null : (v as TaskStatus) });
  }
  setSort(v: string): void {
    this.sort.set(v as SortMode);
  }
  resetFilters(): void {
    this.filters.set(NO_FILTERS);
  }

  toggleGroup(world: number): void {
    this.collapsed.update((c) => {
      const next = new Set(c);
      if (!next.delete(world)) next.add(world);
      return next;
    });
  }

  constructor() {
    effect(() => {
      const account = this.result().account;
      if (!account) return;
      loadAppData(account.gameVersion)
        .then((l) => {
          this.loaded.set(l);
          this.loadError.set(null);
        })
        .catch((e) => this.loadError.set(e instanceof Error ? e.message : String(e)));
    });
  }

  setRaw(text: string): void {
    this.raw.set(text);
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {
      /* storage unavailable: keep in memory only */
    }
  }

  async onFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.setRaw(await file.text());
  }

  clear(): void {
    this.setRaw('');
  }
}
