import { useEffect, useRef, useState } from 'react';
import { readDraft, writeDraft, type Draft } from '../lib/drafts';

const SAVE_MS = 400;

/**
 * Чернетка форми «Створити» (Figma 41, ADR-0022): відновлена — один раз при відкритті;
 * save() — з паузою, а при закритті аркуша дозберігається одразу; finish() — надіслано, більше не зберігати.
 */
export function useDraft<T>(userId: string, name: string, parse: (raw: unknown) => T | null, enabled = true) {
  const [restored] = useState<Draft<T> | null>(() => (enabled ? readDraft(userId, name, parse) : null));
  const [noteAt, setNoteAt] = useState(restored?.savedAt ?? null);
  const pending = useRef<{ data: T | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const done = useRef(!enabled);

  const flush = () => {
    clearTimeout(timer.current);
    if (pending.current && !done.current) writeDraft(userId, name, pending.current.data);
    pending.current = null;
  };

  // закрили аркуш до кінця паузи — дозберегти набране
  useEffect(() => () => flush(), []);

  return {
    restored: restored?.data ?? null,
    /** коли збережено відновлену чернетку — для смуги «Відновлено чернетку · 08:12»; null — смуги немає */
    noteAt,
    save(data: T | null) {
      if (done.current) return;
      pending.current = { data };
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_MS);
    },
    /** «Очистити»: стерти й сховати смугу; далі набране знову зберігається */
    clear() {
      clearTimeout(timer.current);
      pending.current = null;
      writeDraft(userId, name, null);
      setNoteAt(null);
    },
    /** Надіслано: стерти й більше не зберігати (аркуш зараз закриється) */
    finish() {
      done.current = true;
      clearTimeout(timer.current);
      pending.current = null;
      writeDraft(userId, name, null);
    },
  };
}
