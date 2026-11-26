import { describe, expect, it } from 'vitest';
import type { PolicyUser } from '../access';
import { canViewEvent, eventPermissions, eventVisibilityWhere, type PolicyEvent } from './events.policy';

// вертикаль: відділ A входить в управління; відділ B — сусідній
const chief: PolicyUser = { id: 'chief', role: 'MANAGER', scope: new Set(['dept', 'a', 'b']) };
const headA: PolicyUser = { id: 'headA', role: 'MANAGER', scope: new Set(['a']) };
const headB: PolicyUser = { id: 'headB', role: 'MANAGER', scope: new Set(['b']) };
const director: PolicyUser = { id: 'dir', role: 'DIRECTOR', scope: 'all' };
const organizer: PolicyUser = { id: 'org', role: 'MEMBER' };
const guest: PolicyUser = { id: 'guest', role: 'MEMBER' };
const stranger: PolicyUser = { id: 'stranger', role: 'MEMBER' };

const NOW = new Date('2026-11-26T09:20:00Z');
const event = (over: Partial<PolicyEvent> = {}): PolicyEvent => ({
  status: 'PLANNED',
  endsAt: new Date('2026-11-26T16:00:00Z'),
  organizerId: 'org',
  organizer: { unitId: 'a' },
  participants: [{ userId: 'org', user: { unitId: 'a' } }, { userId: 'guest', user: { unitId: 'dept' } }],
  ...over,
});

describe('видимість заходу', () => {
  it('бачать організатор, учасник, керівник вертикалі, вищий керівник і директор', () => {
    for (const u of [organizer, guest, headA, chief, director]) expect(canViewEvent(event(), u)).toBe(true);
  });
  it('НЕ бачать сторонній виконавець і керівник сусіднього відділу', () => {
    expect(canViewEvent(event(), stranger)).toBe(false);
    expect(canViewEvent(event(), headB)).toBe(false);
  });
  it('умова для списків — та сама: сторонньому лише свої, сусідньому керівнику — свої + його вертикаль', () => {
    expect(eventVisibilityWhere(director)).toEqual({});
    expect(eventVisibilityWhere(stranger)).toEqual({ OR: [{ organizerId: 'stranger' }, { participants: { some: { userId: 'stranger' } } }] });
    expect(JSON.stringify(eventVisibilityWhere(headB))).toContain('"in":["b"]');
  });
});

describe('дії із заходом', () => {
  it('змінити й скасувати — організатор і ті, хто керує; учасник — ні', () => {
    expect(eventPermissions(event(), organizer, NOW)).toMatchObject({ edit: true, cancel: true });
    expect(eventPermissions(event(), headA, NOW)).toMatchObject({ edit: true, cancel: true });
    expect(eventPermissions(event(), guest, NOW)).toMatchObject({ edit: false, cancel: false, delete: false });
  });
  it('видалити — організатор, директор; керівник вертикалі — ні', () => {
    expect(eventPermissions(event(), organizer, NOW).delete).toBe(true);
    expect(eventPermissions(event(), director, NOW).delete).toBe(true);
    expect(eventPermissions(event(), headA, NOW).delete).toBe(false);
  });
  it('минулий чи скасований захід не змінюють і не скасовують, але видалити можна', () => {
    const past = event({ endsAt: new Date('2026-11-26T08:00:00Z') });
    expect(eventPermissions(past, organizer, NOW)).toMatchObject({ edit: false, cancel: false, delete: true });
    expect(eventPermissions(event({ status: 'CANCELLED' }), organizer, NOW)).toMatchObject({ edit: false, cancel: false });
  });
});
