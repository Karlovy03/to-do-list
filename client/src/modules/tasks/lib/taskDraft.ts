import type { ControlInput, Priority } from '@/shared/api/types';

/** Що з «Нового завдання» живе в чернетці (Figma 41); термін — лише власний («Інший»), швидкі рахуються від «зараз» */
export interface TaskDraft {
  title: string;
  description: string | null;
  assignees: string[];
  priority: Priority;
  control: ControlInput | null;
  deadline: string | null;
}

const PRIORITIES: readonly string[] = ['NORMAL', 'HIGH', 'URGENT'];
const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Збережене на пристрої — як дані ззовні: невідоме відкидається; термін, що вже минув, — теж */
export function parseTaskDraft(raw: unknown, now = new Date()): TaskDraft | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.title !== 'string') return null;
  const deadline = typeof r.deadline === 'string' && Date.parse(r.deadline) > now.getTime() ? r.deadline : null;
  const control = typeof r.control === 'object' && r.control !== null && typeof (r.control as { by?: unknown }).by === 'object' ? (r.control as ControlInput) : null;
  return {
    title: r.title,
    description: typeof r.description === 'string' ? r.description : null,
    assignees: strings(r.assignees),
    priority: typeof r.priority === 'string' && PRIORITIES.includes(r.priority) ? (r.priority as Priority) : 'NORMAL',
    control,
    deadline,
  };
}
