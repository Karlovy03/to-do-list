import type { Task } from '@/shared/api/types';
import { shortName } from '@/shared/lib/names';
import { t } from '@/shared/lib/texts';

/** Прострочені першими, далі — за терміном (так нумеруємо й у таблиці, і в картках) */
export const sortReport = (tasks: Task[]) =>
  [...tasks].sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.deadline.localeCompare(b.deadline));

/** «Прострочено» або «У роботі, 40%» */
export function stateText(task: Task) {
  if (task.overdue) return t('tasks.status.overdue');
  return `${t(`tasks.status.${task.status}`)}, ${task.progress}%`;
}

/** «Петренко В., Заступник Міністра»; особа без акаунта — як записано */
export function controllerText(task: Task) {
  const c = task.control?.controller;
  if (!c) return '';
  return c.position && c.kind !== 'text' ? `${shortName(c.name)}, ${c.position}` : c.name;
}

export const assigneesText = (task: Task) => task.assignees.map((a) => shortName(a.fullName)).join(', ');

export function totals(tasks: Task[]) {
  const overdue = tasks.filter((x) => x.overdue).length;
  return { total: tasks.length, overdue, in_time: tasks.length - overdue };
}
