import type { Absence, AbsenceKind, Person, Unit } from '@/shared/api/types';
import { addDays } from '@/shared/lib/days';
import { flattenTree, subtree } from '@/shared/lib/units';
import { absenceOf } from './absence';

export interface Strength {
  total: number;
  present: Person[];
  absent: { person: Person; absence: Absence }[];
  byKind: Record<AbsenceKind, number>;
}

/** «В строю» на день: хто на службі, хто відсутній і з якої причини */
export function strengthOn(people: Person[], absences: Absence[], day: string): Strength {
  const byKind: Record<AbsenceKind, number> = { VACATION: 0, SICK_LEAVE: 0, FAMILY: 0 };
  const present: Person[] = [];
  const absent: Strength['absent'] = [];
  for (const person of people) {
    const absence = absenceOf(absences, person.id, day);
    if (absence) {
      absent.push({ person, absence });
      byKind[absence.kind] += 1;
    } else present.push(person);
  }
  return { total: people.length, present, absent, byKind };
}

/** Найближчі відсутності цих людей: починаються після дня й не пізніше ніж за days днів */
export function upcomingFor(people: Person[], absences: Absence[], day: string, days = 14) {
  const ids = new Set(people.map((p) => p.id));
  const until = addDays(day, days);
  return absences.filter((a) => ids.has(a.person.id) && a.startDay > day && a.startDay <= until).sort((a, b) => a.startDay.localeCompare(b.startDay));
}

/** Люди підрозділу (з підпорядкованими, якщо sub) — лише ті, хто служить */
export function peopleOf(unitId: string, sub: boolean, units: Unit[], people: Person[]) {
  const ids = sub ? subtree(unitId, units) : new Set([unitId]);
  return people.filter((p) => p.isActive && p.unitId !== null && ids.has(p.unitId)).sort((a, b) => a.fullName.localeCompare(b.fullName, 'uk'));
}

/** Відсутні за підрозділами — у порядку дерева, як у виборі підрозділу */
export function byUnit(absent: Strength['absent'], units: Unit[]) {
  return flattenTree(units)
    .map((unit) => ({ unit, items: absent.filter((x) => x.person.unitId === unit.id) }))
    .filter((g) => g.items.length > 0);
}
