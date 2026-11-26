import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../core/prisma';
import { signToken } from '../core/auth';
import { invalidateUnitTree } from '../modules/units';
import { createApp } from '../app';

/*
 * Права наскрізно на реальній базі: маршрут → контролер → viewerOf → сервіс → policy → Prisma.
 * Запускається лише з INTEGRATION=1 (CI після migrate deploy) — локально без окремої бази пропускається.
 */
const run = process.env.INTEGRATION === '1';
const tag = `it${Date.now()}`;

let server: Server;
let base = '';
const ids: Record<string, string> = {};
let taskId = '';
let eventId = '';

const as = (who: string) => ({ Authorization: `Bearer ${signToken(ids[who], 0)}`, 'Content-Type': 'application/json' });
const call = async (who: string, method: string, path: string, body?: unknown) =>
  (await fetch(`${base}/api${path}`, { method, headers: as(who), body: body === undefined ? undefined : JSON.stringify(body) })).status;

describe.skipIf(!run)('права на реальній базі (ADR-0012)', () => {
  beforeAll(async () => {
    const dept = await prisma.unit.create({ data: { name: `${tag} Управління` } });
    const a = await prisma.unit.create({ data: { name: `${tag} Відділ А`, parentId: dept.id } });
    const b = await prisma.unit.create({ data: { name: `${tag} Відділ Б`, parentId: dept.id } });
    ids.unitA = a.id;
    const user = async (key: string, role: 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'MEMBER', unitId: string | null) => {
      ids[key] = (await prisma.user.create({ data: { login: `${tag}-${key}`, fullName: `${tag} ${key}`, role, unitId, passwordHash: 'x' } })).id;
    };
    await user('headA', 'MANAGER', a.id);
    await user('headB', 'MANAGER', b.id);
    await user('chief', 'MANAGER', dept.id);
    await user('execA', 'MEMBER', a.id);
    await user('execB', 'MEMBER', b.id);
    await user('director', 'DIRECTOR', null);
    invalidateUnitTree();
    server = createApp().listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const res = await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: as('headA'),
      body: JSON.stringify({ title: `${tag} завдання`, deadline: new Date(Date.now() + 864e5).toISOString(), assigneeIds: [ids.execA], control: { by: { type: 'self' } } }),
    });
    expect(res.status).toBe(201);
    taskId = ((await res.json()) as { id: string }).id;
    const ev = await fetch(`${base}/api/events`, {
      method: 'POST',
      headers: as('headA'),
      body: JSON.stringify({ title: `${tag} нарада`, startsAt: new Date(Date.now() + 864e5).toISOString(), durationMin: 30, participantIds: [ids.execA] }),
    });
    expect(ev.status).toBe(201);
    eventId = ((await ev.json()) as { id: string }).id;
  });

  afterAll(async () => {
    server?.close();
    if (!run) return;
    await prisma.task.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.event.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { login: { startsWith: tag } } });
    await prisma.unit.deleteMany({ where: { name: { startsWith: tag }, parentId: { not: null } } });
    await prisma.unit.deleteMany({ where: { name: { startsWith: tag } } });
  });

  const routes = (): [string, string, unknown?][] => [
    ['GET', `/tasks/${taskId}`],
    ['GET', `/tasks/${taskId}/updates`],
    ['PATCH', `/tasks/${taskId}`, { title: 'Чуже' }],
    ['DELETE', `/tasks/${taskId}`],
    ['POST', `/tasks/${taskId}/control`, { by: { type: 'self' } }],
    ['POST', `/tasks/${taskId}/control/remove`, {}],
    ['POST', `/tasks/${taskId}/notes`, { text: 'чуже' }],
    ['POST', `/tasks/${taskId}/snooze`, {}],
    ['POST', `/tasks/${taskId}/start`, {}],
    ['POST', `/tasks/${taskId}/done`, {}],
    ['POST', `/tasks/${taskId}/return`, { comment: 'x' }],
    ['POST', `/tasks/${taskId}/close`, { comment: 'x' }],
    ['POST', `/tasks/${taskId}/cancel`, {}],
    ['POST', `/tasks/${taskId}/reopen`, {}],
  ];

  it('керівник сусіднього відділу і чужий виконавець отримують 404 на кожному маршруті завдання', async () => {
    for (const who of ['headB', 'execB']) {
      for (const [method, path, body] of routes()) expect(`${who} ${method} ${path.replace(taskId, ':id')} → ${await call(who, method, path, body)}`).toMatch(/→ 404$/);
    }
  });

  it('захід: сусідній керівник і чужий виконавець — 404 на кожному маршруті; учасник бачить, але не змінює', async () => {
    const routes: [string, string, unknown?][] = [['GET', `/events/${eventId}`], ['PATCH', `/events/${eventId}`, { title: 'Чуже' }], ['POST', `/events/${eventId}/cancel`, {}], ['DELETE', `/events/${eventId}`]];
    for (const who of ['headB', 'execB']) for (const [m, p, b] of routes) expect(`${who} ${m} ${p.replace(eventId, ':id')} → ${await call(who, m, p, b)}`).toMatch(/→ 404$/);
    expect(await call('execA', 'GET', `/events/${eventId}`)).toBe(200);
    expect(await call('execA', 'PATCH', `/events/${eventId}`, { title: 'Інше' })).toBe(403);
    expect(await call('chief', 'GET', `/events/${eventId}`)).toBe(200);
    const list = (await (await fetch(`${base}/api/events`, { headers: as('headB') })).json()) as { items: { id: string }[] };
    expect(list.items.map((e) => e.id)).not.toContain(eventId);
  });

  it('календар: сусідній керівник, обравши чужий відділ, не бачить ні смуг, ні блоків; свій керівник — бачить', async () => {
    const q = `/calendar?unit=${ids.unitA}&from=${new Date(Date.now() - 864e5).toISOString()}&to=${new Date(Date.now() + 2 * 864e5).toISOString()}`;
    type Cal = { items: { id: string }[] };
    const foreign = (await (await fetch(`${base}/api${q}`, { headers: as('headB') })).json()) as Cal;
    const own = (await (await fetch(`${base}/api${q}`, { headers: as('headA') })).json()) as Cal;
    expect(foreign.items.map((i) => i.id)).not.toContain(taskId);
    expect(foreign.items.map((i) => i.id)).not.toContain(eventId);
    expect(own.items.map((i) => i.id)).toEqual(expect.arrayContaining([taskId, eventId]));
  });

  it('чуже завдання не потрапляє ні в список, ні в довідку, ні в зведення', async () => {
    const list = (await (await fetch(`${base}/api/tasks?scope=all&status=all`, { headers: as('headB') })).json()) as { items: { id: string }[] };
    const report = (await (await fetch(`${base}/api/tasks/report`, { headers: as('headB') })).json()) as { id: string }[];
    expect(list.items.map((t) => t.id)).not.toContain(taskId);
    expect(report.map((t) => t.id)).not.toContain(taskId);
  });

  it('керівник вищого підрозділу і директор бачать завдання; виконавець бачить своє', async () => {
    for (const who of ['chief', 'director', 'execA', 'headA']) expect(await call(who, 'GET', `/tasks/${taskId}`)).toBe(200);
  });

  it('виконавець не доручає іншим і не заходить в адмін-маршрути', async () => {
    const task = { title: `${tag} спроба`, deadline: new Date(Date.now() + 864e5).toISOString(), assigneeIds: [ids.execB] };
    expect(await call('execA', 'POST', '/tasks', task)).toBe(403);
    expect(await call('execA', 'POST', '/units', { name: `${tag} x` })).toBe(403);
    expect(await call('director', 'PATCH', `/users/${ids.execA}`, { role: 'ADMIN' })).toBe(403);
    expect(await call('headA', 'PUT', '/settings', {})).toBe(403);
  });
});
