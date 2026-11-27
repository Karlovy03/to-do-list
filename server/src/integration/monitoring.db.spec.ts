import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../core/prisma';
import { signToken } from '../core/auth';
import { liveHub } from '../modules/live';
import { invalidateUnitTree } from '../modules/units';
import { createApp } from '../app';

/*
 * Моніторинг наскрізно (ADR-0024): лише адміністратор; запити людини — її візит;
 * відкритий застосунок (потік /api/live) — «онлайн», і адміністратор отримує сигнал presence.
 */
const run = process.env.INTEGRATION === '1';
const tag = `mon${Date.now()}`;
const DAY_MS = 864e5;

let server: Server;
let base = '';
const ids: Record<string, string> = {};
const auth = (who: string) => ({ Authorization: `Bearer ${signToken(ids[who], 0)}` });
const get = (who: string, path: string) => fetch(`${base}/api${path}`, { headers: auth(who) });

async function listen(who: string) {
  const ctrl = new AbortController();
  const res = await fetch(`${base}/api/live`, { headers: auth(who), signal: ctrl.signal });
  const got = { text: '' };
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

const until = async (ok: () => boolean | Promise<boolean>, ms = 3000) => {
  const end = Date.now() + ms;
  while (!(await ok()) && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
  return ok();
};

type People = { items: { person: { id: string }; online: boolean; lastAt: string | null; visits30: number }[] };
const personIn = async (id: string) => ((await (await get('admin', '/monitoring/people')).json()) as People).items.find((i) => i.person.id === id);

describe.skipIf(!run)('моніторинг на реальній базі (ADR-0024)', () => {
  beforeAll(async () => {
    const unit = await prisma.unit.create({ data: { name: `${tag} Відділ` } });
    const user = async (key: string, role: 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'MEMBER') => {
      ids[key] = (await prisma.user.create({ data: { login: `${tag}-${key}`, fullName: `${tag} ${key}`, role, unitId: role === 'ADMIN' || role === 'DIRECTOR' ? null : unit.id, passwordHash: 'x' } })).id;
    };
    await user('admin', 'ADMIN');
    await user('director', 'DIRECTOR');
    await user('head', 'MANAGER');
    await user('member', 'MEMBER');
    invalidateUnitTree();
    server = createApp().listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    liveHub.closeAll();
    server?.close();
    if (!run) return;
    await prisma.user.deleteMany({ where: { login: { startsWith: tag } } });
    await prisma.unit.deleteMany({ where: { name: { startsWith: tag } } });
  });

  it('лише адміністратор: директор, керівник і виконавець — 403', async () => {
    for (const path of ['/monitoring/people', '/monitoring/server', `/monitoring/people/${ids.member}/visits`]) {
      expect((await get('admin', path)).status).toBe(200);
      for (const who of ['director', 'head', 'member']) expect((await get(who, path)).status).toBe(403);
    }
  });

  it('запити людини — її візит, лише час', async () => {
    await get('member', '/profile');
    expect(await until(async () => (await prisma.visit.count({ where: { userId: ids.member } })) > 0)).toBe(true);
    const v = await prisma.visit.findFirst({ where: { userId: ids.member } });
    expect(Object.keys(v!).sort()).toEqual(['id', 'lastAt', 'startedAt', 'userId']);
    const res = (await (await get('admin', `/monitoring/people/${ids.member}/visits`)).json()) as { items: unknown[]; activeDays: string[] };
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.activeDays.length).toBe(1);
  });

  it('відкрив застосунок — «онлайн», адміністратор отримує сигнал (керівник — ні); закрив — уже ні', async () => {
    const admin = await listen('admin');
    const head = await listen('head');
    await until(() => admin.got.text.startsWith(':ok') && head.got.text.startsWith(':ok'));
    const member = await listen('member');
    expect(await until(() => admin.got.text.includes(`"t":"presence","id":"${ids.member}"`))).toBe(true);
    expect(head.got.text).not.toContain('presence');
    head.close();
    expect((await personIn(ids.member))?.online).toBe(true);
    const before = admin.got.text.split('presence').length;
    member.close();
    expect(await until(() => admin.got.text.split('presence').length > before)).toBe(true);
    expect(await until(async () => (await personIn(ids.member))?.online === false)).toBe(true);
    admin.close();
  });

  it('прибирання: візити старші 90 днів зникають, свіжі лишаються', async () => {
    const { monitoringRepository } = await import('../modules/monitoring/monitoring.repository');
    const old = new Date(Date.now() - 91 * DAY_MS);
    await prisma.visit.create({ data: { userId: ids.head, startedAt: old, lastAt: old } });
    await monitoringRepository.prune(new Date());
    expect(await prisma.visit.count({ where: { userId: ids.head, lastAt: { lt: new Date(Date.now() - 90 * DAY_MS) } } })).toBe(0);
    expect(await prisma.visit.count({ where: { userId: ids.member } })).toBeGreaterThan(0);
  });

  it('стан сервера: пам’ять — із /proc/meminfo усього VPS', async () => {
    const s = (await (await get('admin', '/monitoring/server')).json()) as { level: string; metrics: { memory: { totalB: number } | null; db: { connections: number } } };
    const total = Number(fs.readFileSync('/proc/meminfo', 'utf8').match(/^MemTotal:\s+(\d+)/m)![1]) * 1024;
    expect(s.metrics.memory?.totalB).toBe(total);
    expect(s.metrics.db.connections).toBeGreaterThan(0);
    expect(['ok', 'warn', 'bad']).toContain(s.level);
  });
}, 30_000);
