import { t } from '@/shared/lib/texts';
import { Button, Icon, Sheet } from '@/shared/ui';
import css from './TaskDetail.module.css';

/** Підтвердження видалення: дія незворотна, тому окремий аркуш з попередженням */
export function DeleteSheet({ title, busy, onConfirm, onClose }: { title: string; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet
      title={t('tasks.actions.delete_title')}
      onClose={onClose}
      footer={
        <Button variant="danger" size="l" block icon="x" disabled={busy} onClick={onConfirm}>
          {t('tasks.actions.delete_confirm')}
        </Button>
      }
    >
      <p className={css.deleteTask}>{title}</p>
      <p className={css.deleteWarning}>
        <Icon name="alert" size={20} />
        {t('tasks.actions.delete_warning')}
      </p>
      <p className={css.deleteHint}>{t('tasks.actions.delete_hint')}</p>
    </Sheet>
  );
}
