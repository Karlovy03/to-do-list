import { t } from '@/shared/lib/texts';
import css from './UploadProgress.module.css';

/**
 * Смуга ходу (Figma 44). Після надсилання сервер ще перевіряє файл і читає текст —
 * тому до відповіді не більше 99 %.
 */
export function UploadProgress({ share }: { share: number }) {
  const pct = Math.min(99, Math.round(share * 100));
  return (
    <div className={css.wrap} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('templates.upload.progress')}>
      <div className={css.line}>
        <span>{t('templates.upload.progress')}</span>
        <b>{pct}%</b>
      </div>
      <div className={css.track}>
        <span className={css.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
