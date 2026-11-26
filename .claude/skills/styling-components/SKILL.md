---
name: styling-components
description: Styling rules for «Контроль» — single light theme, MVS-style design tokens, CSS Modules per component, z-index contract, mobile breakpoint, accessibility. Use for any visual change, new component, layout, or colour/spacing decision.
---

# Стилі

## Будова
```
client/src/styles/
  index.css              лише @import у порядку: base → utilities
  base/tokens.css        усі кольори, відступи, радіуси, тіні, шрифт, розміри елементів
  base/z-index.css       контракт шарів
  base/reset.css         скидання браузерних стилів
  base/typography.css    базовий текст, заголовки
  utilities/a11y.css     .visually-hidden, фокус
  utilities/print.css    друк (довідка для наради)
<будь-який компонент>/X.module.css   стилі лише цього компонента
```

## Правила
- **Одна тема — світла.** Жодних `prefers-color-scheme`, жодного перемикача теми.
- **Кольори, відступи, радіуси, тіні, z-index — лише через токени** (`var(--…)`). Нове значення спершу стає токеном у `tokens.css`.
- **Кожен компонент — свій `X.module.css` поруч із `X.tsx`.** Глобальні класи — лише в `styles/base` і `styles/utilities`.
- Насичений колір — лише сигнал: червоний `--control` — контроль, `--warn` — прострочено, `--ok` — виконано. Основа — темно-синій `--brand` із золотим акцентом `--gold`.
- **Брендбук МВС**: значення кольорів і шрифт — тимчасові, поки власник не надасть PDF. Міняємо лише значення в `tokens.css`, назви токенів лишаються. Герб МВС без письмового дозволу не використовуємо — знак застосунку нейтральний (`BrandMark`).
- Іконки — власний набір SVG (`shared/ui/Icon`), `stroke="currentColor"`. Без емодзі.

## Шари (z-index)
Лише токени з `base/z-index.css`, ніколи число: `--z-sticky` < `--z-nav` < `--z-header` < `--z-sheet` < `--z-popover` < `--z-toast`. Аркуші й випадні списки рендеряться порталом у `body`. Escape і клік поза шаром закривають лише верхній шар (`shared/lib/layers`).

## Жодних системних вікон браузера
- Не використовувати `<select>`, `<input type="date|time|datetime-local">` і атрибут `title`: їхні вікна малює браузер, і вони не в стилі системи.
- Короткий вибір (до ~5 варіантів) — капсули `Chips` або `Segmented`; довгий — `Picker` (на телефоні аркуш, ширше — вікно під полем, пошук через `searchable`); дата й час — `DateTimePicker` (час за Києвом); підказка при наведенні — `data-tip="…"`.
- Групу кнопок підписувати `FieldGroup`, не `Field`: `<label>` навколо кількох кнопок «натискає» першу при кліку на підпис.
- Аркуш поверх іншого аркуша — `<Sheet solid>`, інакше нижній проступає крізь скло.
- Перевірка, що системних вікон немає (порожній вивід = добре; ловить `<select>`, нативні поля дати й `title` на HTML-тегах, але не проп `title` компонентів):
  `grep -rnE "<select|type=\"(date|time|datetime-local)\"|<[a-z][a-z0-9]*( [^>]*)? title=" client/src --include=*.tsx`

## Мобільна версія
- Один брейкпоінт оболонки: **768px** (нижня навігація ↔ бічна панель). Інші — лише для дрібних уточнень.
- `100dvh`, `env(safe-area-inset-*)` для нижньої панелі, аркушів і кнопки «+».
- Цілі для дотику ≥ 44px. Перевірка на 360, 390, 768, 1280px.

## Доступність
Контраст AA; `:focus-visible`; `aria-label` для кнопок-іконок; `role="dialog"` + Escape для аркушів; стани «порожньо / завантаження / помилка» на кожному екрані.
