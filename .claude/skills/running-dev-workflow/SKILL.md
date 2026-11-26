---
name: running-dev-workflow
description: Exact commands to run, migrate, seed, typecheck, lint and test «Контроль», plus the gates to pass before every commit. Use when starting the app, authoring a migration, or verifying work before committing.
---

# Робочий процес

## Перший запуск (локально)
```bash
service postgresql start                              # PostgreSQL 16
cd server && npm ci && npx prisma generate
npx prisma migrate deploy && npm run seed            # демо-дані
npm run dev                                          # API на :3101
```
`server/.env`: `DATABASE_URL`, `JWT_SECRET`, `PORT=3101` (не комітиться; зразок — `.env.example`).

## Міграції
`prisma migrate dev` інтерактивний — у скрипті не працює. Тому:
```bash
cd server
mkdir -p prisma/migrations/$(date -u +%Y%m%d%H%M%S)_<назва>
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<тека>/migration.sql
# прочитати SQL; DROP/RENAME/NOT NULL на наявних даних — лише з перенесенням даних у тій же міграції
npx prisma migrate deploy
```
`db push` — ніколи: він змінює базу без файлу міграції.

## Ворота перед комітом
```bash
npm run check                         # з кореня: check:texts + check:size
cd server && npx tsc --noEmit -p . && npx vitest run && npm run build
cd ../client && npx vitest run && npm run build      # build = tsc --noEmit + vite build
```
Ті самі кроки запускає `.github/workflows/ci.yml` на кожен push, плюс: міграції на порожній базі і перевірка, що схема не має змін без міграції:
```bash
cd server && npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
# 0 — збігається; 2 — у schema.prisma є зміна без файлу міграції
```
Якщо якісь ворота не вдалося запустити — сказати, які і чому. Не комітити з червоними воротами.

## Образ і деплой (ADR-0009)
- Один образ із кореневого `Dockerfile`: сервер віддає зібраний клієнт. Перед ним — Caddy (HTTPS), поруч — PostgreSQL; усе в `docker-compose.yml`, секрети — у `.env` поруч (зразок `.env.example`).
- Деплой лише через `./scripts/deploy.sh`: `build` → `run --rm app npx prisma migrate deploy` → `up -d`. Сервер не мігрує базу під час старту.
- Оновлення до людей доходять самі: `index.html` і `version.json` віддаються з `no-cache`, файли збірки мають хеш у назві. Відкритий (згорнутий) застосунок звіряє `__BUILD_ID__` з `version.json` (`app/update`) і показує «Доступна нова версія · Оновити» — самостійно не перезавантажується. Тому `version.json` має лишатися поза кешем; кешувати сторінки в service worker не можна.
- Резервні копії: `scripts/backup.sh` щодня (ставить `server-setup.sh`), відновлення — `scripts/restore.sh`. Перед деструктивною міграцією — копія вручну.
- Перший адміністратор створюється лише з `ADMIN_PASSWORD` у `.env`; пароль у журнал не пишеться.
- Ключі web push у продакшені: `docker compose run --rm --no-deps app node scripts/vapid.cjs` — один раз; зміна ключів ламає всі підписки.
- Нова тека, потрібна в рантаймі (як `prisma/`, `scripts/`), має бути явно скопійована в останній стадії `Dockerfile`.
