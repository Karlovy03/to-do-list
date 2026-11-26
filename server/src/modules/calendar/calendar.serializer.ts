import type { EventFull } from '../events';
import type { TaskFull } from '../tasks';

/** Смуга завдання: межі й стан, а тон рахує клієнт тією ж функцією, що й часовий чип картки */
export function taskBar(t: TaskFull, people: Set<string> | null) {
  return {
    kind: 'task' as const,
    id: t.id,
    number: t.number,
    title: t.title,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt,
    deadline: t.deadline,
    completedAt: t.completedAt,
    controlled: t.isControlled,
    personIds: t.assignees.map((a) => a.userId).filter((id) => !people || people.has(id)),
  };
}

export function eventBlock(e: EventFull, people: Set<string> | null) {
  return {
    kind: 'event' as const,
    id: e.id,
    title: e.title,
    status: e.status,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    personIds: e.participants.map((p) => p.userId).filter((id) => !people || people.has(id)),
  };
}
