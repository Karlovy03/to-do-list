import { useRef, useState, type PointerEvent } from 'react';

const THRESHOLD = 0.35;

/** Свайп праворуч по картці; клік після свайпу не відкриває картку */
export function useSwipe(enabled: boolean, onSwipe: () => void) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; w: number } | null>(null);
  const moved = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (!enabled || e.pointerType === 'mouse') return;
    start.current = { x: e.clientX, y: e.clientY, w: e.currentTarget.offsetWidth };
    moved.current = false;
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s) return;
    const x = e.clientX - s.x;
    const y = e.clientY - s.y;
    if (!moved.current && Math.abs(y) > Math.abs(x)) {
      start.current = null; // вертикальна прокрутка — не свайп
      return;
    }
    if (x > 8) moved.current = true;
    setDx(Math.max(0, x));
  };
  const end = () => {
    const s = start.current;
    start.current = null;
    if (s && dx > s.w * THRESHOLD) onSwipe();
    setDx(0);
  };
  const onClickCapture = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
    }
  };

  return { dx, handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onClickCapture } };
}
