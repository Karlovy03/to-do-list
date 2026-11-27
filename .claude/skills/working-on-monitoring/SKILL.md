---
name: working-on-monitoring
description: Rules for the admin-only «Моніторинг» of «Контроль» — visits and online presence of people, and the VPS/server state (memory, swap, CPU, disk, OOM kills, app, database, template files, last backup), thresholds «увага / погано», history samples, retention. Use before changing anything under server/src/modules/monitoring or client/src/modules/monitoring, the Visit or ServerSample models, the presence live signal, the activity tracker middleware, thresholds, or the backup-time record in scripts/backup.sh.
---

# Моніторинг (ADR-0024)

## Хто бачить
- Лише адміністратор: router модуля під `requireRole('ADMIN')`; директор, керівник, виконавець — `403` (тест у `integration/monitoring.db.spec.ts`).
- Сигнал `presence` (хто прийшов/пішов) — лише адміністраторам; аудиторія задається в `live.hub.ts`.
- Перевірка (має бути порожньо — кожен router модуля закритий для не-адміністраторів):
  `for f in $(grep -rl "Router()" server/src/modules/monitoring --include=*.ts | grep -v spec); do grep -q "requireRole('ADMIN')" "$f" || echo "NO ADMIN GATE: $f"; done`
  Контроль: той самий цикл по `server/src/modules/templates` друкує `NO ADMIN GATE: …templates.routes.ts`.
- Перевірка (має бути порожньо — presence лише адміністраторам):
  `grep -rn "t: 'presence'" server/src --include=*.ts | grep -v spec | grep -v "v.role === 'ADMIN'"`
  Контроль: та сама команда з `grep -c "v.role === 'ADMIN'"` замість останнього фільтра — не нуль.

## Відвідування
- Візит — неперервна активність; перерва понад 30 хв — новий візит. Пише лише `activity.tracker.ts` (після `requireAuth`, у фоні, не частіше ніж раз на хвилину на людину).
- Про візит зберігаємо **лише час** — без пристрою, браузера, IP (рішення власника). Нове поле про людину — лише новим ADR.
  Перевірка (має бути порожньо): `sed -n '/^model Visit /,/^}/p' server/prisma/schema.prisma | grep -iE "ip|agent|device|browser|platform"`
  Контроль: `printf 'model Visit {\n  ip String\n}\n' | sed -n '/^model Visit /,/^}/p' | grep -ciE "ip|agent|device|browser|platform"` — 1.
- Зберігання — 90 днів (`monitoringRepository.prune`), людям не показуємо (рішення власника).
- Онлайн — відкритий потік `/api/live` (`liveHub.onlineUserIds()`), а не «запит за останні N хвилин».
- Дні — київські (у SQL — `AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Kyiv'`, у сервісі — `kyivDay`); межу доби тестувати на 23:30 UTC.
- Клієнт пише «коли був» без роду («щойно», «12 хв тому», «учора о 17:40»): роду людини система не знає.

## Стан сервера
- Числа VPS — з `/proc` (у контейнері це весь сервер), розбір — чистими функціями в `system/proc.ts` з тестами на зразках. Сокет Docker не монтувати: це root-доступ.
- Пороги — лише в `system/status.ts`; кожна межа — з тестом «рівно на межі ще ні / трохи далі — так» у `status.spec.ts`. Загальний стан — найгірший. Зміна порогу — разом із текстом у макеті й `texts/server.yml`.
- Історія — `ServerSample` раз на 5 хв (7 днів), процесор — різниця двох знімків `/proc/stat` у `sampler.ts`. Нове поле знімка — міграцією, що лише додає.
- Час останньої вдалої копії пише `scripts/backup.sh` у `Setting` (`backup.lastOk`, рядок ISO); збій запису не валить копію.
