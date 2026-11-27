import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../core/prisma';
import { signToken } from '../core/auth';
import { invalidateUnitTree } from '../modules/units';
import { docx, para, simplePdf } from '../modules/templates/inspect/files.fixture';
import { createApp } from '../app';

/*
 * Шаблони наскрізно (ADR-0023): завантаження з перевіркою в окремому процесі → пошук за словом із тексту
 * (кирилиця, інший регістр) → скачування з українським іменем → права на видалення.
 */
const run = process.env.INTEGRATION === '1';
const tag = `tpl${Date.now()}`;

let server: Server;
let base = '';
const ids: Record<string, string> = {};
const auth = (who: string) => ({ Authorization: `Bearer ${signToken(ids[who], 0)}` });

async function upload(who: string, fileName: string, buf: Buffer, fields: Record<string, string> = {}) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('file', new Blob([new Uint8Array(buf)]), fileName);
  const res = await fetch(`${base}/api/templates`, { method: 'POST', headers: auth(who), body: form });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const search = async (who: string, q: string) => {
  const res = await fetch(`${base}/api/templates?q=${encodeURIComponent(q)}`, { headers: auth(who) });
  return (await res.json()) as { items: { id: string; name: string; match: { in: string; snippet: string | null } | null; can: { change: boolean } }[] };
};

describe.skipIf(!run)('шаблони на реальній базі (ADR-0023)', () => {
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
    await user('execB', 'MEMBER', b.id);
    invalidateUnitTree();
    server = createApp().listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server?.close();
    if (!run) return;
    await prisma.template.deleteMany({ where: { name: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { login: { startsWith: tag } } });
    await prisma.unit.deleteMany({ where: { name: { startsWith: tag }, parentId: { not: null } } });
    await prisma.unit.deleteMany({ where: { name: { startsWith: tag } } });
  });

  let id = '';
  const content = docx(para(`${tag} Прошу надати мені щорічну ОСНОВНУ відпустку з 1 грудня`));

  it('виконавець додає docx: текст розпізнано, підрозділ — його', async () => {
    const r = await upload('execA', `${tag} Рапорт.docx`, content, { name: `${tag} Рапорт на відпустку`, description: 'Зразок' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ name: `${tag} Рапорт на відпустку`, ext: 'docx', textStatus: 'OK', can: { change: true } });
    id = String(r.body.id);
  });

  it('пошук за словом лише з тексту, іншим регістром: уривок довкола збігу', async () => {
    const { items } = await search('execB', `${tag} прошу надати мені щорічну основну`);
    expect(items.map((i) => i.id)).toEqual([id]);
    expect(items[0].match?.in).toBe('content');
    expect(items[0].match?.snippet).toContain('ОСНОВНУ відпустку');
    // чужий виконавець бачить, але змінювати не може
    expect(items[0].can.change).toBe(false);
  });

  it('збіг у назві — перед збігом у тексті', async () => {
    const { items } = await search('execB', `${tag} РАПОРТ НА`);
    expect(items[0]).toMatchObject({ id, match: { in: 'name', snippet: null } });
  });

  it('скачування: тип файлу, українське ім’я, ті самі байти', async () => {
    const res = await fetch(`${base}/api/templates/${id}/file`, { headers: auth('execB') });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('wordprocessingml');
    expect(res.headers.get('content-disposition')).toContain(`attachment; filename=`);
    expect(res.headers.get('content-disposition')).toContain(`filename*=UTF-8''${encodeURIComponent(`${tag} Рапорт на відпустку.docx`)}`);
    expect(Buffer.from(await res.arrayBuffer()).equals(content)).toBe(true);
  });

  it('той самий файл ще раз — 409 з назвою наявного; файл із макросом — 400', async () => {
    const dup = await upload('execB', 'copy.docx', content);
    expect(dup).toMatchObject({ status: 409, body: { error: 'template_duplicate', name: `${tag} Рапорт на відпустку` } });
    const macro = await upload('execB', `${tag}.docx`, docx(para('x'), { 'word/vbaProject.bin': 'VBA' }));
    expect(macro).toMatchObject({ status: 400, body: { error: 'template_macros' } });
  });

  it('PDF відкривається в браузері (inline), docx — ні', async () => {
    const r = await upload('execB', `${tag} Наказ.pdf`, simplePdf(`${tag} order sample`), { name: `${tag} Наказ` });
    expect(r.status).toBe(201);
    const pdfRes = await fetch(`${base}/api/templates/${String(r.body.id)}/file?inline=1`, { headers: auth('execA') });
    expect([pdfRes.headers.get('content-type'), pdfRes.headers.get('content-disposition')?.startsWith('inline')]).toEqual(['application/pdf', true]);
    const docRes = await fetch(`${base}/api/templates/${id}/file?inline=1`, { headers: auth('execA') });
    expect(docRes.headers.get('content-disposition')?.startsWith('attachment')).toBe(true);
  });

  it('видалити: керівник сусіднього відділу й інший виконавець — 403; керівник автора — так', async () => {
    const del = (who: string) => fetch(`${base}/api/templates/${id}`, { method: 'DELETE', headers: auth(who) });
    expect((await del('headB')).status).toBe(403);
    expect((await del('execB')).status).toBe(403);
    expect((await del('headA')).status).toBe(204);
    expect((await fetch(`${base}/api/templates/${id}/file`, { headers: auth('execA') })).status).toBe(404);
  });
}, 60_000);
