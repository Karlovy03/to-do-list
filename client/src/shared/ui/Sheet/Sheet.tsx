import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { pushLayer } from '../../lib/layers';
import { t } from '../../lib/texts';
import { IconButton } from '../Button';
import css from './Sheet.module.css';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** нижня панель з кнопками дії */
  footer?: ReactNode;
  /** суцільний фон — для аркуша поверх іншого аркуша (список, календар), щоб нижній не проступав */
  solid?: boolean;
}

/** Аркуш знизу на телефоні, діалог по центру на комп'ютері; Escape і клік по тлу закривають */
export function Sheet({ title, onClose, children, footer, solid }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  // свіжий onClose без перезапуску ефекту: інакше кожен рендер батька крав би фокус і місце в стеку шарів
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const layer = pushLayer();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && layer.isTop() && close.current();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      layer.pop();
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, []);

  return createPortal(
    <div className={css.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} tabIndex={-1} className={solid ? `${css.sheet} ${css.solid}` : css.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <div className={css.grip} />
        <div className={css.head}>
          <h2 className={css.title}>{title}</h2>
          <IconButton icon="x" tone="sunken" label={t('shared.ui.close')} onClick={onClose} />
        </div>
        <div className={css.body}>{children}</div>
        {footer && <div className={css.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
