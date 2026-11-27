---
name: working-on-absences
description: Rules for absences (відпустка, лікарняний, сімейні обставини) and the «В строю» page in «Контроль» — who may mark/change an absence, Kyiv day boundaries, the «не турбувати» rule for push and reminders, the warning when assigning to an absent person, and how absences show in the calendar. Use before changing the Absence model, absence permissions, GET /absences, notification or reminder delivery, the strength page, the calendar absence band, or the people picker in task/event forms.
---

# Відсутності й «В строю» (ADR-0019)

## Модель
- Видів рівно три: `VACATION | SICK_LEAVE | FAMILY`. Новий вид — лише новим ADR (власник свідомо обмежив).
- `startDay`/`endDay` — `@db.Date`, цілі дні за Києвом, **кінець включно**: перший день на службі — `endDay + 1`.
- Стан «відсутній зараз» у базі не зберігається — лише з дат (`absentOn` на сервері, `absenceOf`/`covers` на клієнті). Не додавати збережених станів, що залежать від годинника.
- Перевірки в `absences.service.ts`: 1–120 днів, початок не раніше ніж 60 днів тому, накладання в однієї людини → `409 absence_overlap`. Коди помилок — у `client/src/shared/texts/errors.yml`.

## Права — лише в `absences.policy.ts`
- Позначити: собі — кожен; іншому — хто `managesUnits` його підрозділ (директор і адмін — будь-кому). Змінити, «вийшов на службу», зняти — автор запису або керівник людини. Людина не знімає заведене керівником.
- Читати — усім автентифікованим (рішення власника: вид бачать усі).
- Будь-яка зміна прав — з негативним тестом у `absences.policy.spec.ts` і наскрізним у `integration/permissions.db.spec.ts` (чужий керівник → 403, накладання → 409).
- Перевірка (має бути порожньо — рішення про права лише в policy):
  `grep -rnE "managesUnits|hasFullAccess|role === '" server/src/modules/absences --include=*.ts | grep -vE "\.policy(\.spec)?\.ts:"`
  Контроль: та сама команда без `| grep -vE …` знаходить рядки `absences.policy.ts`.

## Дні — лише через спільні помічники
- Сервер: `core/time.ts` (`kyivDay`, `dayDate`, `dayKey`, `addDays`). Клієнт: `shared/lib/days.ts` (`todayKey`, `dayOf`, `addDays`, `daysBetween`, `dayText`, `dayRange`). Модуль `absences` сам дат не рахує.
- Перевірка (має бути порожньо):
  `grep -rnE "toISOString|getDate\(|setDate\(|getUTC" client/src/modules/absences --include=*.ts --include=*.tsx | grep -v "\.spec\."`
  Контроль: `grep -cE "toISOString|getDate\(|setDate\(|getUTC" client/src/shared/lib/days.ts` — не нуль.
- Межа доби в тестах — київська північ (наприклад, `2026-11-28T22:30:00Z` — це вже 29-те).

## «Не турбувати»
- Відсутній у цей день отримує запис у стрічці, але **без push і без відкладення** (`notify()` фільтрує через `absentOn`).
- Нагадування по прострочених і про заходи (`reminders/plan.ts`, `event-plan.ts`) пропускають відсутніх і не пишуть журнал; відкладене (`deferred.ts`) для відсутнього знімається. Список відсутніх рахується один раз на прохід (`runner.ts`).
- Новий шлях, що шле push, іде через `notify()` або сам пропускає `absentOn` — і має тест на відсутнього.
- Керівникам про прострочення відсутнього нагадування йдуть як завжди.

## Доручення відсутньому — попередження, не заборона
- Сервер нічого не блокує. У виборі людей — `useAbsenceMark()` (позначка під посадою), у формі завдання — `AbsenceWarning` (термін за Києвом припадає на відсутність, `deadlineHits`). Кнопка «Доручити» не вимикається.

## «В строю» і календар
- `/strength` — лише ролі з людьми (MEMBER перенаправляється). День, підрозділ і «з підпорядкованими» — в адресі (`lib/params.ts`); склад — `peopleOf`, лічильник — `strengthOn`, найближчі — `upcomingFor` (14 днів).
- Вузькі колонки (Fold — `md`, Flip — `xs`) — коротка дата «до 28.11»; на Flip нульові капсули сховані, відсутніх двоє і «та ще N ›» (правки власника в макеті).
- Календар отримує відсутності з `GET /calendar` (`kind: 'absence'`), окремого запиту не робить; смуга — `AbsenceBand`, підрахунок над «Днем» — `dayStrength`.
- Панель дня (`PeriodBar`) і вибір підрозділу (`UnitPicker`) — спільні з календарем; не копіювати.

## Папір «Особовий склад» (ADR-0020)
- Друкується лише з «В строю» (`StrengthPrint`, `[data-print='only']`); у «Довідку» не вбудовується.
- **Причина відсутності на папері — ніколи:** ні колонкою, ні в підсумку за видами. Лише підрозділ, людина, посада й «На службі з» (`returnDay`).
