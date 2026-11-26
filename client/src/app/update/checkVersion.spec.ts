import { describe, expect, it } from 'vitest';
import { hasNewVersion } from './checkVersion';

const reply = (body: unknown, status = 200) => async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

describe('нова версія застосунку', () => {
  it('інший номер збірки на сервері — так', async () => {
    expect(await hasNewVersion('aaa', reply({ id: 'bbb' }))).toBe(true);
  });
  it('той самий номер — ні', async () => {
    expect(await hasNewVersion('aaa', reply({ id: 'aaa' }))).toBe(false);
  });
  it('файлу немає (режим розробки), збій мережі чи кривий вміст — ні, людину не турбуємо', async () => {
    expect(await hasNewVersion('aaa', reply('not found', 404))).toBe(false);
    expect(await hasNewVersion('aaa', async () => Promise.reject(new Error('offline')))).toBe(false);
    expect(await hasNewVersion('aaa', reply('<html>'))).toBe(false);
    expect(await hasNewVersion('aaa', reply({ version: 1 }))).toBe(false);
  });
});
