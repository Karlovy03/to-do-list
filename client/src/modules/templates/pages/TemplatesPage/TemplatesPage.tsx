import { useEffect, useState, type DragEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '@/modules/auth';
import { errorText } from '@/shared/api/errors';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { placeOrRemembered, rememberPlace } from '@/shared/lib/deviceMemory';
import { t } from '@/shared/lib/texts';
import { Button, Chip, Chips, Empty, ErrorState, Loading, LoadMore, PageHeader } from '@/shared/ui';
import { EXTS, type Template } from '../../api/templates.api';
import { DropStrip } from '../../components/DropStrip/DropStrip';
import { SearchField } from '../../components/SearchField/SearchField';
import { TemplateRow } from '../../components/TemplateRow/TemplateRow';
import { TemplateSheet } from '../../components/TemplateSheet/TemplateSheet';
import { TemplatesGlance } from '../../components/TemplatesGlance/TemplatesGlance';
import { UploadSheet } from '../../components/UploadSheet/UploadSheet';
import { useTemplateList } from '../../hooks/useTemplates';
import { eyebrowText } from '../../lib/eyebrow';
import { readTemplates, writeTemplates, type TemplatesParams } from '../../lib/params';
import css from './TemplatesPage.module.css';

const TYPING_PAUSE_MS = 300;
const hasFiles = (e: DragEvent) => [...e.dataTransfer.types].includes('Files');

/**
 * «Шаблони» (Figma 42–48): бібліотека зразків документів для всіх. Пошук — за назвою, описом і текстом файлу.
 * Пошук і тип — в адресі; тип запам'ятовується для наступного входу з меню (ADR-0022).
 */
export function TemplatesPage() {
  const { me } = useSession();
  const wc = useWindowClass();
  const [sp, setSp] = useSearchParams();
  const params = readTemplates(me ? placeOrRemembered(sp, me.id, 'templates') : sp);
  const [text, setText] = useState(params.q);
  const list = useTemplateList(params.q, params.type);
  const [adding, setAdding] = useState<{ file: File | null } | null>(null);
  const [openId, setOpenId] = useState<{ id: string; snapshot: Template } | null>(null);
  const [dragging, setDragging] = useState(false);

  const set = (next: Partial<TemplatesParams>) => {
    const written = writeTemplates({ ...params, ...next });
    if (me) rememberPlace(me.id, 'templates', writeTemplates({ q: '', type: next.type ?? params.type }));
    setSp(written, { replace: true });
  };

  useEffect(() => {
    const q = text.replace(/\s+/g, ' ').trim();
    if (q === params.q) return;
    const timer = setTimeout(() => set({ q }), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
    // set і params змінюються з кожним рендером; чекаємо лише на текст людини
  }, [text]);

  const flip = wc === 'xs';
  const searching = !!params.q;
  const open = openId && (list.items.find((i) => i.id === openId.id) ?? openId.snapshot);
  const onOpen = (tpl: Template) => setOpenId({ id: tpl.id, snapshot: tpl });

  const drop = wc === 'lg' && {
    onDragOver: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragging(false);
      setAdding({ file: e.dataTransfer.files[0] ?? null });
    },
  };

  return (
    <div className={css.page} {...(drop || {})}>
      <PageHeader
        eyebrow={flip ? undefined : eyebrowText(searching, list.items, list.total, list.hasMore)}
        title={t('templates.page.title')}
        actions={
          flip || (wc === 'sm' && searching) ? undefined : (
            <Button variant="primary" icon="plus" onClick={() => setAdding({ file: null })}>
              {t('templates.page.add')}
            </Button>
          )
        }
      />
      <div className={wc === 'lg' ? `${css.bar} ${css.wide}` : css.bar}>
        <SearchField value={text} onChange={setText} />
        {!flip && (
          <Chips>
            <Chip on={!params.type} onClick={() => set({ type: '' })}>{t('templates.page.all')}</Chip>
            {EXTS.map((ext) => (
              <Chip key={ext} on={params.type === ext} onClick={() => set({ type: ext })}>{t(`templates.types.${ext}`)}</Chip>
            ))}
          </Chips>
        )}
      </div>
      {drop && <DropStrip active={dragging} onPick={() => setAdding({ file: null })} />}
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        searching || params.type ? <Empty icon="search" title={t('templates.page.nothing')} hint={t('templates.page.nothing_hint')} /> : <Empty icon="doc" title={t('templates.page.empty')} hint={t('templates.page.empty_hint')} />
      ) : flip ? (
        <TemplatesGlance items={list.items} total={searching ? list.items.length : list.total} onOpen={onOpen} />
      ) : (
        <>
          <section className={css.list}>
            {list.items.map((tpl) => <TemplateRow key={tpl.id} tpl={tpl} query={params.q} onOpen={() => onOpen(tpl)} />)}
          </section>
          {list.hasMore && <LoadMore onClick={list.loadMore} busy={list.loadingMore} />}
        </>
      )}
      {adding && <UploadSheet initialFile={adding.file} onClose={() => setAdding(null)} />}
      {open && <TemplateSheet key={open.id} tpl={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
