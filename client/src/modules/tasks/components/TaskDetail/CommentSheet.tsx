import { useState } from 'react';
import { t } from '@/shared/lib/texts';
import { toLocalInput } from '@/shared/lib/time';
import { Button, Field, FormError, Input, Sheet, TextArea, type ButtonVariant } from '@/shared/ui';

interface Props {
  title: string;
  label: string;
  required: boolean;
  confirmLabel: string;
  variant?: ButtonVariant;
  /** термін минув — потрібен новий */
  needsDeadline?: boolean;
  busy?: boolean;
  onConfirm: (comment: string, deadline?: string) => void;
  onClose: () => void;
}

/** Аркуш з коментарем: повернення в роботу, дострокове закриття, скасування */
export function CommentSheet({ title, label, required, confirmLabel, variant = 'primary', needsDeadline, busy, onConfirm, onClose }: Props) {
  const [comment, setComment] = useState('');
  const [deadline, setDeadline] = useState(toLocalInput(new Date(Date.now() + 2 * 864e5)));
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    if (required && !comment.trim()) return setError(t('tasks.actions.comment_required'));
    if (needsDeadline && new Date(deadline).getTime() <= Date.now()) return setError(t('tasks.form.need_deadline'));
    onConfirm(comment.trim(), needsDeadline ? new Date(deadline).toISOString() : undefined);
  };

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <Button variant={variant} size="l" disabled={busy} onClick={confirm}>
          {confirmLabel}
        </Button>
      }
    >
      <Field label={label}>
        <TextArea autoFocus value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
      {needsDeadline && (
        <Field label={t('tasks.actions.new_deadline')}>
          <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
      )}
      <FormError>{error}</FormError>
    </Sheet>
  );
}
