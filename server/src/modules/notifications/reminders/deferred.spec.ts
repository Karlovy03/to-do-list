import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../settings/settings.schemas';
import { deferredBody, planDeferred, type DeferredRow } from './deferred';

// 2026-11-26 — четвер. 07:30 за Києвом = 05:30 UTC (ще тихі години), 08:00 = 06:00 UTC
const EARLY = new Date('2026-11-26T05:30:00Z');
const MORNING = new Date('2026-11-26T06:00:00Z');

const row = (over: Partial<DeferredRow> = {}): DeferredRow =>
  ({
    id: 'n1', userId: 'u1', taskId: 't1', kind: 'ASSIGNED', title: 'Вам нове завдання', body: '№1 · Звіт', readAt: null,
    createdAt: new Date('2026-11-25T20:00:00Z'), pushDeferred: true,
    user: { id: 'u1', isActive: true, quietFrom: 20, quietTo: 8, muteWeekends: true },
    task: { id: 't1', status: 'NEW', priority: 'NORMAL' },
    event: null,
    ...over,
  }) as DeferredRow;

describe('відкладені push', () => {
  it('чекають кінця тихих годин і приходять о 08:00', () => {
    expect(planDeferred([row()], EARLY, DEFAULT_SETTINGS)).toEqual({ send: [], drop: [] });
    expect(planDeferred([row()], MORNING, DEFAULT_SETTINGS).send).toHaveLength(1);
  });

  it('не надсилаються, якщо завдання вже закрите або сповіщення прочитане', () => {
    const closed = row({ task: { id: 't1', status: 'CANCELLED', priority: 'NORMAL' } });
    const read = row({ id: 'n2', readAt: new Date('2026-11-26T05:00:00Z') });
    expect(planDeferred([closed, read], MORNING, DEFAULT_SETTINGS)).toEqual({ send: [], drop: [closed, read] });
  });

  it('про захід: скасування доноситься зранку, а запрошення на вже скасований — ні', () => {
    const ev = (status: 'PLANNED' | 'CANCELLED') => ({ id: 'e1', title: 'Нарада', status, startsAt: new Date('2026-11-26T08:00:00Z'), endsAt: new Date('2026-11-26T09:00:00Z') });
    const cancelled = row({ id: 'c', taskId: null, task: null, kind: 'EVENT_CANCELLED', event: ev('CANCELLED') });
    const invite = row({ id: 'i', taskId: null, task: null, kind: 'EVENT_INVITED', event: ev('CANCELLED') });
    expect(planDeferred([cancelled, invite], MORNING, DEFAULT_SETTINGS)).toEqual({ send: [cancelled], drop: [invite] });
  });

  it('тіло відкладеного push про захід — назва й час, без причини скасування зі стрічки (ADR-0005)', () => {
    const r = row({
      task: null, kind: 'EVENT_CANCELLED', body: 'Нарада · 26.11 10:00–11:00\nКоваленко О.: «таємна причина»',
      event: { id: 'e1', title: 'Нарада', status: 'CANCELLED', startsAt: new Date('2026-11-26T08:00:00Z'), endsAt: new Date('2026-11-26T09:00:00Z') },
    });
    expect(deferredBody(r)).toContain('Нарада');
    expect(deferredBody(r)).not.toContain('таємна причина');
    expect(deferredBody(row())).toBe('№1 · Звіт');
  });
});
