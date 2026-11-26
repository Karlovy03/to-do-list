import { useEffect, useRef } from 'react';
import css from './Segmented.module.css';

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
  label: string;
}

/** Перемикач вкладок; лічильник поруч із назвою */
export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  const root = useRef<HTMLDivElement>(null);
  // у вузькій колонці вкладки гортаються — обрана завжди на виду. Гортаємо лише сам перемикач
  // (scrollIntoView рухав би й сторінку) і щоразу, як змінюється ширина вкладок (шрифт Montserrat, лічильник)
  useEffect(() => {
    const reveal = () => {
      const box = root.current;
      const tab = box?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!box || !tab) return;
      const b = box.getBoundingClientRect();
      const r = tab.getBoundingClientRect();
      if (r.right > b.right) box.scrollLeft += r.right - b.right + 4;
      else if (r.left < b.left) box.scrollLeft -= b.left - r.left + 4;
    };
    reveal();
    void document.fonts?.ready.then(reveal);
    // ширина колонки встановлюється пізніше (дані списку, картка поруч) — показуємо обрану й тоді
    const ro = new ResizeObserver(reveal);
    for (const el of root.current?.children ?? []) ro.observe(el);
    return () => ro.disconnect();
  }, [value]);
  return (
    <div ref={root} className={css.root} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? css.on : undefined} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count !== undefined && o.count > 0 && <span className={css.count}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
