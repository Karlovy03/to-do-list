import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { pushLayer } from '../../lib/layers';
import css from './Popover.module.css';

interface Props {
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  /** ширина — як у поля, або власна (календар) */
  width?: 'anchor' | number;
}

const GAP = 6;
const MARGIN = 12;

/** Вікно під полем (або над ним, якщо внизу мало місця); порталом у body, над аркушами */
export function Popover({ anchor, onClose, children, width = 'anchor' }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const w = width === 'anchor' ? r.width : Math.min(width, window.innerWidth - 2 * MARGIN);
      const below = window.innerHeight - r.bottom - GAP - MARGIN;
      const above = r.top - GAP - MARGIN;
      const h = box.current?.scrollHeight ?? 0;
      const up = h > below && above > below;
      const maxHeight = Math.max(160, up ? above : below);
      const top = up ? Math.max(MARGIN, r.top - GAP - Math.min(h, maxHeight)) : r.bottom + GAP;
      const left = Math.min(Math.max(MARGIN, r.left), window.innerWidth - w - MARGIN);
      setPos({ top, left, width: w, maxHeight });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor, width]);

  useEffect(() => {
    const layer = pushLayer();
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!layer.isTop() || box.current?.contains(target) || anchor.current?.contains(target)) return;
      close.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !layer.isTop()) return;
      e.stopPropagation();
      close.current();
      anchor.current?.focus();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey, true);
      layer.pop();
    };
  }, [anchor]);

  return createPortal(
    <div
      ref={box}
      className={css.popover}
      // до розміщення — прозорий, але не прихований: інакше поле пошуку не отримало б фокус
      style={pos ? { top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight } : { top: 0, left: 0, opacity: 0 }}
    >
      {children}
    </div>,
    document.body,
  );
}
