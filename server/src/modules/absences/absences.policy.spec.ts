import { describe, expect, it } from 'vitest';
import type { PolicyUser } from '../access';
import { canChangeAbsence, canCreateAbsenceFor } from './absences.policy';

// вертикаль керівника відділу аналітики — він сам; сусідній відділ — контроль
const member: PolicyUser = { id: 'bondar', role: 'MEMBER', scope: new Set() };
const lead: PolicyUser = { id: 'melnyk', role: 'MANAGER', scope: new Set(['analytics']) };
const neighbour: PolicyUser = { id: 'tkachenko', role: 'MANAGER', scope: new Set(['control']) };
const director: PolicyUser = { id: 'chief', role: 'DIRECTOR', scope: 'all' };
const bondar = { id: 'bondar', unitId: 'analytics' };

describe('хто заводить відсутність', () => {
  it('собі — кожен', () => {
    expect(canCreateAbsenceFor(member, bondar)).toBe(true);
  });
  it('іншому — лише його керівник за вертикаллю, директор, адміністратор', () => {
    expect(canCreateAbsenceFor(lead, bondar)).toBe(true);
    expect(canCreateAbsenceFor(director, bondar)).toBe(true);
    expect(canCreateAbsenceFor(neighbour, bondar)).toBe(false);
    expect(canCreateAbsenceFor({ id: 'savchuk', role: 'MEMBER', scope: new Set() }, bondar)).toBe(false);
  });
});

describe('хто змінює чи знімає', () => {
  const byLead = { userId: 'bondar', createdById: 'melnyk', user: { unitId: 'analytics' } };
  const bySelf = { userId: 'bondar', createdById: 'bondar', user: { unitId: 'analytics' } };
  it('людина не знімає заведене керівником, але знімає своє', () => {
    expect(canChangeAbsence(byLead, member)).toBe(false);
    expect(canChangeAbsence(bySelf, member)).toBe(true);
  });
  it('керівник людини — будь-яке; сусідній керівник — ні', () => {
    expect(canChangeAbsence(bySelf, lead)).toBe(true);
    expect(canChangeAbsence(byLead, neighbour)).toBe(false);
    expect(canChangeAbsence(byLead, director)).toBe(true);
  });
});
