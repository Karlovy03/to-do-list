import { api } from '@/shared/api/client';
import { isIosBrowser, isStandalone } from '@/shared/lib/platform';
import { keyBytes } from './keyBytes';

/** Стан сповіщень на цьому пристрої */
export type PushState = 'on' | 'off' | 'denied' | 'unsupported' | 'ios_install';

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function webPushState(): Promise<PushState> {
  // Safari на iPhone дає push лише застосунку, доданому на екран «Домів»
  if (isIosBrowser && !isStandalone()) return 'ios_install';
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return (await currentSubscription()) ? 'on' : 'off';
}

/** Підписка цього браузера → сервер (upsert за endpoint); нову створює, якщо її немає */
async function subscribe() {
  await navigator.serviceWorker.register('/sw.js');
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await api<{ publicKey: string }>('/push/key');
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
}

/** Кнопка «Увімкнути»: дозвіл запитується лише у відповідь на дію людини (вимога iPhone) */
export async function enableWebPush(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  await subscribe();
  return 'on';
}

/**
 * Після входу: якщо дозвіл уже є — оновлює підписку на сервері.
 * Браузер може тихо замінити підписку, сервер — прибрати її після збою; так вона відновлюється.
 */
export async function syncWebPush() {
  if (supported() && Notification.permission === 'granted') await subscribe();
}
