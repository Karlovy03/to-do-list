import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ControlInput, Me, Person, Priority } from '@/shared/api/types';
import { unitPath } from '@/shared/lib/units';
import { usePeople, useUnits } from '@/shared/api/people';
import { ControlFields, isComplete, normalize } from '@/modules/control';
import { t } from '@/shared/lib/texts';
import { Button, Chip, Chips, DateTimePicker, Field, FormError, PeoplePicker, Sheet, Switch, TextArea } from '@/shared/ui';
import { useCreateTask } from '../../hooks/useTaskActions';
import { quickDeadlines } from '../../lib/deadlines';
import css from './QuickAddSheet.module.css';

const PRIORITIES: Priority[] = ['NORMAL', 'HIGH', 'URGENT'];

/** Швидке додавання: назва, кому, термін, пріоритет і — для керівника — контроль */
export function QuickAddSheet({ me, onClose }: { me: Me; onClose: () => void }) {
  const lead = me.role !== 'MEMBER';
  const people = usePeople();
  const units = useUnits();
  const describe = (p: Person) => [p.position, unitPath(p.unitId, units.data ?? [])].filter(Boolean).join(' · ');
  const create = useCreateTask();
  const navigate = useNavigate();
  const quick = useMemo(() => quickDeadlines(), []);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<string[]>(lead ? [] : [me.id]);
  const [deadline, setDeadline] = useState<Date | null>(quick[0]?.at ?? null);
  const [custom, setCustom] = useState(false);
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [control, setControl] = useState<ControlInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!title.trim()) return setError(t('tasks.form.need_title'));
    if (!assignees.length) return setError(t('tasks.form.need_assignee'));
    if (!deadline || deadline.getTime() <= Date.now()) return setError(t('tasks.form.need_deadline'));
    if (control && !isComplete(control)) return setError(t('control.control.need_who'));
    create.mutate(
      { title: title.trim(), description: description?.trim() || undefined, priority, deadline: deadline.toISOString(), assigneeIds: assignees, control: control && normalize(control) },
      { onSuccess: (task) => { onClose(); navigate(`/authored/t/${task.id}`); } },
    );
  };

  return (
    <Sheet
      title={t('tasks.form.title')}
      onClose={onClose}
      footer={
        <Button variant="primary" size="l" block icon="check" disabled={create.isPending} onClick={submit}>
          {t('tasks.form.submit')}
        </Button>
      }
    >
      <div className={css.form}>
        <Field label={t('tasks.form.what')}>
          <TextArea autoFocus rows={2} value={title} placeholder={t('tasks.form.what_placeholder')} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        {description === null ? (
          <Button variant="outline" size="s" icon="plus" className={css.inline} onClick={() => setDescription('')}>
            {t('tasks.form.details')}
          </Button>
        ) : (
          <TextArea rows={3} value={description} aria-label={t('tasks.form.details')} placeholder={t('tasks.form.details_placeholder')} onChange={(e) => setDescription(e.target.value)} />
        )}

        {lead && (
          <Field label={t('tasks.form.who')}>
            <PeoplePicker people={(people.data ?? []).filter((p) => p.isActive)} selected={assignees} onChange={setAssignees} describe={describe} placeholder={t('tasks.form.who_search')} />
          </Field>
        )}

        <div className={css.group}>
          <span className={css.label}>{t('tasks.form.deadline')}</span>
          <Chips>
            {quick.map((q) => (
              <Chip key={q.key} icon="clock" on={!custom && deadline?.getTime() === q.at.getTime()} onClick={() => { setCustom(false); setDeadline(q.at); }}>
                {t(`tasks.form.${q.key}`)}
              </Chip>
            ))}
            <Chip on={custom} onClick={() => setCustom(true)}>{t('tasks.form.custom_deadline')}</Chip>
          </Chips>
          {custom && (
            <DateTimePicker label={t('tasks.form.custom_deadline')} value={deadline} onChange={setDeadline} />
          )}
        </div>

        <div className={css.group}>
          <span className={css.label}>{t('tasks.priority.label')}</span>
          <Chips>
            {PRIORITIES.map((p) => (
              <Chip key={p} on={priority === p} onClick={() => setPriority(p)}>{t(`tasks.priority.${p}`)}</Chip>
            ))}
          </Chips>
        </div>

        {lead && (
          <div className={control ? `${css.control} ${css.on}` : css.control}>
            <Switch checked={!!control} label={t('control.control.toggle')} hint={t('control.control.toggle_hint')} onChange={(on) => setControl(on ? { by: { type: 'self' }, basis: '', reminderInterval: null } : null)} />
            {control && <ControlFields value={control} onChange={setControl} />}
          </div>
        )}
        <FormError>{error}</FormError>
      </div>
    </Sheet>
  );
}
