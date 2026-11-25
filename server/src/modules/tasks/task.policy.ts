import type { Role, TaskStatus } from '@prisma/client';

/**
 * Хто що може із завданням — єдине місце (working-on-tasks-and-control).
 * ADR-0003: керівник і адмін бачать і керують усіма завданнями.
 */

export interface PolicyUser {
  id: string;
  role: Role;
}

export interface PolicyTask {
  status: TaskStatus;
  authorId: string;
  isControlled: boolean;
  controllerUserId: string | null;
  assignees: { userId: string; doneAt: Date | null }[];
}

const OPEN: TaskStatus[] = ['NEW', 'IN_PROGRESS'];

export const isOpen = (t: Pick<PolicyTask, 'status'>) => OPEN.includes(t.status);
export const isManagerRole = (u: PolicyUser) => u.role === 'ADMIN' || u.role === 'MANAGER';

const isAuthor = (t: PolicyTask, u: PolicyUser) => t.authorId === u.id;
const isAssignee = (t: PolicyTask, u: PolicyUser) => t.assignees.some((a) => a.userId === u.id);
const isPendingAssignee = (t: PolicyTask, u: PolicyUser) => t.assignees.some((a) => a.userId === u.id && !a.doneAt);
const isControllerUser = (t: PolicyTask, u: PolicyUser) => t.isControlled && t.controllerUserId === u.id;
/** Може приймати рішення щодо завдання: автор, керівник, контролер-користувач */
const isLead = (t: PolicyTask, u: PolicyUser) => isAuthor(t, u) || isManagerRole(u) || isControllerUser(t, u);

export function canView(t: PolicyTask, u: PolicyUser) {
  return isManagerRole(u) || isAuthor(t, u) || isAssignee(t, u) || isControllerUser(t, u);
}

export function permissions(t: PolicyTask, u: PolicyUser) {
  const open = isOpen(t);
  const owner = isAuthor(t, u) || isManagerRole(u);
  return {
    edit: owner && open,
    control: open && (isManagerRole(u) || isControllerUser(t, u)),
    removeControl: open && t.isControlled && (isManagerRole(u) || isControllerUser(t, u)),
    note: open && (isAssignee(t, u) || isLead(t, u)),
    start: t.status === 'NEW' && isPendingAssignee(t, u),
    markDone: open && isPendingAssignee(t, u),
    returnBack: t.status === 'DONE' && isLead(t, u),
    closeEarly: open && owner,
    cancel: open && owner,
    reopen: t.status === 'CANCELLED' && owner,
    snooze: open && isAssignee(t, u),
  };
}

export type TaskPermissions = ReturnType<typeof permissions>;

/** Виконавець (MEMBER) ставить завдання лише собі; брати на контроль — лише керівник */
export const canAssignTo = (u: PolicyUser, assigneeIds: string[]) => isManagerRole(u) || assigneeIds.every((id) => id === u.id);
export const canControlOnCreate = (u: PolicyUser) => isManagerRole(u);

/** Умова видимості для списків — та сама, що й canView */
export function visibilityWhere(u: PolicyUser) {
  if (isManagerRole(u)) return {};
  return {
    OR: [
      { authorId: u.id },
      { assignees: { some: { userId: u.id } } },
      { isControlled: true, controllerUserId: u.id },
    ],
  };
}
