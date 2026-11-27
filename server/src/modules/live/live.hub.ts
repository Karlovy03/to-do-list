import type { User } from '@prisma/client';
import { toViewer, type Viewer } from '../access';

/** Що змінилось (ADR-0021): лише вид і id, без змісту — дані клієнт перепитує звичайним запитом із перевіркою прав */
export type LiveTopic = 'task' | 'event' | 'absence' | 'template' | 'presence' | 'feed';
export interface LiveSignal {
  t: LiveTopic;
  id?: string;
}

/** Куди писати потік — це Response express; тести підставляють свою заглушку */
export interface LiveSink {
  write(chunk: string): unknown;
  end(): unknown;
}

interface Connection {
  user: User;
  sink: LiveSink;
}

/** Більше з'єднань в однієї людини — найстаріше закривається (забуті вкладки, перепідключення) */
export const MAX_PER_USER = 5;

const byUser = new Map<string, Connection[]>();

const frame = (s: LiveSignal) => `event: change\ndata: ${JSON.stringify(s)}\n\n`;

/** Хто онлайн, бачить лише адміністратор (ADR-0024) — і сигнал «прийшов / пішов» лише йому */
const announcePresence = (userId: string) => announce({ t: 'presence', id: userId }, (v) => v.role === 'ADMIN');

/**
 * З'єднання живих оновлень одного процесу (ADR-0021). Хто отримає сигнал, вирішує той, хто публікує, —
 * функцією від Viewer на основі своїх policy (canView, canViewEvent), тож live не знає правил модулів.
 */
export const liveHub = {
  add(user: User, sink: LiveSink): Connection {
    const list = byUser.get(user.id) ?? [];
    const cameOnline = list.length === 0;
    while (list.length >= MAX_PER_USER) list.shift()?.sink.end();
    const conn = { user, sink };
    list.push(conn);
    byUser.set(user.id, list);
    if (cameOnline) announcePresence(user.id);
    return conn;
  },

  remove(conn: Connection) {
    // уже знятий (dropUser, closeAll) — нічого не міняється
    if (!byUser.get(conn.user.id)?.includes(conn)) return;
    const list = byUser.get(conn.user.id)!.filter((c) => c !== conn);
    if (list.length) byUser.set(conn.user.id, list);
    else {
      byUser.delete(conn.user.id);
      announcePresence(conn.user.id);
    }
  },

  /** У кого зараз відкритий застосунок (живий потік) — це й є «онлайн» */
  onlineUserIds: () => new Set(byUser.keys()),

  async publish(signal: LiveSignal, audience: (v: Viewer) => boolean) {
    const data = frame(signal);
    for (const list of [...byUser.values()]) {
      // вертикаль рахується з кешованого дерева підрозділів — дешево, і завжди за актуальною структурою
      const viewer = await toViewer(list[0].user);
      if (audience(viewer)) for (const c of list) c.sink.write(data);
    }
  },

  /** Роль, підрозділ, вихід чи новий пароль — з'єднання закриваються, клієнт перепідключиться вже з новими правами */
  dropUser(userId: string) {
    for (const c of byUser.get(userId) ?? []) c.sink.end();
    byUser.delete(userId);
  },

  /** Перед зупинкою процесу: відкриті потоки інакше тримали б server.close() */
  closeAll() {
    for (const list of byUser.values()) for (const c of list) c.sink.end();
    byUser.clear();
  },

  connections: () => [...byUser.values()].reduce((n, l) => n + l.length, 0),
};

/** Публікація у фоні: збій живих оновлень не має ламати дію, яка вже збереглася */
export function announce(signal: LiveSignal, audience: (v: Viewer) => boolean) {
  liveHub.publish(signal, audience).catch((err: unknown) => console.error('[live] publish failed', err));
}
