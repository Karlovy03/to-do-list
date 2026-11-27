import { t } from '../../lib/texts';
import { formatTime } from '../../lib/time';
import css from './DraftNote.module.css';

/** «Відновлено чернетку · 08:12 · Очистити» над формою «Створити» (Figma 41) */
export function DraftNote({ savedAt, onClear }: { savedAt: string; onClear: () => void }) {
  return (
    <div className={css.note} role="status">
      <span className={css.text}>{t('shared.ui.draft_restored', { time: formatTime(savedAt) })}</span>
      <button type="button" className={css.clear} onClick={onClear}>
        {t('shared.ui.draft_clear')}
      </button>
    </div>
  );
}
