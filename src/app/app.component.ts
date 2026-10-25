import { DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Account, parseSave } from '../core';

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
  imports: [DecimalPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly raw = signal(readStored());

  readonly result = computed<{ account: Account | null; error: string | null }>(() => {
    const text = this.raw().trim();
    if (!text) return { account: null, error: null };
    try {
      return { account: parseSave(text), error: null };
    } catch (e) {
      return { account: null, error: e instanceof Error ? e.message : String(e) };
    }
  });

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
