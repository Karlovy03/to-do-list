import { describe, expect, it } from 'vitest';
import { prefsSchema } from './profile.schemas';

const base = { quietFrom: 20, quietTo: 8, muteWeekends: true, notifyAssigned: true, notifyControl: true, notifyDeadline: true, notifyUpdates: true, controlInterval: null };

describe('налаштування людини', () => {
  it('приймає перемикачі заходів і ящірки', () => {
    expect(prefsSchema.parse({ ...base, notifyEvents: false, cheerOnControlDone: false })).toMatchObject({ notifyEvents: false, cheerOnControlDone: false });
  });
  it('застосунок старої версії без нових полів не отримує помилку, а значення не змінюються', () => {
    const parsed = prefsSchema.parse(base);
    expect(parsed.notifyEvents).toBeUndefined();
    expect(parsed.cheerOnControlDone).toBeUndefined();
  });
});
