import { useState } from 'react';
import { t } from '@/shared/lib/texts';
import type { Template } from '../../api/templates.api';
import { sizeText } from '../../lib/format';
import { TypeBadge } from '../TypeBadge/TypeBadge';
import css from './TemplatesGlance.module.css';

const FIRST = 3;

/** Flip 320×350 (Figma 48): перші три шаблони коротко, решта — «та ще N ›» */
export function TemplatesGlance({ items, total, onOpen }: { items: Template[]; total: number; onOpen: (tpl: Template) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, FIRST);
  const rest = Math.max(total, items.length) - shown.length;
  return (
    <section className={css.card}>
      {shown.map((tpl) => (
        <button key={tpl.id} type="button" className={css.item} onClick={() => onOpen(tpl)}>
          <TypeBadge ext={tpl.ext} small />
          <span className={css.text}>
            <span className={css.name}>{tpl.name}</span>
            <small className={css.size}>{sizeText(tpl.size)}</small>
          </span>
        </button>
      ))}
      {!all && rest > 0 && (
        <button type="button" className={css.more} onClick={() => setAll(true)}>
          {t('templates.page.more', { n: rest })} ›
        </button>
      )}
    </section>
  );
}
