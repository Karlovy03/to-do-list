import { describe, expect, it } from 'vitest';
import { planEventReminders, type PlanEvent } from './event-plan';

// 2026-11-26 — четвер. 17:15 за Києвом = 15:15 UTC; нарада о 17:30
const NOW = new Date('2026-11-26T15:15:00Z');
const START = new Date('2026-11-26T15:30:00Z');
const user = (id: string, over = {}) => ({
  id, isActive: true, quietFrom: 20, quietTo: 8, muteWeekends: true,
  notifyAssigned: true, notifyControl: true, notifyDeadline: true, notifyUpdates: true, notifyEvents: true, controlInterval: null, ...over,
});
const event = (over: Partial<PlanEvent> = {}): PlanEvent => ({
  id: 'e1', title: 'Нарада', startsAt: START, endsAt: new Date(START.getTime() + 30 * 60_000),
  participants: [{ userId: 'a', remindedAt: null, user: user('a') }, { userId: 'b', remindedAt: null, user: user('b') }],
  ...over,
});
const S = { eventReminderMin: 15 };

describe('нагадування про захід', () => {
  it('за 15 хв до початку — усім учасникам, яким ще не нагадували', () => {
    expect(planEventReminders(NOW, S, [event()])).toEqual([{ event: event(), userIds: ['a', 'b'], leftMs: 15 * 60_000 }]);
  });
  it('раніше, ніж за 15 хв, — ще ні; після початку — вже ні', () => {
    expect(planEventReminders(new Date(NOW.getTime() - 60_000), S, [event()])).toEqual([]);
    expect(planEventReminders(new Date(START.getTime() + 60_000), S, [event()])).toEqual([]);
  });
  it('кому вже нагадали, той не отримує вдруге', () => {
    const e = event({ participants: [{ userId: 'a', remindedAt: NOW, user: user('a') }, { userId: 'b', remindedAt: null, user: user('b') }] });
    expect(planEventReminders(NOW, S, [e])[0].userIds).toEqual(['b']);
  });
  it('у тихі години теж нагадує, але не тим, хто вимкнув сповіщення про заходи', () => {
    const night = new Date('2026-11-26T19:45:00Z'); // 21:45 за Києвом
    const e = event({ startsAt: new Date('2026-11-26T20:00:00Z'), participants: [{ userId: 'a', remindedAt: null, user: user('a') }, { userId: 'b', remindedAt: null, user: user('b', { notifyEvents: false }) }] });
    expect(planEventReminders(night, S, [e])[0].userIds).toEqual(['a']);
  });
});
