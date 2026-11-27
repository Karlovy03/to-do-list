---
name: working-on-live-updates
description: Rules for live updates in «Контроль» — the SSE stream GET /api/live, who receives a signal, where services must announce changes, and how the client maps signals to data refetches. Use before adding or changing any write in a service (task, event, absence, feed), adding a new kind of data that should update live, touching the live module, LiveProvider, the Caddyfile route for /api/live, or polling intervals.
---

# Живі оновлення (ADR-0021)

## Сигнал — без змісту
- Потік `GET /api/live` несе лише `{"t": "task"|"event"|"absence"|"feed", "id"?}`. Назви, тексти, люди — **ніколи**: дані клієнт перепитує звичайним запитом, де права перевіряє сервер.
- Новий вид даних — новий `t` і в `server/src/modules/live/live.hub.ts` (`LiveTopic`), і в `client/src/app/live/signals.ts` (`keysFor`, `TOPICS`) з тестом у `signals.spec.ts`.

## Хто отримує — лише через policy
- Модуль `live` правил не знає: умову передає той, хто публікує. Завдання — `announceTask(id, ...versions)` (`canView`), захід — `announceEvent` (`canViewEvent`), відсутність — усім (ADR-0019), стрічка — одержувачам.
- Зміна, після якої хтось перестає бачити запис (зняли виконавця, змінили учасників), передає **обидві** версії — до і після.
- Будь-яка зміна адресатів — з негативним тестом (`tasks/task-live.spec.ts`, `events/event-live.spec.ts`: керівник сусіднього відділу й сторонній — без сигналу) і наскрізним у `integration/live.db.spec.ts`.

## Хто публікує
- Кожен сервіс, що змінює видимі дані, викликає `announce…` **після** успішного запису (не в транзакції) — у фоні, збій потоку не ламає дію. Відмова в правах чи конфлікт — без сигналу (перевіряють spec сервісів).
- Перевірка (має бути порожньо — кожен сервіс, що шле сповіщення, публікує й сигнал):
  `grep -rL "announce" $(grep -rl "notifyInBackground(\|notify(" server/src/modules --include=*.service.ts)`
  Контроль (`-L` справді показує файли без слова): `grep -L "announce" server/src/modules/settings/settings.service.ts` — виводить шлях.
- Змінились права людини (вихід, пароль, роль, підрозділ, вимкнення) — `liveHub.dropUser(id)`: потік відкриється заново з новими правами.

## Клієнт
- Одне з'єднання на застосунок — `app/live/LiveProvider.tsx`; потік читається через `fetch` (`app/live/stream.ts`), бо `EventSource` не передає `Authorization` для застосунку. Вхід — `authInit()` з `shared/api/client.ts`, не копія.
- Сигнал → `invalidateQueries` за `keysFor` (групування 300 мс). Після обриву — перечитати все. Повтори — `retryDelay`; одразу — при поверненні у вкладку, `online`, Capacitor `resume`.
- Опитування не прибирати — це страховка: `useRefetchInterval(base)` із `shared/live/LiveContext.ts` (5 хв із живим потоком, `base` без нього). Нові списки беруть інтервал через цей хук.

## Інфраструктура
- `Caddyfile`: `/api/live` — без `encode`, `flush_interval -1`. Зміна `Caddyfile` після деплою: `caddy validate`, потім `caddy reload` (bind-mount сам не перечитується).
- Один процес: концентратор у пам'яті; перед зупинкою — `liveHub.closeAll()` (інакше `server.close()` чекає відкриті потоки).
