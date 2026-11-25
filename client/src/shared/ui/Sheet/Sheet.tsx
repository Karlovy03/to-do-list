import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../lib/texts';
import { IconButton } from '../Button';
import css from './Sheet.module.css';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** нижня панель з кнопками дії */
  footer?: ReactNode;
}

/** Аркуш знизу на телефоні, діалог по центру на комп'ютері; Escape і клік по тлу закривають */
export function Sheet({ title, onClose, children, footer }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className={css.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} tabIndex={-1} className={css.sheet} role="dialog" aria-modal="true" aria-label={title}>
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
