import { describe, expect, it } from 'vitest';
import type { AppEvent } from '@/shared/api/types';
import { eventChanges } from './eventChanges';

const event = {
  title: 'Нарада',
  description: '',
  startsAt: '2026-11-26T15:30:00.000Z',
  durationMin: 30,
  participants: [{ id: 'a' }, { id: 'b' }],
} as AppEvent;
const same = { title: 'Нарада', description: '', startsAt: '2026-11-26T15:30:00Z', durationMin: 30, participantIds: ['b', 'a'] };

describe('зміни заходу', () => {
  it('нічого не змінено — нічого не надсилається (той самий час в іншому записі, учасники в іншому порядку)', () => {
    expect(eventChanges(event, same)).toEqual({});
  });
  it('лише змінені поля', () => {
    expect(eventChanges(event, { ...same, durationMin: 60, participantIds: ['a'] })).toEqual({ durationMin: 60, participantIds: ['a'] });
    expect(eventChanges(event, { ...same, startsAt: '2026-11-26T16:00:00.000Z' })).toEqual({ startsAt: '2026-11-26T16:00:00.000Z' });
  });
});
