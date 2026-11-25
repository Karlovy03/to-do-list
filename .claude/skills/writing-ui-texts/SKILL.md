---
name: writing-ui-texts
description: Rules for every user-visible string in «Контроль» — YAML files per module, key scheme, interpolation, server error codes. Use whenever adding or changing any text on screen, in push notifications, or in the web manifest.
---

# Тексти інтерфейсу і сповіщень

Мова — **лише українська**; шару перекладу немає. Але жоден текст не живе в коді: лише ключі.

## Де лежать
| Пакет | Файл | Ключ |
|---|---|---|
| client | `src/modules/<м>/texts/<група>.yml` | `t('<м>.<група>.<ключ>')` |
| client | `src/app/texts/<група>.yml` | `t('app.<група>.<ключ>')` |
| client | `src/shared/texts/<група>.yml` | `t('shared.<група>.<ключ>')` |
| server | `src/modules/<м>/texts/<група>.yml` | `tx('<м>.<група>.<ключ>')` |
| server | `src/shared/texts/<група>.yml` | `tx('shared.<група>.<ключ>')` |

## Правила
- **Один файл — одна змістова група** (наприклад, `tasks/texts/status.yml`, `tasks/texts/actions.yml`). Не складаємо все в один файл модуля.
- Файл — плоский словник `ключ: "текст"`, перший рядок — коментар `# Про що ця група`.
- Підстановки — `{n}`, `{time}`: `t('control.intervals.every', { n: 2 })`. Склеювати речення з шматків у коді не можна — краще окремий ключ на кожен варіант.
- Сервер **не повертає людських текстів помилок**: лише код (`{ error: 'comment_required' }`); текст для коду — у YAML клієнта (`shared/texts/errors.yml` або `texts/errors.yml` модуля).
- Push: заголовок і тіло формує сервер з YAML; підписи кнопок у сповіщенні передаються в payload — service worker текстів не містить.
- Назва застосунку в `index.html` і маніфесті генерується з `app/texts/common.yml` на збірці.
- Коментарі в коді можна писати українською — ворота їх ігнорують. Тестові файли `*.spec.*` теж (назви тестів українською).
- Повідомлення для розробника (`throw new Error`, логи) — англійською, вони не для користувача.
- Демо-дані — у YAML-фікстурі, не в коді.

## Перевірка
```bash
npm run check:texts       # з кореня; exit 1 і перелік рядків з кирилицею поза коментарями
```
Сервер також має тест, що кожен ключ `'<м>.<група>.<ключ>'`, згаданий у коді, існує в YAML (`server/src/core/texts.spec.ts`).
