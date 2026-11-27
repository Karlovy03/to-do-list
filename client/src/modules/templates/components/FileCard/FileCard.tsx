import { t } from '@/shared/lib/texts';
import { extOfName, sizeText, typeLabel } from '../../lib/format';
import { TypeBadge } from '../TypeBadge/TypeBadge';
import css from './FileCard.module.css';

/** Обраний файл у пунктирній рамці (Figma 44): ім'я, розмір і тип, «Змінити» */
export function FileCard({ file, onChange }: { file: File; onChange: () => void }) {
  const ext = extOfName(file.name);
  return (
    <div className={css.card}>
      {ext && <TypeBadge ext={ext} />}
      <span className={css.text}>
        <span className={css.name}>{file.name}</span>
        <small className={css.meta}>
          {sizeText(file.size)}
          {ext && ` · ${typeLabel(ext)}`}
        </small>
      </span>
      <button type="button" className={css.change} onClick={onChange}>
        {t('templates.upload.change_file')}
      </button>
    </div>
  );
}

/** Ще не обрано: велика пунктирна кнопка «Обрати файл» */
export function FilePick({ onPick }: { onPick: () => void }) {
  return (
    <button type="button" className={`${css.card} ${css.pick}`} onClick={onPick}>
      <span className={css.name}>{t('templates.upload.pick')}</span>
      <small className={css.meta}>{t('templates.upload.pick_hint')}</small>
    </button>
  );
}
