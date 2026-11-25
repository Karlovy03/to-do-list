---
name: writing-tests
description: How tests are written and run in «Контроль» — vitest in both packages, spec naming, pure-function tests, mocked repositories, mandatory negative tests for permission changes. Use when adding or changing any test or verifying a change.
---

# Тести

- **vitest** в обох пакетах. Файли `*.spec.ts(x)` поруч із кодом. Інші назви не запускаються.
- Логіка, від якої залежать гроші/права/нагадування, — **чиста функція** з тестами (`reminders/plan.ts`, `task.policy.ts`).
- Сервіси тестуємо з **замоканими репозиторіями** (`vi.mock('./task.repository')`), без бази даних.
- Час: передаємо `now` аргументом; дати — в UTC з коментарем, яка це година в Києві.
- **Зміна прав — лише з негативними тестами**: той, хто має право, — проходить; хто не має — отримує 404/403; невидиме — 404.
- Назва тесту — твердження українською («не нагадує в тихі години»). Один тест — одна поведінка.
- Очікуване значення беремо з незалежного джерела (умови задачі), а не перераховуємо тим самим кодом.

```bash
cd server && npx vitest run          # усі тести сервера; exit 1 при падінні
```
