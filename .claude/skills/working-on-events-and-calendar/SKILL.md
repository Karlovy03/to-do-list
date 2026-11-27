---
name: working-on-events-and-calendar
description: Rules for events (нарада, зустріч, навчання) and the calendar in «Контроль» — who may see/create/change events, event notifications and reminders, the calendar endpoint and its filters, the client time grid, and the «Виконано!» lizard. Use before changing the Event model, event permissions, event reminders, GET /calendar, the calendar UI, or the lizard.
---

# Заходи й календар (ADR-0016, ADR-0017, ADR-0018)

## Захід
- Захід — окрема модель (`Event`, `EventParticipant`), не різновид завдання. Початок + орієнтовна тривалість; зберігаємо `startsAt` і `endsAt`. Вибірка за період — `startsAt < to AND endsAt > from`.
- У базі стан лише `PLANNED | CANCELLED`. «Триває» й «минув» — з часу (`phaseOf` на клієнті, `endsAt` на сервері). Не додавати збережених станів, що залежать від годинника.
- Організатор у базі — теж учасник (нагадування, рядок календаря), у відповіді API — окремо, і зняти його не можна.

## Права — лише в `events.policy.ts`
- Створити й запросити будь-кого — кожен. Бачить — організатор, учасник, керівник вертикалі організатора чи будь-кого з учасників, директор, адмін. Невидимий → 404.
- Змінити й скасувати — організатор і ті, хто керує, поки захід не скінчився; видалити — організатор, директор, адмін.
- Списки й календар беруть ту саму умову, що й `canViewEvent` (`eventVisibilityWhere`). Будь-яка зміна прав — з негативним тестом у `events.policy.spec.ts` і наскрізним у `integration/permissions.db.spec.ts`.

## Сповіщення
- Лише через `notify()` з `calendarEvent`; рядок тіла — `eventLine` (назва й час), посилання `/events/e/:id` (ADR-0005).
- Запрошення, зміна часу, скасування, зняття — відкладаються в тихі години (ADR-0013). Тіло відкладеного push про захід будується заново з `eventLine`, а не з запису стрічки — там може бути причина скасування.
- Нагадування за `eventReminderMin` хв — чиста функція `reminders/event-plan.ts`; раз на учасника (`remindedAt`); тихі години не діють; зміна часу скидає `remindedAt`. Тип вимикається одним перемикачем `notifyEvents`.

## Календар
- `calendar` на сервері нічого не читає з бази сам — бере завдання й заходи через барелі `tasks` і `events`, які накладають видимість глядача. Фільтр лише звужує. Перевірка (має бути порожньо):
  `grep -rnE "core/prisma'|\bprisma\.[a-zA-Z]+\.|\btx\.[a-zA-Z]+\.|\bdb\.[a-zA-Z]+\." server/src/modules/calendar --include=*.ts`
  Контроль (той самий шаблон знаходить звернення до бази): замініть `calendar` на `events`.
- Межі дня й тижня — за Києвом (`calendar/lib/range.ts`, `atHour`); арифметика днів — у «цивільному» UTC, миті годин — через `fromKyiv`. Нові обчислення меж — лише там, з тестом на день переходу на літній час.
- Геометрія — чисті функції в `calendar/lib` (`place`, `withLanes`, `gridModel`, `visibleSpan`), компоненти лише малюють відсотки. Сітка не гортається вбік: зсувається вікно годин.
- Тон смуги — `timeToneOf` із `tasks` (та сама функція, що й для чипа картки); не дублювати.
- Стан календаря — в адресі (`lib/params.ts`); картка вибраного — `/calendar/t/:id`, `/calendar/e/:id`.
- Відсутності в сітці (смуга, «В строю» над «Днем») — правила в скілі **working-on-absences**.

## Ящірка «Виконано!»
- Лише контрольне, лише коли «Виконано» позначає виконавець, лише якщо `prefs.cheerOnControlDone` (`tasks/lib/cheer.ts`, `shouldCheer`). Свайп — одразу, «Скасувати» → `hideCheer()`; кнопка й сповіщення — після відповіді сервера.
- Без звуку, без балів і лічильників; нічого не блокує; `prefers-reduced-motion` — нерухомий кадр. Шар — токен `--z-cheer`.
