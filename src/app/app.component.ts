import { Component, computed, effect, signal } from '@angular/core';
import { Account, buildTasks, computeFacts, parseSave, Task } from '../core';
import { loadAppData, LoadedData } from './data-loader';

const STORAGE_KEY = 'idleon-opt:save';

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

  readonly tasksByWorld = computed<{ world: number; tasks: Task[] }[]>(() => {
    const account = this.result().account;
    const loaded = this.loaded();
    if (!account || !loaded) return [];
    const tasks = buildTasks(loaded.rules, computeFacts(account, loaded.data));
    const worlds = [...new Set(tasks.map((t) => t.world))].sort((a, b) => a - b);
    return worlds.map((world) => ({ world, tasks: tasks.filter((t) => t.world === world) }));
  });

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
