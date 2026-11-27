import { useRef, useState } from 'react';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { Button, Field, FormError, Input, Sheet, SheetFooter } from '@/shared/ui';
import { useUploadTemplate } from '../../hooks/useTemplateActions';
import { fileProblem, nameFromFile } from '../../lib/format';
import { FileCard, FilePick } from '../FileCard/FileCard';
import { UploadProgress } from '../UploadProgress/UploadProgress';
import { ACCEPT } from './FilePicker';
import css from './UploadSheet.module.css';

/**
 * «Додати шаблон» (Figma 44): файл, назва (з імені файлу), опис, попередження про гриф і персональні дані.
 * Розширення й розмір перевіряються одразу, вміст — на сервері.
 */
export function UploadSheet({ initialFile, onClose }: { initialFile?: File | null; onClose: () => void }) {
  const upload = useUploadTemplate();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [name, setName] = useState(initialFile ? nameFromFile(initialFile.name) : '');
  const [description, setDescription] = useState('');
  const problem = file && fileProblem(file);
  const busy = upload.isPending;

  const choose = (next: File | undefined) => {
    if (!next) return;
    // назву, яку людина не міняла, підлаштовуємо під новий файл
    if (!name.trim() || (file && name === nameFromFile(file.name))) setName(nameFromFile(next.name));
    setFile(next);
    upload.reset();
  };
  const submit = () => {
    if (!file || problem || !name.trim()) return;
    upload.mutate({ file, fields: { name: name.trim(), description: description.trim() || undefined } }, { onSuccess: onClose });
  };

  return (
    <Sheet title={t('templates.upload.title')} onClose={onClose}>
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => choose(e.target.files?.[0])} />
      {file ? <FileCard file={file} onChange={() => input.current?.click()} /> : <FilePick onPick={() => input.current?.click()} />}
      <div className={css.fields}>
        <Field label={t('templates.upload.name')}>
          <Input value={name} maxLength={200} disabled={busy} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('templates.upload.description')}>
          <Input value={description} maxLength={500} disabled={busy} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
      <p className={css.hint}>{t('templates.upload.hint')}</p>
      <p className={css.warn}>{t('templates.upload.classified')}</p>
      {upload.progress !== null && <UploadProgress share={upload.progress} />}
      <FormError>{problem ? t(`shared.errors.${problem}`) : upload.error ? errorText(upload.error) : null}</FormError>
      <SheetFooter>
        <Button variant="primary" size="l" block disabled={!file || !!problem || !name.trim() || busy} onClick={submit}>
          {busy ? t('templates.upload.adding') : t('templates.upload.add')}
        </Button>
      </SheetFooter>
    </Sheet>
  );
}
