import { Rule } from '../../data/schemas';

export type Facts = Record<string, number | string | boolean | string[]>;

export interface Task {
  id: string;
  system: string;
  world: number;
  title: string;
  /** Justification with the numbers filled in. */
  reason: string;
  effort: Rule['effort'];
  gain: string;
  status: Rule['status'];
  urgent: boolean;
  priority: number;
  progress?: { current: number; max: number };
  blockedBy?: string;
}
