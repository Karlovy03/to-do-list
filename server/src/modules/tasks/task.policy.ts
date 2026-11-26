import type { TaskStatus } from '@prisma/client';
import { hasFullAccess, isManagerRole, managesUnits, scopeUnits, type PolicyUser } from '../access';

/**
 * Хто що може із завданням — єдине місце (working-on-tasks-and-control).
 * ADR-0012: адміністратор і директор бачать і керують усіма завданнями;
 * керівник — завданнями своєї вертикалі (автор або виконавець у його підрозділі чи нижчому)
 * і тими, де він сам учасник; виконавець — лише своїми. Спільні правила вертикалі — модуль access.
 */

export type { PolicyUser };

export interface PolicyTask {
  status: TaskStatus;
  authorId: string;
  isControlled: boolean;
  controllerUserId: string | null;
  author?: { unitId: string | null };
  assignees: { userId: string; doneAt: Date | null; user?: { unitId: string | null } }[];
}

const OPEN: TaskStatus[] = ['NEW', 'IN_PROGRESS'];

export const isOpen = (t: Pick<PolicyTask, 'status'>) => OPEN.includes(t.status);

/** Керує завданням як керівник: автор або хоч один виконавець — у його вертикалі */
const managesTask = (t: PolicyTask, u: PolicyUser) => managesUnits(u, [t.author?.unitId, ...t.assignees.map((a) => a.user?.unitId)]);

const isAuthor = (t: PolicyTask, u: PolicyUser) => t.authorId === u.id;
const isAssignee = (t: PolicyTask, u: PolicyUser) => t.assignees.some((a) => a.userId === u.id);
const isPendingAssignee = (t: PolicyTask, u: PolicyUser) => t.assignees.some((a) => a.userId === u.id && !a.doneAt);
const isControllerUser = (t: PolicyTask, u: PolicyUser) => t.isControlled && t.controllerUserId === u.id;
/** Може приймати рішення щодо завдання: автор, керівник, контролер-користувач */
const isLead = (t: PolicyTask, u: PolicyUser) => isAuthor(t, u) || managesTask(t, u) || isControllerUser(t, u);

export function canView(t: PolicyTask, u: PolicyUser) {
  return managesTask(t, u) || isAuthor(t, u) || isAssignee(t, u) || isControllerUser(t, u);
}

export function permissions(t: PolicyTask, u: PolicyUser) {
  const open = isOpen(t);
  const owner = isAuthor(t, u) || managesTask(t, u);
  return {
    edit: owner && open,
    control: open && (managesTask(t, u) || isControllerUser(t, u)),
    removeControl: open && t.isControlled && (managesTask(t, u) || isControllerUser(t, u)),
    note: open && (isAssignee(t, u) || isLead(t, u)),
    start: t.status === 'NEW' && isPendingAssignee(t, u),
    markDone: open && isPendingAssignee(t, u),
    returnBack: t.status === 'DONE' && isLead(t, u),
    closeEarly: open && owner,
    cancel: open && owner,
    reopen: t.status === 'CANCELLED' && owner,
    // нагадування отримують і виконавці, і автор/контролер (прострочення) — відкласти може кожен із них
    snooze: open && (isAssignee(t, u) || isLead(t, u)),
    // ADR-0011/0012: видаляє назавжди автор, адміністратор або директор — у будь-якому стані, зокрема на контролі
    delete: isAuthor(t, u) || hasFullAccess(u),
  };
}

export type TaskPermissions = ReturnType<typeof permissions>;

/** Виконавець (MEMBER) ставить завдання лише собі; керівник, директор, адмін — будь-кому (ADR-0012) */
export const canAssignTo = (u: PolicyUser, assigneeIds: string[]) => isManagerRole(u) || assigneeIds.every((id) => id === u.id);
export const canControlOnCreate = (u: PolicyUser) => isManagerRole(u);

/** Умова видимості для списків — та сама, що й canView */
export function visibilityWhere(u: PolicyUser) {
  if (hasFullAccess(u)) return {};
  const own = [
    { authorId: u.id },
    { assignees: { some: { userId: u.id } } },
    { isControlled: true, controllerUserId: u.id },
  ];
  const units = scopeUnits(u);
  if (!units.length) return { OR: own };
  return {
    OR: [...own, { author: { unitId: { in: units } } }, { assignees: { some: { user: { unitId: { in: units } } } } }],
  };
}
