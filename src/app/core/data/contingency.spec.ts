import { CorrectiveAction, SalinityAlert } from '../models';
import { contingencyOf, parseFlushNote } from './contingency';

const wash = (id: string, notes: string, automatic = true): CorrectiveAction => ({
  id,
  type: 'LEACHING',
  performedAt: '2026-11-08',
  notes,
  createdBy: automatic ? '0' : '1',
  automatic,
});
const alert = (actions: CorrectiveAction[], createdAt = '2026-11-08T08:00:00'): SalinityAlert => ({
  id: '1',
  plotId: '1',
  readingId: '1',
  severity: 'CRITICAL',
  status: 'OPEN',
  conductivityDsM: 2.4,
  thresholdDsM: 1.5,
  createdAt,
  actions,
});

describe('parseFlushNote', () => {
  it('reads the wash number, its limit and its seconds', () => {
    expect(parseFlushNote('AUTO_FLUSH 2/3 60s')).toEqual({
      used: 2,
      max: 3,
      seconds: 60,
      exhausted: false,
    });
    expect(parseFlushNote('AUTO_FLUSH 3/3 60s EXHAUSTED')?.exhausted).toBe(true);
  });
  it('leaves any other note alone', () => {
    expect(parseFlushNote('Riego de lavado.')).toBeNull();
  });
});

describe('contingencyOf', () => {
  it('is active with the washes used while the plot is still above Normal', () => {
    const washes = [wash('1', 'AUTO_FLUSH 1/3 60s'), wash('2', 'AUTO_FLUSH 2/3 60s')];
    expect(contingencyOf([alert(washes)], 'watch')).toEqual({ state: 'ACTIVE', used: 2, max: 3 });
  });
  it('is exhausted when the last wash says so or all are used and it is still Critical', () => {
    const last = wash('3', 'AUTO_FLUSH 3/3 60s EXHAUSTED');
    expect(contingencyOf([alert([last])], 'critical')?.state).toBe('EXHAUSTED');
    expect(contingencyOf([alert([wash('3', 'AUTO_FLUSH 3/3 60s')])], 'critical')?.state).toBe(
      'EXHAUSTED',
    );
    expect(contingencyOf([alert([wash('3', 'AUTO_FLUSH 3/3 60s')])], 'high')?.state).toBe('ACTIVE');
  });
  it('ends when the plot is back to Normal and ignores washes by people', () => {
    expect(contingencyOf([alert([wash('1', 'AUTO_FLUSH 1/3 60s')])], 'normal')).toBeNull();
    expect(contingencyOf([alert([wash('1', 'AUTO_FLUSH 1/3 60s', false)])], 'watch')).toBeNull();
    expect(contingencyOf([alert([])], 'critical')).toBeNull();
  });
  it('uses the latest alert that has washes', () => {
    const older = alert([wash('1', 'AUTO_FLUSH 3/3 60s EXHAUSTED')], '2026-11-01T08:00:00');
    const newer = alert([wash('2', 'AUTO_FLUSH 1/3 60s')], '2026-11-08T08:00:00');
    expect(contingencyOf([older, newer], 'watch')).toEqual({ state: 'ACTIVE', used: 1, max: 3 });
  });
});
