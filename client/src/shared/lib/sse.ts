/** Подія потоку SSE: тип (типово «message») і дані (рядки data: через \n) */
export interface SseEvent {
  event: string;
  data: string;
}

/**
 * Розбір text/event-stream за специфікацією WHATWG, шматками як приходять з мережі.
 * Коментарі («:ok», серцебиття) пропускаються; кадр без data: — не подія.
 */
export function sseParser(onEvent: (e: SseEvent) => void) {
  let buf = '';
  return (chunk: string) => {
    buf += chunk.replace(/\r\n?/g, '\n');
    let end = buf.indexOf('\n\n');
    while (end !== -1) {
      const frame = buf.slice(0, end);
      buf = buf.slice(end + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of frame.split('\n')) {
        if (!line || line.startsWith(':')) continue;
        const i = line.indexOf(':');
        const field = i === -1 ? line : line.slice(0, i);
        const value = i === -1 ? '' : line.slice(i + 1).replace(/^ /, '');
        if (field === 'event') event = value;
        else if (field === 'data') data.push(value);
      }
      if (data.length) onEvent({ event, data: data.join('\n') });
      end = buf.indexOf('\n\n');
    }
  };
}
