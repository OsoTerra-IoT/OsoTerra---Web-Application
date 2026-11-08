import { CorrectiveActionResource, DEVICE_ACTOR_ID, SalinityAlertResource } from './api.types';
import { toAlert } from './mappers';

const alertResource = (status: SalinityAlertResource['status']): SalinityAlertResource => ({
  id: 1,
  plotId: 1,
  soilReadingId: 1,
  observedConductivityDsM: 2.4,
  appliedThresholdDsM: 1.5,
  excessRatio: 1.6,
  severity: 'CRITICAL',
  status,
  acknowledgedBy: null,
  acknowledgedAt: null,
  generatedAt: '2026-11-08T08:00:00',
});
const actionResource: CorrectiveActionResource = {
  id: 1,
  salinityAlertId: 1,
  actionType: 'LEACHING',
  executedAt: '2026-11-08',
  notes: 'Lavado',
  registeredBy: 1,
  registeredAt: '2026-11-08T09:00:00',
};

describe('toAlert', () => {
  it('sets the resolution time only on a resolved alert', () => {
    expect(toAlert(alertResource('RESOLVED'), [actionResource]).resolvedAt).toBe(
      '2026-11-08T09:00:00',
    );
  });
  it('keeps an open alert unresolved even when it already has actions', () => {
    const open = toAlert(alertResource('OPEN'), [actionResource]);
    expect(open.resolvedAt).toBeUndefined();
    expect(open.actions).toHaveLength(1);
  });
});

describe('toAlert actions', () => {
  it('flags the actions the device registered as automatic', () => {
    const device = { ...actionResource, id: 2, registeredBy: DEVICE_ACTOR_ID };
    const actions = toAlert(alertResource('OPEN'), [actionResource, device]).actions;
    expect(actions.map((action) => action.automatic)).toEqual([false, true]);
  });
});
