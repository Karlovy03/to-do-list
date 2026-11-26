// Форма відповідей API сервера — див. server/src/modules/<модуль>/<модуль>.serializer.ts

export type Role = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'MEMBER';
export type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type Priority = 'NORMAL' | 'HIGH' | 'URGENT';

export interface Person {
  id: string;
  fullName: string;
  position: string;
  role: Role;
  /** підрозділ (ADR-0012); null — не вказано */
  unitId: string | null;
  isActive: boolean;
  login?: string;
}

export interface Unit {
  id: string;
  name: string;
  parentId: string | null;
  /** скільки людей і дочірніх підрозділів (для заборони видалення непорожнього) */
  users: number;
  children: number;
}

export interface Prefs {
  quietFrom: number;
  quietTo: number;
  muteWeekends: boolean;
  notifyAssigned: boolean;
  notifyControl: boolean;
  notifyDeadline: boolean;
  notifyUpdates: boolean;
  controlInterval: number | null;
  /** запрошення, зміни й нагадування про заходи */
  notifyEvents: boolean;
  /** ящірка «Виконано!» на контрольному завданні (ADR-0018) */
  cheerOnControlDone: boolean;
}

export interface Me extends Person {
  login: string;
  prefs: Prefs;
  token?: string;
}

export interface ControllerLabel {
  kind: 'user' | 'directory' | 'text';
  name: string;
  position: string;
  userId?: string;
  controllerId?: string;
}

export interface TaskControl {
  setAt: string;
  setBy: Person | null;
  controller: ControllerLabel | null;
  basis: string | null;
  reminderInterval: number | null;
}

export interface TaskPermissions {
  edit: boolean;
  control: boolean;
  removeControl: boolean;
  note: boolean;
  start: boolean;
  markDone: boolean;
  returnBack: boolean;
  closeEarly: boolean;
  cancel: boolean;
  reopen: boolean;
  snooze: boolean;
  /** видалити назавжди (ADR-0011) */
  delete: boolean;
}

export interface Assignee extends Person {
  doneAt: string | null;
}

export interface Task {
  id: string;
  number: number;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  progress: number;
  deadline: string;
  createdAt: string;
  completedAt: string | null;
  overdue: boolean;
  author: Person;
  assignees: Assignee[];
  myAssignment: { doneAt: string | null } | null;
  control: TaskControl | null;
  can: TaskPermissions;
}

export type UpdateKind = 'CREATED' | 'COMMENT' | 'PROGRESS' | 'STATUS' | 'CONTROL_ON' | 'CONTROL_OFF' | 'DEADLINE' | 'ASSIGNEES';

export interface TaskUpdate {
  id: string;
  kind: UpdateKind;
  text: string;
  progress: number | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  author: Person | null;
}

export interface TaskDetail extends Task {
  updates: TaskUpdate[];
  hasMoreUpdates: boolean;
}

export interface Page<T> {
  items: T[];
  hasMore: boolean;
}

export interface Summary {
  mine: number;
  controlled: number;
  overdue: number;
  dueSoon: number;
}

export type EventStatus = 'PLANNED' | 'CANCELLED';

export interface EventPermissions {
  edit: boolean;
  cancel: boolean;
  delete: boolean;
}

/** Захід: нарада, зустріч, навчання (ADR-0016). «Триває / минув» — з часу, не зі статусу */
export interface AppEvent {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  /** орієнтовний кінець = початок + тривалість */
  endsAt: string;
  durationMin: number;
  status: EventStatus;
  cancelledAt: string | null;
  organizer: Person;
  /** без організатора — він окремо */
  participants: Person[];
  /** я організатор або учасник */
  mine: boolean;
  can: EventPermissions;
}

export interface DirectoryPerson {
  id: string;
  fullName: string;
  position: string;
  organization: string;
  isActive: boolean;
}

export type NotificationKind =
  | 'ASSIGNED' | 'UNASSIGNED' | 'CONTROL_ON' | 'CONTROL_CHANGED' | 'CONTROL_OFF' | 'CONTROL_REMINDER'
  | 'DEADLINE_SOON' | 'DEADLINE_CHANGED' | 'OVERDUE' | 'PROGRESS' | 'COMMENT' | 'STARTED'
  | 'DONE_PART' | 'DONE' | 'RETURNED' | 'CANCELLED' | 'REOPENED'
  | 'EVENT_INVITED' | 'EVENT_CHANGED' | 'EVENT_CANCELLED' | 'EVENT_SOON';

export interface AppNotification {
  id: string;
  taskId: string | null;
  eventId: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface Feed extends Page<AppNotification> {
  unread: number;
}

export interface ReminderSettings {
  controlIntervalMin: number;
  deadlineOffsetsMin: number[];
  overdueRepeatMin: number;
  urgentBypassQuiet: boolean;
  overdueNotifyLeads: boolean;
  defaultQuietFrom: number;
  defaultQuietTo: number;
  defaultMuteWeekends: boolean;
  /** за скільки хвилин до початку заходу нагадати учасникам */
  eventReminderMin: number;
}

export type ControlBy =
  | { type: 'self' }
  | { type: 'user'; userId: string }
  | { type: 'directory'; controllerId: string }
  | { type: 'text'; text: string };

export interface ControlInput {
  by: ControlBy;
  basis?: string | null;
  reminderInterval?: number | null;
}
