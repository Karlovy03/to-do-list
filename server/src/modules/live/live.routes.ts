import { Router } from 'express';
import { currentUser } from '../../core/auth';
import { liveHub } from './live.hub';

/** «Серцебиття»: проксі й мобільні мережі закривають тихі з'єднання; коментар SSE клієнт ігнорує */
export const HEARTBEAT_MS = 25_000;

export const liveRouter = Router();

/** GET /api/live — потік сигналів «що змінилось» (text/event-stream). Вхід — як у решти API: cookie чи Bearer */
liveRouter.get('/', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  // перший байт одразу: проксі віддають заголовки й не чекають першої події
  res.write(':ok\n\n');
  const conn = liveHub.add(currentUser(req), res);
  const beat = setInterval(() => res.write(':\n\n'), HEARTBEAT_MS);
  req.on('close', () => {
    clearInterval(beat);
    liveHub.remove(conn);
  });
});
