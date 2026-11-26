import type { AppEvent, Me } from '@/shared/api/types';
import { useCreateEvent } from '../../hooks/useEventActions';
import { EventForm } from '../EventForm/EventForm';

/** Новий захід для аркуша «Створити»: створити може кожен і запросити будь-кого (ADR-0016) */
export function NewEventForm({ me, active, onCreated }: { me: Me; active?: boolean; onCreated: (e: AppEvent) => void }) {
  const create = useCreateEvent();
  return <EventForm me={me} active={active} busy={create.isPending} onSubmit={(input) => create.mutate(input, { onSuccess: onCreated })} />;
}
