import type { TaskFull } from './task.repository';

/** Хто приймає рішення щодо завдання: автор, контролер-користувач, хто зареєстрував контроль */
export const leads = (t: Pick<TaskFull, 'authorId' | 'controllerUserId' | 'controlSetById'>) => [t.authorId, t.controllerUserId, t.controlSetById];

/** Виконавці, які ще не позначили «Виконано» */
export const pendingExecutors = (t: Pick<TaskFull, 'assignees'>) => t.assignees.filter((a) => !a.doneAt).map((a) => a.userId);

export const executors = (t: Pick<TaskFull, 'assignees'>) => t.assignees.map((a) => a.userId);

/** Усі, кого стосується хід завдання (дублікати прибирає notify) */
export const stakeholders = (t: TaskFull) => [...leads(t), ...executors(t)];
