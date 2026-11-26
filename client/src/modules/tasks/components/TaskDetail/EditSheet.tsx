import { useMemo, useState } from 'react';
import type { Person, Priority, TaskDetail } from '@/shared/api/types';
import { useSession } from '@/modules/auth';
import { usePeople, useUnits } from '@/shared/api/people';
import { t } from '@/shared/lib/texts';
import { unitPath } from '@/shared/lib/units';
import { Button, Chip, Chips, DateTimePicker, Field, FieldGroup, FormError, PeoplePicker, Sheet, TextArea } from '@/shared/ui';
import type { TaskChanges } from '../../api/tasks.api';
import { taskChanges } from '../../lib/taskChanges';

const PRIORITIES: Priority[] = ['NORMAL', 'HIGH', 'URGENT'];

interface Props {
  task: TaskDetail;
  busy: boolean;
  onSave: (changes: TaskChanges) => void;
  onClose: () => void;
}

/** Зміна назви, опису, пріоритету, терміну і виконавців; на сервер іде лише змінене */
export function EditSheet({ task, busy, onSave, onClose }: Props) {
  const { me } = useSession();
  const lead = !!me && me.role !== 'MEMBER';
  const people = usePeople();
  const units = useUnits();
  const describe = (p: Person) => [p.position, unitPath(p.unitId, units.data ?? [])].filter(Boolean).join(' · ');
  const active = useMemo(() => {
    const current = new Set(task.assignees.map((a) => a.id));
    return (people.data ?? []).filter((p) => p.isActive || current.has(p.id));
  }, [people.data, task.assignees]);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [deadline, setDeadline] = useState<Date>(new Date(task.deadline));
  const [assignees, setAssignees] = useState<string[]>(task.assignees.map((a) => a.id));
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!title.trim()) return setError(t('tasks.form.need_title'));
    if (!assignees.length) return setError(t('tasks.form.need_assignee'));
    const changes = taskChanges(task, { title, description, priority, deadline, assigneeIds: assignees });
    if (changes.deadline && new Date(changes.deadline).getTime() <= Date.now()) return setError(t('tasks.form.need_deadline'));
    if (!Object.keys(changes).length) return setError(t('tasks.edit.nothing_changed'));
    onSave(changes);
  };

  return (
    <Sheet
      title={t('tasks.edit.title')}
      onClose={onClose}
      footer={
        <Button variant="primary" size="l" block icon="check" disabled={busy} onClick={save}>
          {t('tasks.edit.save')}
        </Button>
      }
    >
      <Field label={t('tasks.form.what')}>
        <TextArea rows={2} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={t('tasks.edit.description')}>
        <TextArea rows={3} value={description} placeholder={t('tasks.form.details_placeholder')} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <FieldGroup label={t('tasks.edit.deadline')}>
        <DateTimePicker label={t('tasks.edit.deadline')} value={deadline} onChange={setDeadline} />
      </FieldGroup>
      <FieldGroup label={t('tasks.priority.label')}>
        <Chips>
          {PRIORITIES.map((p) => (
            <Chip key={p} on={priority === p} onClick={() => setPriority(p)}>
              {t(`tasks.priority.${p}`)}
            </Chip>
          ))}
        </Chips>
      </FieldGroup>
      {lead && (
        <Field label={t('tasks.form.who')} hint={t('tasks.edit.assignees_hint')}>
          <PeoplePicker people={active} selected={assignees} onChange={setAssignees} describe={describe} unitId={me?.unitId} placeholder={t('tasks.form.who_search')} />
        </Field>
      )}
      <FormError>{error}</FormError>
    </Sheet>
  );
}
