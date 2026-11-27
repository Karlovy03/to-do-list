import { managesUnits, type PolicyUser } from '../access';

/**
 * Відсутності (ADR-0019): позначка, а не наказ — без погодження.
 * Завести: собі — кожен; іншому — його керівник за вертикаллю, директор, адміністратор.
 * Змінити чи зняти: той, хто завів, або керівник людини; людина не знімає заведене керівником.
 * Бачать усі — і факт, і вид (рішення власника).
 */
export interface PolicyPerson {
  id: string;
  unitId: string | null;
}

export interface PolicyAbsence {
  userId: string;
  createdById: string | null;
  user: { unitId: string | null };
}

export const canCreateAbsenceFor = (u: PolicyUser, person: PolicyPerson) => u.id === person.id || managesUnits(u, [person.unitId]);

export const canChangeAbsence = (a: PolicyAbsence, u: PolicyUser) => a.createdById === u.id || managesUnits(u, [a.user.unitId]);
