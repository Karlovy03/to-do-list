import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@/shared/lib/texts';
import shout from '../../assets/lizard/lizard-shout.webp';
import wave from '../../assets/lizard/lizard-wave.webp';
import { hideCheer, useCheer } from '../../lib/cheer';
import css from './LizardCheer.module.css';

const SHOW_MS = 2200;
/** хто вимкнув анімації в системі — нерухомий кадр на секунду */
const STILL_MS = 1000;
const FRAME_MS = 250;

/**
 * Ящірка «Виконано!» (Figma 22, ADR-0018): над тостом, нічого не блокує, без звуку.
 * Монтується один раз в оболонці; зображення вантажаться лише в момент показу.
 */
export function LizardCheer() {
  const shownAt = useCheer();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (shownAt === null) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hide = window.setTimeout(hideCheer, still ? STILL_MS : SHOW_MS);
    const tick = still ? undefined : window.setInterval(() => setFrame((f) => 1 - f), FRAME_MS);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hideCheer();
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(hide);
      window.clearInterval(tick);
      document.removeEventListener('keydown', onKey);
      setFrame(0);
    };
  }, [shownAt]);

  if (shownAt === null) return null;
  return createPortal(
    <div className={css.layer}>
      <div key={shownAt} className={css.stage}>
        <span className={css.bubble} role="status">{t('tasks.cheer.done')}</span>
        <button type="button" className={css.lizard} aria-label={t('tasks.cheer.close')} onClick={hideCheer}>
          <img src={shout} alt="" className={frame === 0 ? undefined : css.hidden} draggable={false} />
          <img src={wave} alt="" className={frame === 1 ? undefined : css.hidden} draggable={false} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
