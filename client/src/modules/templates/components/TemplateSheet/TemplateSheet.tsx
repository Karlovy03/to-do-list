import { useRef, useState } from 'react';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { Button, FormError, Icon, Sheet, SheetFooter, type IconName } from '@/shared/ui';
import type { Template } from '../../api/templates.api';
import { useTemplateActions } from '../../hooks/useTemplateActions';
import { downloadTemplate, openTemplate } from '../../lib/download';
import { fileProblem, metaLine } from '../../lib/format';
import { EditSheet } from '../EditSheet/EditSheet';
import { ACCEPT } from '../UploadSheet/FilePicker';
import { UploadProgress } from '../UploadProgress/UploadProgress';
import { TypeBadge } from '../TypeBadge/TypeBadge';
import { TextState } from './TextState';
import css from './TemplateSheet.module.css';

/**
 * Картка шаблону (Figma 45): що це і чий; чи знайдеться за текстом; «Скачати», «Відкрити» (PDF).
 * Замінити, змінити й видалити — лише кому дозволено (той, хто додав, його керівник, адміністратор).
 */
export function TemplateSheet({ tpl, onClose }: { tpl: Template; onClose: () => void }) {
  const a = useTemplateActions(tpl.id);
  const input = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const [problem, setProblem] = useState<string | null>(null);

  if (mode === 'edit') return <EditSheet tpl={tpl} onClose={onClose} />;
  if (mode === 'delete') {
    return (
      <Sheet title={t('templates.card.delete_title')} onClose={onClose}>
        <p className={css.confirm}>{t('templates.card.delete_confirm', { name: tpl.name })}</p>
        <SheetFooter>
          <div className={css.buttons}>
            <Button variant="outline" size="l" block onClick={() => setMode('view')}>{t('templates.card.cancel')}</Button>
            <Button variant="danger" size="l" block disabled={a.remove.isPending} onClick={() => a.remove.mutate(undefined, { onSuccess: onClose })}>
              {t('templates.card.delete')}
            </Button>
          </div>
        </SheetFooter>
      </Sheet>
    );
  }

  const replace = (file: File | undefined) => {
    if (!file) return;
    const p = fileProblem(file);
    setProblem(p);
    if (!p) a.replace.mutate(file);
  };
  const action = (icon: IconName, label: string, onClick: () => void, danger = false) => (
    <button type="button" className={danger ? `${css.action} ${css.danger}` : css.action} disabled={a.replace.isPending} onClick={onClick}>
      <Icon name={icon} size={22} />
      {label}
    </button>
  );

  return (
    <Sheet title={tpl.name} onClose={onClose}>
      <div className={css.info}>
        <TypeBadge ext={tpl.ext} />
        <span className={css.text}>
          {tpl.description && <span className={css.description}>{tpl.description}</span>}
          <small className={css.meta}>{metaLine(tpl)}</small>
        </span>
      </div>
      <TextState tpl={tpl} />
      {tpl.can.change && (
        <div className={css.actions}>
          <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => replace(e.target.files?.[0])} />
          {action('upload', t('templates.card.replace'), () => input.current?.click())}
          {action('edit', t('templates.card.edit'), () => setMode('edit'))}
          {action('x', t('templates.card.delete'), () => setMode('delete'), true)}
        </div>
      )}
      {a.replace.progress !== null && <UploadProgress share={a.replace.progress} />}
      <FormError>{problem ? t(`shared.errors.${problem}`) : a.replace.error ? errorText(a.replace.error) : null}</FormError>
      <SheetFooter>
        <div className={css.buttons}>
          {tpl.ext === 'pdf' && (
            <Button variant="outline" size="l" block onClick={() => openTemplate(tpl.id)}>{t('templates.card.open')}</Button>
          )}
          <Button variant="primary" size="l" block icon="download" onClick={() => downloadTemplate(tpl.id)}>{t('templates.card.download')}</Button>
        </div>
      </SheetFooter>
    </Sheet>
  );
}
