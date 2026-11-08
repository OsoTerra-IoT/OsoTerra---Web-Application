import { SalinityAlert } from '../models';
import type { SalinityLevel } from './monitoring.service';

/**
 * Salinity contingency of the sensor: when the conductivity stays Critical the pump washes the
 * soil, up to a few times. The sensor reports each wash as a corrective action it registers on
 * its own, with a note in this format, so the Web App shows it without any new endpoint:
 * `AUTO_FLUSH <used>/<max> <seconds>s`, plus ` EXHAUSTED` on the last wash when none is left.
 */
export const FLUSH_NOTE = /^AUTO_FLUSH (\d+)\/(\d+) (\d+)s( EXHAUSTED)?$/;

export interface FlushNote {
  used: number;
  max: number;
  seconds: number;
  exhausted: boolean;
}

/** Reads the note of an automatic wash; null for any other note, which is shown as written. */
export function parseFlushNote(notes: string): FlushNote | null {
  const match = FLUSH_NOTE.exec(notes.trim());
  return match
    ? { used: +match[1], max: +match[2], seconds: +match[3], exhausted: !!match[4] }
    : null;
}

/** 'ACTIVE' while washes are left; 'EXHAUSTED' when they ran out and a person must act. */
export type ContingencyState = 'ACTIVE' | 'EXHAUSTED';
export interface Contingency {
  state: ContingencyState;
  used: number;
  max: number;
}

/**
 * Contingency of a plot, from the washes its latest alert records. It ends (null) when the
 * plot is back to Normal, as the sensor resets its count then.
 */
export function contingencyOf(alerts: SalinityAlert[], level: SalinityLevel): Contingency | null {
  if (level === 'normal' || level === 'unknown') return null;
  const latest = alerts
    .filter((alert) => alert.actions.some((action) => action.automatic))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const washes = (latest?.actions ?? [])
    .filter((action) => action.automatic)
    .map((action) => parseFlushNote(action.notes))
    .filter((note): note is FlushNote => note !== null);
  if (!washes.length) return null;
  const used = Math.max(...washes.map((wash) => wash.used));
  const max = Math.max(...washes.map((wash) => wash.max));
  const exhausted = washes.some((wash) => wash.exhausted) || (used >= max && level === 'critical');
  return { state: exhausted ? 'EXHAUSTED' : 'ACTIVE', used, max };
}
