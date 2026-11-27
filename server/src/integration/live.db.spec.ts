import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../core/prisma';
import { signToken } from '../core/auth';
import { invalidateUnitTree } from '../modules/units';
import { liveHub } from '../modules/live';
import { createApp } from '../app';

/*
 * Живі оновлення наскрізно (ADR-0021): справжній потік GET /api/live → сигнал після POST /api/tasks.
 * Сигнал отримує лише той, хто бачить завдання; керівник сусіднього відділу — ні.
 */
const run = process.env.INTEGRATION === '1';
const tag = `live${Date.now()}`;

let server: Server;
let base = '';
const ids: Record<string, string> = {};
const auth = (who: string) => ({ Authorization: `Bearer ${signToken(ids[who], 0)}`, 'Content-Type': 'application/json' });

/** Відкриває потік і збирає все, що прийшло; close() — обірвати */
async function listen(who: string) {
  const ctrl = new AbortController();
  const res = await fetch(`${base}/api/live`, { headers: auth(who), signal: ctrl.signal });
  const got = { text: '', status: res.status, type: res.headers.get('content-type') ?? '' };
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        got.text += dec.decode(value, { stream: true });
      }
    } catch {
      // обірвали самі
    }
  })();
  return { got, close: () => ctrl.abort() };
}

const until = async (ok: () => boolean, ms = 3000) => {
  const end = Date.now() + ms;
  while (!ok() && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
  return ok();
};

describe.skipIf(!run)('живі оновлення на реальній базі (ADR-0021)', () => {
  beforeAll(async () => {
    const dept = await prisma.unit.create({ data: { name: `${tag} Управління` } });
    const a = await prisma.unit.create({ data: { name: `${tag} Відділ А`, parentId: dept.id } });
    const b = await prisma.unit.create({ data: { name: `${tag} Відділ Б`, parentId: dept.id } });
    const user = async (key: string, role: 'MANAGER' | 'MEMBER', unitId: string) => {
      ids[key] = (await prisma.user.create({ data: { login: `${tag}-${key}`, fullName: `${tag} ${key}`, role, unitId, passwordHash: 'x' } })).id;
    };
    await user('headA', 'MANAGER', a.id);
    await user('headB', 'MANAGER', b.id);
    await user('execA', 'MEMBER', a.id);
    invalidateUnitTree();
    server = createApp().listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    liveHub.closeAll();
    server?.close();
    if (!run) return;
    await prisma.task.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { login: { startsWith: tag } } });
    await prisma.unit.deleteMany({ where: { name: { startsWith: tag }, parentId: { not: null } } });
    await prisma.unit.deleteMany({ where: { name: { startsWith: tag } } });
  });

  it('без входу потоку немає', async () => {
    expect((await fetch(`${base}/api/live`)).status).toBe(401);
  });

  it('нове завдання: виконавець отримує сигнал одразу, керівник сусіднього відділу — нічого', async () => {
    const exec = await listen('execA');
    const foreign = await listen('headB');
    expect([exec.got.status, exec.got.type.startsWith('text/event-stream')]).toEqual([200, true]);
    expect(await until(() => exec.got.text.startsWith(':ok') && foreign.got.text.startsWith(':ok'))).toBe(true);

    const res = await fetch(`${base}/api/tasks`, {
      method: 'POST',
      headers: auth('headA'),
      body: JSON.stringify({ title: `${tag} завдання`, deadline: new Date(Date.now() + 864e5).toISOString(), assigneeIds: [ids.execA] }),
    });
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: string };

    expect(await until(() => exec.got.text.includes(`"t":"task","id":"${id}"`))).toBe(true);
    // стрічка виконавця теж: сповіщення «нове завдання»
    expect(await until(() => exec.got.text.includes('"t":"feed"'))).toBe(true);
    await new Promise((r) => setTimeout(r, 300));
    expect(foreign.got.text).not.toContain('"t":"task"');
    expect(foreign.got.text).not.toContain('"t":"feed"');
    exec.close();
    foreign.close();
  });
});
