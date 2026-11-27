import { useState } from 'react';
import { errorText } from '@/shared/api/errors';
import { t } from '@/shared/lib/texts';
import { Button, Field, FormError, Input, Sheet, SheetFooter } from '@/shared/ui';
import type { Template } from '../../api/templates.api';
import { useTemplateActions } from '../../hooks/useTemplateActions';
import css from './EditSheet.module.css';

/** «Змінити назву й опис»: файл і текст для пошуку лишаються ті самі */
export function EditSheet({ tpl, onClose }: { tpl: Template; onClose: () => void }) {
  const { update } = useTemplateActions(tpl.id);
  const [name, setName] = useState(tpl.name);
  const [description, setDescription] = useState(tpl.description ?? '');
  const save = () => update.mutate({ name: name.trim(), description: description.trim() || null }, { onSuccess: onClose });
  return (
    <Sheet title={t('templates.card.edit')} onClose={onClose}>
      <div className={css.fields}>
        <Field label={t('templates.upload.name')}>
          <Input autoFocus value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t('templates.upload.description')}>
          <Input value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
      <FormError>{update.error ? errorText(update.error) : null}</FormError>
      <SheetFooter>
        <Button variant="primary" size="l" block disabled={!name.trim() || update.isPending} onClick={save}>
          {t('templates.card.save')}
        </Button>
      </SheetFooter>
    </Sheet>
  );
}
