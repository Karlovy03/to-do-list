import { fork } from 'node:child_process';
import path from 'node:path';
import { z } from 'zod';
import { HttpError } from '../../../core/http-error';
import type { Ext } from '../inspect';
import type { TextStatus } from './analyze';

export { checkBuffer, readText, tidy, TEXT_MAX, type TextStatus } from './analyze';

/** Межі дочірнього процесу: сервер на 1 ГБ, тож одна перевірка за раз (ADR-0023) */
export const CHECK_TIMEOUT_MS = 20_000;
const HEAP_MB = 192;
const MAX_WAITING = 3;

export interface CheckResult {
  sha256: string;
  textStatus: TextStatus;
  content: string | null;
}

const message = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('verdict'),
    sha256: z.string(),
    verdict: z.union([z.object({ ok: z.literal(true) }), z.object({ ok: z.literal(false), reason: z.string() })]),
  }),
  z.object({ type: z.literal('text'), status: z.enum(['OK', 'EMPTY', 'FAILED']), text: z.string().nullable() }),
]);

function runWorker(file: string, ext: Ext): Promise<CheckResult> {
  return new Promise((resolve, reject) => {
    // у розробці й тестах сервер працює з .ts через tsx — дочірній процес так само
    const isTs = __filename.endsWith('.ts');
    const child = fork(path.join(__dirname, isTs ? 'worker.ts' : 'worker.js'), [], {
      execArgv: [...(isTs ? ['--import', 'tsx'] : []), `--max-old-space-size=${HEAP_MB}`],
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
    });
    let sha256 = '';
    let verdict: { ok: true } | { ok: false; reason: string } | null = null;
    let settled = false;
    const finish = (text?: { status: TextStatus; text: string | null }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill('SIGKILL');
      // без вердикту файл не приймається: закрито за замовчуванням
      if (!verdict) reject(new HttpError(400, 'template_check_failed'));
      else if (!verdict.ok) reject(new HttpError(400, verdict.reason));
      else resolve({ sha256, textStatus: text?.status ?? 'FAILED', content: text?.text ?? null });
    };
    const timer = setTimeout(() => finish(), CHECK_TIMEOUT_MS);
    child.on('message', (raw) => {
      const m = message.safeParse(raw);
      if (!m.success) return finish();
      if (m.data.type === 'verdict') {
        sha256 = m.data.sha256;
        verdict = m.data.verdict;
        if (!verdict.ok) finish();
      } else finish(m.data);
    });
    // 'close' — після того, як прийшли всі повідомлення каналу (на відміну від 'exit')
    child.on('close', () => finish());
    child.on('error', () => finish());
    child.send({ file, ext });
  });
}

let chain: Promise<unknown> = Promise.resolve();
let inFlight = 0;

/** Перевіряє файл у дочірньому процесі; черга — одна перевірка за раз, понад 3 в очікуванні — 503 */
export async function checkFile(file: string, ext: Ext): Promise<CheckResult> {
  if (inFlight > MAX_WAITING) throw new HttpError(503, 'template_busy');
  inFlight++;
  const run = chain.then(() => runWorker(file, ext));
  chain = run.catch(() => undefined);
  try {
    return await run;
  } finally {
    inFlight--;
  }
}
