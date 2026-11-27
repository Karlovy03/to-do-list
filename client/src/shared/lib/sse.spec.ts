import { describe, expect, it } from 'vitest';
import { sseParser, type SseEvent } from './sse';

const parse = (chunks: string[]) => {
  const got: SseEvent[] = [];
  const push = sseParser((e) => got.push(e));
  for (const c of chunks) push(c);
  return got;
};

describe('розбір потоку SSE', () => {
  it('коментарі й серцебиття пропускає, подію віддає з типом і даними', () => {
    expect(parse([':ok\n\n', ':\n\n', 'event: change\ndata: {"t":"task","id":"1"}\n\n'])).toEqual([{ event: 'change', data: '{"t":"task","id":"1"}' }]);
  });
  it('кадр, розірваний між шматками мережі, і кілька кадрів в одному шматку', () => {
    expect(parse(['event: change\nda', 'ta: {"t":"feed"}\n', '\nevent: change\ndata: a\n\ndata: b\n\n'])).toEqual([
      { event: 'change', data: '{"t":"feed"}' },
      { event: 'change', data: 'a' },
      { event: 'message', data: 'b' },
    ]);
  });
  it('переноси \\r\\n і незавершений кадр — не подія, доки не прийде порожній рядок', () => {
    expect(parse(['data: x\r\n\r\n', 'data: y\n'])).toEqual([{ event: 'message', data: 'x' }]);
  });
});
