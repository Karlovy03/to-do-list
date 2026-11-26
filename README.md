# «Контроль» — планер доручень

Простий планер для керівника: ставити завдання, брати їх **на контроль** (контроль може поставити й особа без акаунта), стежити за ходом виконання і отримувати сповіщення на телефон: нове завдання, контроль, термін спливає, нагадування по контрольних кожні N годин. Інтерфейс українською, у стилі МВС, працює на телефоні, розкладному телефоні та комп'ютері.

| Тека | Що там |
|---|---|
| `server/` | API: Express 5, Prisma 6 (PostgreSQL 16), нагадування, web push |
| `client/` | Веб-застосунок: React 19, Vite, TanStack Query |
| `docs/decisions/` | Рішення проєкту (ADR) — читати перед зміною поведінки |
| `.claude/skills/` | Правила розробки: архітектура, тексти, стилі, сповіщення, тести |

## Сповіщення
Єдиний зовнішній канал — **сповіщення в браузері** (web push, ADR-0010). Безкоштовно, нічого встановлювати не треба.
- **Android і комп'ютер:** відкрити сайт, натиснути «Увімкнути сповіщення» → «Дозволити».
- **iPhone (iOS 16.4+):** у Safari «Поділитися» → «На екран «Додому»», відкрити застосунок з іконки й увімкнути сповіщення. У звичайній вкладці Safari push не працює.
- Дзвіночок у застосунку показує все завжди — навіть якщо сповіщення вимкнено.

Працює лише через **HTTPS** — тому в продакшені перед застосунком стоїть Caddy з безкоштовним сертифікатом.

## Розгортання на сервері

Потрібно: сервер з Linux і Docker (Compose v2), **доменне ім'я**, що вказує на IP сервера, відкриті порти 80 і 443.

```bash
git clone <адреса репозиторію> kontrol && cd kontrol
cp .env.example .env        # заповнити: DOMAIN, POSTGRES_PASSWORD, JWT_SECRET, ADMIN_PASSWORD
docker compose build app
docker compose run --rm --no-deps app node scripts/vapid.cjs   # ключі сповіщень → дописати в .env
./scripts/deploy.sh
```

- Паролі: `openssl rand -base64 32` (база), `openssl rand -base64 48` (JWT).
- **Ключі сповіщень генеруються один раз і більше не змінюються** — інакше всі люди мусять заново вмикати сповіщення.
- Перший адміністратор (`ADMIN_LOGIN` / `ADMIN_PASSWORD`) створюється при першому запуску. Далі людей додають у «Адміністрування».
- `.env` не комітиться і лежить лише на сервері.

**Оновлення:** `git pull && ./scripts/deploy.sh`. Скрипт збирає новий образ, застосовує міграції бази, поки працює стара версія, і лише тоді перемикає (ADR-0009). Якщо крок не вдався — лишається попередня версія.

**Резервна копія бази:**
```bash
docker compose exec -T db pg_dump -U kontrol kontrol | gzip > backup-$(date +%F).sql.gz
```

## Локальна розробка

```bash
service postgresql start
cd server && npm ci && npx prisma generate
cp .env.example .env     # для розробки: NODE_ENV=development, DATABASE_URL, JWT_SECRET
npx prisma migrate deploy && npm run seed && npm run dev      # API на :3101
cd ../client && npm ci && npm run dev                          # http://localhost:5173
```

Демо-логіни (пароль `demo1234`): `chief`, `deputy` — керівники; `bondar`, `shevchenko`, `tkachenko` — виконавці; `admin` — адміністратор.

**Перевірки перед комітом** (ті самі запускає GitHub Actions):
```bash
npm run check                                                   # з кореня: тексти і розмір файлів
cd server && npx tsc --noEmit -p . && npx vitest run && npm run build
cd ../client && npx vitest run && npm run build
```

Детальніше — скіл `.claude/skills/running-dev-workflow`.
