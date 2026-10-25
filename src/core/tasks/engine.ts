import { Rule } from '../../data/schemas';
import { Facts, Task } from './types';

const fmtNumber = (n: number): string => {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) >= 1e6) return n.toExponential(2).replace('e+', 'e');
  return Number.isInteger(n) ? n.toLocaleString('en-US') : String(Math.round(n * 100) / 100);
};

const fmt = (v: Facts[string] | undefined): string => {
  if (v === undefined) return '?';
  if (Array.isArray(v)) return v.join(', ');
  return typeof v === 'number' ? fmtNumber(v) : String(v);
};

const fill = (template: string, facts: Facts): string => template.replace(/\{([\w.]+)\}/g, (_, path: string) => fmt(facts[path]));

const holds = (c: Rule['when'][number], facts: Facts): boolean => {
  const actual = facts[c.fact];
  if (actual === undefined || Array.isArray(actual)) return false;
  switch (c.op) {
    case '>': return actual > c.value;
    case '>=': return actual >= c.value;
    case '<': return actual < c.value;
    case '<=': return actual <= c.value;
    case '==': return actual === c.value;
    case '!=': return actual !== c.value;
  }
};

const num = (facts: Facts, path: string): number => {
  const v = facts[path];
  return typeof v === 'number' ? v : 0;
};

/** Turn rules + facts into a ranked task list: per world, urgent first, then priority. */
export const buildTasks = (rules: Rule[], facts: Facts): Task[] =>
  rules
    .filter((r) => r.when.every((c) => holds(c, facts)))
    .map<Task>((r) => ({
      id: r.id,
      system: r.system,
      world: r.world,
      title: fill(r.title, facts),
      reason: fill(r.reason, facts),
      effort: r.effort,
      gain: fill(r.gain, facts),
      status: r.status,
      urgent: r.urgent,
      priority: r.priority,
      progress: r.progress ? { current: num(facts, r.progress.current), max: num(facts, r.progress.max) } : undefined,
      blockedBy: r.blockedBy ? fill(r.blockedBy, facts) : undefined,
    }))
    .sort((a, b) => a.world - b.world || Number(b.urgent) - Number(a.urgent) || b.priority - a.priority);
