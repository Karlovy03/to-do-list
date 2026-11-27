import type { Absence, AbsenceKind } from '@/shared/api/types';
import { addDays, dayOf, dayRange, dayText } from '@/shared/lib/days';
import { pluralForm } from '@/shared/lib/plural';
import { t } from '@/shared/lib/texts';

export const KINDS: AbsenceKind[] = ['VACATION', 'SICK_LEAVE', 'FAMILY'];

/** День усередині відсутності; кінець включно */
export const covers = (a: Pick<Absence, 'startDay' | 'endDay'>, day: string) => a.startDay <= day && day <= a.endDay;

/** Відсутність людини в цей день (у людини накладань не буває — сервер їх не допускає) */
export const absenceOf = (absences: Absence[], personId: string, day: string) => absences.find((a) => a.person.id === personId && covers(a, day));

/** Виконавці, у яких день терміну (за Києвом) припадає на відсутність */
export const deadlineHits = (absences: Absence[], ids: string[], deadline: Date) =>
  ids.flatMap((id) => absenceOf(absences, id, dayOf(deadline)) ?? []);

/** Перший день на службі */
export const returnDay = (a: Pick<Absence, 'endDay'>) => addDays(a.endDay, 1);

/**
 * Коли: триває — «до 28 листопада» (один день сьогодні — «сьогодні»); попереду чи минула — «1–14 грудня».
 * short — для вузьких колонок Fold і Flip: «до 28.11», «1–14.12» (правка власника в макеті).
 */
export function absenceWhen(a: Pick<Absence, 'startDay' | 'endDay'>, today: string, short = false) {
  if (covers(a, today)) return a.endDay === today ? t('absences.when.today') : t('absences.when.until', { date: dayText(a.endDay, short) });
  return dayRange(a.startDay, a.endDay, short);
}

/** «Лікарняний · до 28 листопада» */
export const absenceLabel = (a: Pick<Absence, 'kind' | 'startDay' | 'endDay'>, today: string, short = false) => `${t(`absences.kind.${a.kind}`)} · ${absenceWhen(a, today, short)}`;

/** Тривалість для капсул і підсумку: «1 день», «3 дні», «5 днів» */
export const daysLabel = (n: number) => t(`absences.form.days_${pluralForm(n)}`, { n });
