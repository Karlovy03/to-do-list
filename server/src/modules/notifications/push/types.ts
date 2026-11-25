export interface PushPayload {
  title: string;
  body: string;
  /** куди відкрити при натисканні */
  url: string;
  /** однаковий tag замінює попереднє сповіщення, а не додає нове */
  tag: string;
  taskId?: string;
  urgent?: boolean;
  /** підписи кнопок — з YAML на сервері, service worker текстів не містить */
  actions?: { open: string; snooze?: string };
}

/** Результат надсилання на один токен/підписку */
export type SendResult = 'ok' | 'dead' | 'error';

export const PUSH_TIMEOUT_MS = 10_000;
