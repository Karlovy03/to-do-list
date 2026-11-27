import { t } from '@/shared/lib/texts';
import { Icon, Input } from '@/shared/ui';
import css from './SearchField.module.css';

/** «Пошук за назвою і текстом» (Figma 42–43): лупа в полі; Escape очищає */
export function SearchField({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  return (
    <div className={css.wrap}>
      <span className={css.icon} aria-hidden>
        <Icon name="search" size={20} />
      </span>
      <Input
        type="search"
        className={css.input}
        value={value}
        maxLength={100}
        placeholder={t('templates.page.search')}
        aria-label={t('templates.page.search')}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape' || !value) return;
          // перший Escape очищає пошук, а не закриває аркуш чи сторінку
          e.stopPropagation();
          onChange('');
        }}
      />
    </div>
  );
}
