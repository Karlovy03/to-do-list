import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NewEventForm } from '@/modules/events';
import { NewTaskForm } from '@/modules/tasks';
import type { Me } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { Segmented, Sheet } from '@/shared/ui';

export type CreateKind = 'task' | 'event';

/**
 * «Створити» (Figma 14): одна кнопка «+» — завдання або захід. Обидві форми живуть, поки аркуш відкритий:
 * перемикання не губить уже введене, а кнопку внизу показує лише видима.
 */
export function CreateSheet({ me, initial, onClose }: { me: Me; initial: CreateKind; onClose: () => void }) {
  const [kind, setKind] = useState<CreateKind>(initial);
  const navigate = useNavigate();
  const done = (to: string) => {
    onClose();
    navigate(to);
  };
  return (
    <Sheet title={t('app.create.title')} onClose={onClose}>
      <Segmented
        label={t('app.create.kind')}
        value={kind}
        options={[
          { value: 'task', label: t('app.create.task') },
          { value: 'event', label: t('app.create.event') },
        ]}
        onChange={setKind}
      />
      <div hidden={kind !== 'task'}>
        <NewTaskForm me={me} active={kind === 'task'} onCreated={(task) => done(`/authored/t/${task.id}`)} />
      </div>
      <div hidden={kind !== 'event'}>
        <NewEventForm me={me} active={kind === 'event'} onCreated={(e) => done(`/events/e/${e.id}`)} />
      </div>
    </Sheet>
  );
}
