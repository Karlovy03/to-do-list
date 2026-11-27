---
name: working-on-templates
description: Rules for the «Шаблони» module of «Контроль» (document templates library: Word .docx, Excel .xlsx, PDF) — where files live on disk, how uploads are checked (allow-list, macros/embedded objects/external links/DDE, PDF code and attachments, fail-closed child process), who may change or delete a template, how content search and snippets work, backups of the files. Use before changing anything under server/src/modules/templates or client/src/modules/templates, the Template model, upload limits, accepted formats, the files_data volume, or scripts/backup.sh / restore.sh.
---

# Шаблони (ADR-0023)

## Файли
- Диск змінює лише `templates.storage.ts`: тимчасова тека, перенесення під випадковий ключ, видалення, прибирання сиріт. Дочірній процес перевірки лише **читає** файл за шляхом, який йому дали.
- Ключ — 32 hex; `pathOf` інші відхиляє. Ім'я від користувача шляхом не стає ніколи.
- Файл не змінюється на місці: заміна — новий ключ, старий видаляється **після** запису в базу. На цьому тримається поступове копіювання в `scripts/backup.sh`.
- Тимчасовий файл прибирає `receiveFile` по закриттю відповіді — за будь-якого результату.
- Перевірка (має бути порожньо — fs поза сховищем і перевіркою):
  `grep -rnE "from 'node:fs|from 'fs" server/src/modules/templates --include=*.ts | grep -vE "templates\.storage\.ts:|check/worker\.ts:|\.spec\.ts:"`
  Контроль: `grep -rnE "from 'node:fs|from 'fs" server/src/modules/templates --include=*.ts | grep -cE "templates\.storage\.ts:|check/worker\.ts:"` — не нуль.

## Формати й перевірка вмісту
- Лише `.docx`, `.xlsx`, `.pdf` (до 20 МБ). Старі `.doc/.xls/.rtf` — `template_old_format` з порадою зберегти по-новому; повернути їх — лише новим ADR.
- Рішення приймається **за байтами**: сигнатура має збігатися з розширенням; тип від браузера не враховується.
- Принцип «дозволено лише відоме»: відхиляється будь-який активний вміст, а не «відомі віруси». Нове правило — у `inspect/ooxml.ts` чи `inspect/pdf.ts` і **з парою тестів** у `inspect/inspect.spec.ts`: файл, на якому має спрацювати, і схожий легітимний, на якому не має. Тестові файли збирає `inspect/files.fixture.ts` (двійкових файлів у репозиторії немає).
- PDF: межам потоків не довіряти — імена шукати по всьому файлу й у кожному розпакованому Flate-потоці; лише довгі імена (короткі на кшталт `/JS` трапляються у випадкових байтах). Другий рубіж — pdf.js (`extract/pdf-doc.ts`). Без увімкнених скриптів pdf.js сам код не віддає, лише сам факт: `hasJSActions()`, сторінкові дії `!== null`.
- **Закрито за замовчуванням:** немає вердикту від дочірнього процесу (падіння, тайм-аут, межа розпакування) — файл не приймається. Текст не прочитано за готового вердикту — приймається з `textStatus: FAILED`.
- Розбір чужого файлу — лише в дочірньому процесі (`check/`), одна перевірка за раз; основний процес файл у пам'ять не читає.
- Будь-яка зміна перевірки — мутаційна перевірка: вимкнути правило → його тест падає.

## Права — лише в `templates.policy.ts`
- Бачать і додають усі, хто увійшов. Замінити, змінити, видалити — той, хто додав, або `managesUnits` його підрозділу (директор і адмін — завжди).
- Зміна прав — з негативним тестом у `templates.policy.spec.ts` і в `integration/templates.db.spec.ts`.
- Перевірка (має бути порожньо):
  `grep -rnE "managesUnits|hasFullAccess|role === '" server/src/modules/templates --include=*.ts | grep -vE "\.policy(\.spec)?\.ts:"`
  Контроль: та сама команда з `| grep -c "templates.policy.ts:"` замість `grep -vE …` — не нуль.

## Пошук
- `searchText` = назва \n опис \n текст, у нижньому регістрі через `foldCase` (посимвольно, без зміни довжини). Регістр знижує JS, а не SQL: результат не залежить від локалі бази, позиції збігу точно вказують місце в `content` для уривка.
- Назву чи опис змінено — `searchText` перерахувати (сервіс бере наявний `content`).
- Prisma — лише в `templates.repository.ts`. Перевірка (має бути порожньо):
  `grep -rnE "\bprisma\.[a-z\$]" server/src/modules/templates --include=*.ts | grep -vE "templates\.repository\.ts:"`
  Контроль: `grep -rnE "\bprisma\.[a-z\$]" server/src/modules/templates --include=*.ts | grep -c "templates.repository.ts:"` — не нуль.

## Клієнт
- Підсвітка збігу — React-розміткою (`lib/highlight.ts`), ніколи не вставкою HTML. Перевірка (має бути порожньо):
  `grep -rn "dangerouslySetInnerHTML\|innerHTML" client/src/modules/templates`
  Контроль: `printf '<p dangerouslySetInnerHTML={{ __html: s }} />\n' | grep -c "dangerouslySetInnerHTML\|innerHTML"` — 1.
- Перевірка до надсилання (`fileProblem`) повертає **ті самі коди**, що й сервер, і тексти в `shared/texts/errors.yml` спільні. Остаточно вирішує сервер.
- Рядок «Мета»: нерозривний пробіл перед «·» і між числом та одиницею (правка власника у Figma 42).
- Скачування — звичайне посилання (браузер іде з cookie). У мобільних застосунках вхід — токен у заголовку, тож там потрібен інший шлях (IDEAS).

## Резервні копії
- `scripts/backup.sh` копіює лише нові файли (`comm` списків, `tar` через `docker compose exec`); файли видалених шаблонів у дзеркалі лишаються — на них може посилатися старіший дамп.
- `scripts/restore.sh` повертає файли через контейнер застосунку (власник — `node`), а не `docker compose cp` (той дав би файли root).
