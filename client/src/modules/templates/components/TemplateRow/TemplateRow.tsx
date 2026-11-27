import { t } from '@/shared/lib/texts';
import { IconButton } from '@/shared/ui';
import type { Template } from '../../api/templates.api';
import { downloadTemplate } from '../../lib/download';
import { metaLine } from '../../lib/format';
import { Highlighted } from '../Highlighted/Highlighted';
import { TypeBadge } from '../TypeBadge/TypeBadge';
import css from './TemplateRow.module.css';

/** Рядок шаблону (Figma «Шаблон / Рядок»): тип, назва, опис, уривок зі збігом у тексті, «чий»; «Скачати» — одразу */
export function TemplateRow({ tpl, query, onOpen }: { tpl: Template; query: string; onOpen: () => void }) {
  const snippet = tpl.match?.in === 'content' ? tpl.match : null;
  return (
    <div className={css.row}>
      <button type="button" className={css.open} onClick={onOpen}>
        <TypeBadge ext={tpl.ext} />
        <span className={css.text}>
          <span className={css.name}>
            <Highlighted text={tpl.name} query={query} />
          </span>
          {tpl.description && (
            <span className={css.description}>
              <Highlighted text={tpl.description} query={query} />
            </span>
          )}
          {snippet?.snippet && (
            <span className={css.snippet}>
              <small className={css.found}>{t('templates.row.found_in_text')}</small>
              <span>
                {snippet.lead && '…'}
                <Highlighted text={snippet.snippet} query={query} />
                {snippet.tail && '…'}
              </span>
            </span>
          )}
          <small className={css.meta}>{metaLine(tpl)}</small>
        </span>
      </button>
      <IconButton icon="download" tone="sunken" label={t('templates.row.download')} onClick={() => downloadTemplate(tpl.id)} />
    </div>
  );
}
