import { Router } from 'express';
import { z } from 'zod';
import type { Prisma, TaskStatus, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isManager, me, publicUser } from '../lib/auth';
import { badRequest, forbidden, notFound } from '../lib/http';
import { formatKyiv } from '../lib/time';
import { notify } from '../services/notify';
import { tx } from '../lib/texts';

export const tasksRouter = Router();

const OPEN: TaskStatus[] = ['NEW', 'IN_PROGRESS', 'REVIEW'];

const taskInclude = {
  author: true,
  assignees: { include: { user: true } },
  controlSetBy: true,
  controllerUser: true,
  controller: true,
} satisfies Prisma.TaskInclude;

type TaskFull = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function controllerLabel(t: TaskFull) {
  if (!t.isControlled) return null;
  if (t.controllerUser) return { kind: 'user' as const, name: t.controllerUser.fullName, position: t.controllerUser.position, userId: t.controllerUser.id };
  if (t.controller) return { kind: 'directory' as const, name: t.controller.fullName, position: [t.controller.position, t.controller.organization].filter(Boolean).join(', '), controllerId: t.controller.id };
  if (t.controllerText) return { kind: 'text' as const, name: t.controllerText, position: '' };
  return null;
}

function serialize(t: TaskFull, viewer: User) {
  const now = Date.now();
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
    overdue: OPEN.includes(t.status) && t.status !== 'REVIEW' && t.deadline.getTime() < now,
    author: publicUser(t.author),
    assignees: t.assignees.map((a) => publicUser(a.user)),
    control: t.isControlled
      ? {
          setAt: t.controlSetAt,
          setBy: t.controlSetBy ? publicUser(t.controlSetBy) : null,
          controller: controllerLabel(t),
          basis: t.controlBasis,
          deadline: t.controlDeadline,
          reminderInterval: t.reminderInterval,
        }
      : null,
    can: permissions(t, viewer),
  };
}

const isAssignee = (t: TaskFull, u: User) => t.assignees.some((a) => a.userId === u.id);
const isController = (t: TaskFull, u: User) => t.isControlled && t.controllerUserId === u.id;

function canView(t: TaskFull, u: User) {
  return isManager(u) || t.authorId === u.id || isAssignee(t, u) || isController(t, u);
}

function permissions(t: TaskFull, u: User) {
  const owner = t.authorId === u.id || u.role === 'ADMIN';
  const lead = owner || isManager(u) || isController(t, u);
  const exec = isAssignee(t, u);
  const open = OPEN.includes(t.status);
  return {
    edit: owner && open,
    control: isManager(u) && open,
    report: (exec || lead) && open,
    start: exec && t.status === 'NEW',
    submit: exec && (t.status === 'NEW' || t.status === 'IN_PROGRESS'),
    accept: lead && (t.status === 'REVIEW' || (owner && open)),
    returnBack: lead && t.status === 'REVIEW',
    cancel: owner && open,
    reopen: owner && (t.status === 'DONE' || t.status === 'CANCELLED'),
  };
}

async function loadTask(id: string, viewer: User) {
  const t = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  // невидиме завдання — ніби його немає (не розкриваємо існування)
  if (!t || !canView(t, viewer)) throw notFound();
  return t;
}

/** Хто має знати про хід завдання: автор, контролер-користувач, виконавці */
function stakeholders(t: TaskFull) {
  return [t.authorId, ...(t.controllerUserId ? [t.controllerUserId] : []), ...t.assignees.map((a) => a.userId)];
}

// ---------- списки ----------

const listQuery = z.object({
  scope: z.enum(['mine', 'authored', 'controlled', 'all']).default('mine'),
  status: z.enum(['open', 'done', 'all']).default('open'),
  q: z.string().trim().max(100).optional(),
  assignee: z.string().optional(),
});

tasksRouter.get('/', async (req, res) => {
  const u = me(req);
  const { scope, status, q, assignee } = listQuery.parse(req.query);
  const and: Prisma.TaskWhereInput[] = [];

  if (!isManager(u)) {
    and.push({ OR: [{ authorId: u.id }, { assignees: { some: { userId: u.id } } }, { controllerUserId: u.id, isControlled: true }] });
  }
  if (scope === 'mine') and.push({ assignees: { some: { userId: u.id } } });
  if (scope === 'authored') and.push({ OR: [{ authorId: u.id }, { controllerUserId: u.id, isControlled: true }] });
  if (scope === 'controlled') and.push({ isControlled: true });
  if (status === 'open') and.push({ status: { in: OPEN } });
  if (status === 'done') and.push({ status: { in: ['DONE', 'CANCELLED'] } });
  if (assignee) and.push({ assignees: { some: { userId: assignee } } });
  if (q) {
    const n = Number(q.replace(/^№/, ''));
    and.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : []),
      ],
    });
  }

  const rows = await prisma.task.findMany({
    where: { AND: and },
    include: taskInclude,
    orderBy: status === 'done' ? [{ completedAt: 'desc' }, { updatedAt: 'desc' }] : [{ isControlled: 'desc' }, { deadline: 'asc' }],
    take: 300,
  });
  res.json(rows.map((t) => serialize(t, u)));
});

tasksRouter.get('/summary', async (req, res) => {
  const u = me(req);
  const visible: Prisma.TaskWhereInput = isManager(u)
    ? {}
    : { OR: [{ authorId: u.id }, { assignees: { some: { userId: u.id } } }, { controllerUserId: u.id, isControlled: true }] };
  const open = { ...visible, status: { in: ['NEW', 'IN_PROGRESS'] as TaskStatus[] } };
  const now = new Date();
  const endOfDay = new Date(now.getTime() + 24 * 3600_000);
  const [mine, controlled, overdue, dueSoon, review] = await Promise.all([
    prisma.task.count({ where: { status: { in: ['NEW', 'IN_PROGRESS'] }, assignees: { some: { userId: u.id } } } }),
    prisma.task.count({ where: { ...visible, isControlled: true, status: { in: OPEN } } }),
    prisma.task.count({ where: { ...open, deadline: { lt: now } } }),
    prisma.task.count({ where: { ...open, deadline: { gte: now, lt: endOfDay } } }),
    prisma.task.count({ where: { status: 'REVIEW', OR: [{ authorId: u.id }, { controllerUserId: u.id }] } }),
  ]);
  res.json({ mine, controlled, overdue, dueSoon, review });
});

tasksRouter.get('/:id', async (req, res) => {
  const u = me(req);
  const t = await loadTask(req.params.id, u);
  const updates = await prisma.taskUpdate.findMany({
    where: { taskId: t.id },
    include: { author: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    ...serialize(t, u),
    updates: updates.map((x) => ({
      id: x.id,
      kind: x.kind,
      text: x.text,
      progress: x.progress,
      meta: x.meta,
      createdAt: x.createdAt,
      author: x.author ? publicUser(x.author) : null,
    })),
  });
});

// ---------- створення / редагування ----------

const controlInput = z.object({
  by: z.discriminatedUnion('type', [
    z.object({ type: z.literal('self') }),
    z.object({ type: z.literal('user'), userId: z.string().min(1) }),
    z.object({ type: z.literal('directory'), controllerId: z.string().min(1) }),
    z.object({ type: z.literal('text'), text: z.string().trim().min(2).max(200) }),
  ]),
  basis: z.string().trim().max(300).optional().nullable(),
  deadline: z.coerce.date().optional().nullable(),
  reminderInterval: z.number().int().min(15).max(7 * 1440).optional().nullable(),
});

const createInput = z.object({
  title: z.string().trim().min(2).max(300),
  description: z.string().trim().max(5000).default(''),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  deadline: z.coerce.date(),
  assigneeIds: z.array(z.string()).min(1).max(50),
  control: controlInput.optional().nullable(),
});

async function resolveControl(input: z.infer<typeof controlInput>, actor: User) {
  const data = {
    isControlled: true,
    controlSetAt: new Date(),
    controlSetById: actor.id,
    controllerUserId: null as string | null,
    controllerId: null as string | null,
    controllerText: null as string | null,
    controlBasis: input.basis || null,
    controlDeadline: input.deadline ?? null,
    reminderInterval: input.reminderInterval ?? null,
  };
  switch (input.by.type) {
    case 'self':
      data.controllerUserId = actor.id;
      break;
    case 'user': {
      const u = await prisma.user.findFirst({ where: { id: input.by.userId, isActive: true } });
      if (!u) throw badRequest('controller_user_not_found');
      data.controllerUserId = u.id;
      break;
    }
    case 'directory': {
      const c = await prisma.controller.findFirst({ where: { id: input.by.controllerId, isActive: true } });
      if (!c) throw badRequest('controller_not_found');
      data.controllerId = c.id;
      break;
    }
    case 'text':
      data.controllerText = input.by.text;
      break;
  }
  return data;
}

async function checkAssignees(ids: string[], actor: User) {
  const unique = [...new Set(ids)];
  if (!isManager(actor) && unique.some((id) => id !== actor.id)) throw forbidden('only_self_assign');
  const found = await prisma.user.count({ where: { id: { in: unique }, isActive: true } });
  if (found !== unique.length) throw badRequest('assignee_not_found');
  return unique;
}

tasksRouter.post('/', async (req, res) => {
  const u = me(req);
  const input = createInput.parse(req.body);
  if (input.control && !isManager(u)) throw forbidden('control_requires_manager');
  const assigneeIds = await checkAssignees(input.assigneeIds, u);
  const control = input.control ? await resolveControl(input.control, u) : {};

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority,
      deadline: input.deadline,
      authorId: u.id,
      ...control,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
      updates: {
        create: [
          { authorId: u.id, kind: 'CREATED' },
          ...(input.control ? [{ authorId: u.id, kind: 'CONTROL_ON' as const, text: input.control.basis ?? '' }] : []),
        ],
      },
    },
    include: taskInclude,
  });

  await notify({
    userIds: assigneeIds,
    kind: task.isControlled ? 'CONTROL_ON' : 'ASSIGNED',
    task,
    title: tx(task.isControlled ? 'assigned_controlled' : 'assigned'),
    body: `${tx('task_line', { number: task.number, title: task.title })}\n${tx('deadline_line', { deadline: formatKyiv(task.deadline) })}`,
    actorId: u.id,
  });
  if (task.controllerUserId && task.controllerUserId !== u.id) {
    await notify({ userIds: [task.controllerUserId], kind: 'CONTROL_ON', task, title: tx('control_yours'), actorId: u.id });
  }
  res.status(201).json(serialize(task, u));
});

const patchInput = z.object({
  title: z.string().trim().min(2).max(300).optional(),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional(),
  deadline: z.coerce.date().optional(),
  assigneeIds: z.array(z.string()).min(1).max(50).optional(),
});

tasksRouter.patch('/:id', async (req, res) => {
  const u = me(req);
  const t = await loadTask(req.params.id, u);
  if (!permissions(t, u).edit) throw forbidden();
  const input = patchInput.parse(req.body);
  const journal: Prisma.TaskUpdateCreateManyInput[] = [];

  let added: string[] = [];
  if (input.assigneeIds) {
    const next = await checkAssignees(input.assigneeIds, u);
    const prev = t.assignees.map((a) => a.userId);
    added = next.filter((id) => !prev.includes(id));
    const removed = prev.filter((id) => !next.includes(id));
    if (added.length || removed.length) {
      await prisma.taskAssignee.deleteMany({ where: { taskId: t.id, userId: { in: removed } } });
      await prisma.taskAssignee.createMany({ data: added.map((userId) => ({ taskId: t.id, userId })) });
      journal.push({ taskId: t.id, authorId: u.id, kind: 'ASSIGNEES', meta: { added, removed } });
    }
  }
  if (input.deadline && input.deadline.getTime() !== t.deadline.getTime()) {
    journal.push({ taskId: t.id, authorId: u.id, kind: 'DEADLINE', meta: { from: t.deadline, to: input.deadline } });
    // новий термін — нові попередження
    await prisma.reminderLog.deleteMany({ where: { taskId: t.id, key: { not: 'control' } } });
  }

  const updated = await prisma.task.update({
    where: { id: t.id },
    data: { title: input.title, description: input.description, priority: input.priority, deadline: input.deadline },
    include: taskInclude,
  });
  if (journal.length) await prisma.taskUpdate.createMany({ data: journal });

  if (added.length) {
    await notify({
      userIds: added,
      kind: updated.isControlled ? 'CONTROL_ON' : 'ASSIGNED',
      task: updated,
      title: tx(updated.isControlled ? 'assigned_controlled' : 'assigned'),
      actorId: u.id,
    });
  }
  if (input.deadline && input.deadline.getTime() !== t.deadline.getTime()) {
    await notify({
      userIds: updated.assignees.map((a) => a.userId),
      kind: 'UPDATE',
      task: updated,
      title: tx('deadline_changed'),
      body: `${tx('task_line', { number: updated.number, title: updated.title })}\n${tx('new_deadline_line', { deadline: formatKyiv(updated.deadline) })}`,
      actorId: u.id,
    });
  }
  res.json(serialize(updated, u));
});

// ---------- контроль ----------

tasksRouter.post('/:id/control', async (req, res) => {
  const u = me(req);
  const t = await loadTask(req.params.id, u);
  if (!permissions(t, u).control) throw forbidden();
  const input = controlInput.parse(req.body);
  const data = await resolveControl(input, u);
  const wasControlled = t.isControlled;

  const updated = await prisma.task.update({ where: { id: t.id }, data, include: taskInclude });
  await prisma.reminderLog.deleteMany({ where: { taskId: t.id, key: 'control' } });
  await prisma.taskUpdate.create({
    data: { taskId: t.id, authorId: u.id, kind: 'CONTROL_ON', text: input.basis ?? '', meta: { changed: wasControlled } },
  });
  await notify({
    userIds: updated.assignees.map((a) => a.userId),
    kind: 'CONTROL_ON',
    task: updated,
    title: tx(wasControlled ? 'control_changed' : 'control_on'),
    actorId: u.id,
  });
  if (updated.controllerUserId) {
    await notify({ userIds: [updated.controllerUserId], kind: 'CONTROL_ON', task: updated, title: tx('control_yours'), actorId: u.id });
  }
  res.json(serialize(updated, u));
});

tasksRouter.delete('/:id/control', async (req, res) => {
  const u = me(req);
  const t = await loadTask(req.params.id, u);
  if (!t.isControlled) throw badRequest('not_controlled');
  if (!(isManager(u) || isController(t, u))) throw forbidden();
  const { reason } = z.object({ reason: z.string().trim().max(500).default('') }).parse(req.body ?? {});

  const updated = await prisma.task.update({
    where: { id: t.id },
    data: {
      isControlled: false,
      controlSetAt: null,
      controlSetById: null,
      controllerUserId: null,
      controllerId: null,
      controllerText: null,
      controlBasis: null,
      controlDeadline: null,
      reminderInterval: null,
    },
    include: taskInclude,
  });
  await prisma.reminderLog.deleteMany({ where: { taskId: t.id, key: 'control' } });
  await prisma.taskUpdate.create({ data: { taskId: t.id, authorId: u.id, kind: 'CONTROL_OFF', text: reason } });
  await notify({ userIds: updated.assignees.map((a) => a.userId), kind: 'CONTROL_OFF', task: updated, title: tx('control_off'), actorId: u.id });
  res.json(serialize(updated, u));
});

// ---------- хід виконання ----------

tasksRouter.post('/:id/updates', async (req, res) => {
  const u = me(req);
  const t = await loadTask(req.params.id, u);
  if (!permissions(t, u).report) throw forbidden();
  const input = z
    .object({ text: z.string().trim().max(3000).default(''), progress: z.number().int().min(0).max(100).optional() })
    .refine((v) => v.text.length > 0 || v.progress !== undefined, { message: 'empty' })
    .parse(req.body);

  const progressChanged = input.progress !== undefined && input.progress !== t.progress;
  await prisma.taskUpdate.create({
    data: { taskId: t.id, authorId: u.id, kind: progressChanged ? 'PROGRESS' : 'COMMENT', text: input.text, progress: progressChanged ? input.progress : null },
  });
  const updated = await prisma.task.update({
    where: { id: t.id },
    data: {
      ...(progressChanged ? { progress: input.progress } : {}),
      // перший звіт виконавця = завдання в роботі
      ...(t.status === 'NEW' && isAssignee(t, u) ? { status: 'IN_PROGRESS' as const } : {}),
    },
    include: taskInclude,
  });
  await notify({
    userIds: stakeholders(updated),
    kind: 'UPDATE',
    task: updated,
    title: progressChanged ? tx('progress', { progress: input.progress! }) : tx('comment'),
    body: `${tx('task_line', { number: updated.number, title: updated.title })}${input.text ? `\n${u.fullName}: ${input.text.slice(0, 140)}` : ''}`,
    actorId: u.id,
  });
  res.status(201).json(serialize(updated, u));
});

const statusInput = z.object({
  action: z.enum(['start', 'submit', 'accept', 'return', 'cancel', 'reopen']),
  comment: z.string().trim().max(2000).default(''),
});

tasksRouter.post('/:id/status', async (req, res) => {
  const u = me(req);
  const t = await loadTask(req.params.id, u);
  const can = permissions(t, u);
  const { action, comment } = statusInput.parse(req.body);

  const owner = t.authorId === u.id;
  const transitions: Record<typeof action, { allowed: boolean; to: TaskStatus }> = {
    start: { allowed: can.start, to: 'IN_PROGRESS' },
    // якщо виконавець і автор — одна особа, приймати нема кому: одразу «Виконано»
    submit: { allowed: can.submit, to: owner ? 'DONE' : 'REVIEW' },
    accept: { allowed: can.accept, to: 'DONE' },
    return: { allowed: can.returnBack, to: 'IN_PROGRESS' },
    cancel: { allowed: can.cancel, to: 'CANCELLED' },
    reopen: { allowed: can.reopen, to: 'IN_PROGRESS' },
  };
  const tr = transitions[action];
  if (!tr.allowed) throw forbidden('transition_not_allowed');
  if (action === 'return' && !comment) throw badRequest('comment_required');

  const updated = await prisma.task.update({
    where: { id: t.id },
    data: {
      status: tr.to,
      completedAt: tr.to === 'DONE' || tr.to === 'CANCELLED' ? new Date() : null,
      ...(tr.to === 'DONE' ? { progress: 100 } : {}),
    },
    include: taskInclude,
  });
  await prisma.taskUpdate.create({
    data: { taskId: t.id, authorId: u.id, kind: 'STATUS', text: comment, meta: { action, from: t.status, to: tr.to } },
  });
  if (tr.to === 'IN_PROGRESS' && action !== 'start') {
    await prisma.reminderLog.deleteMany({ where: { taskId: t.id, key: { not: 'control' } } });
  }

  const executors = updated.assignees.map((a) => a.userId);
  const leads = [updated.authorId, ...(updated.controllerUserId ? [updated.controllerUserId] : [])];
  const msg: Record<typeof action, { to: string[]; kind: Parameters<typeof notify>[0]['kind']; title: string }> = {
    start: { to: leads, kind: 'UPDATE', title: tx('started') },
    submit: { to: leads, kind: 'REVIEW', title: tx('submitted') },
    accept: { to: [...executors, ...leads], kind: 'DONE', title: tx('accepted') },
    return: { to: executors, kind: 'RETURNED', title: tx('returned') },
    cancel: { to: [...executors, ...leads], kind: 'CANCELLED', title: tx('cancelled') },
    reopen: { to: executors, kind: 'ASSIGNED', title: tx('reopened') },
  };
  const m = msg[action];
  await notify({
    userIds: m.to,
    kind: m.kind,
    task: updated,
    title: m.title,
    body: `${tx('task_line', { number: updated.number, title: updated.title })}${comment ? `\n${comment.slice(0, 160)}` : ''}`,
    actorId: u.id,
  });
  res.json(serialize(updated, u));
});

tasksRouter.post('/:id/snooze', async (req, res) => {
  const u = me(req);
  const t = await loadTask(req.params.id, u);
  const { minutes } = z.object({ minutes: z.number().int().min(15).max(1440).default(120) }).parse(req.body ?? {});
  const until = new Date(Date.now() + minutes * 60_000);
  await prisma.snooze.upsert({
    where: { taskId_userId: { taskId: t.id, userId: u.id } },
    create: { taskId: t.id, userId: u.id, until },
    update: { until },
  });
  res.json({ until });
});
