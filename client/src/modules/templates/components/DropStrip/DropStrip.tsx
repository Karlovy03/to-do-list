import { t } from '@/shared/lib/texts';
import { Icon } from '@/shared/ui';
import css from './DropStrip.module.css';

/** Комп'ютер (Figma 46): файл можна перетягнути на сторінку; смуга — підказка і кнопка вибору водночас */
export function DropStrip({ active, onPick }: { active: boolean; onPick: () => void }) {
  return (
    <button type="button" className={active ? `${css.strip} ${css.active}` : css.strip} onClick={onPick}>
      <Icon name="upload" size={22} />
      {t(active ? 'templates.page.drop_now' : 'templates.page.drop')}
    </button>
  );
}
