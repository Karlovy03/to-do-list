import type { TaskUpdate, User } from '@prisma/client';
import { serializeControl } from '../control';
import { publicUser } from '../users';
import { isOpen, permissions, type PolicyUser } from './task.policy';
import type { TaskFull } from './task.repository';

export function serializeTask(t: TaskFull, viewer: PolicyUser, now = Date.now()) {
  const mine = t.assignees.find((a) => a.userId === viewer.id);
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    progress: t.progress,
    deadline: t.deadline,
    createdAt: t.createdAt,
    completedAt: t.completedAt,
    overdue: isOpen(t) && t.deadline.getTime() < now,
    author: publicUser(t.author),
    assignees: t.assignees.map((a) => ({ ...publicUser(a.user), doneAt: a.doneAt })),
    myAssignment: mine ? { doneAt: mine.doneAt } : null,
    control: serializeControl(t),
    can: permissions(t, viewer),
  };
}

export function serializeUpdate(u: TaskUpdate & { author: User | null }) {
  return {
    id: u.id,
    kind: u.kind,
    text: u.text,
    progress: u.progress,
    meta: u.meta,
    createdAt: u.createdAt,
    author: u.author ? publicUser(u.author) : null,
  };
}
