import { api } from '@/shared/api/client';
import { isIosBrowser, isStandalone } from '@/shared/lib/platform';

/** Стан сповіщень на цьому пристрої */
export type PushState = 'on' | 'off' | 'denied' | 'unsupported' | 'ios_install';

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function keyBytes(base64url: string) {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function webPushState(): Promise<PushState> {
  // Safari на iPhone дає push лише застосунку, доданому на екран «Домів»
  if (isIosBrowser && !isStandalone) return 'ios_install';
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return (await currentSubscription()) ? 'on' : 'off';
}

export async function enableWebPush(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  if ((await Notification.requestPermission()) !== 'granted') return 'denied';
  await navigator.serviceWorker.register('/sw.js');
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await api<{ publicKey: string }>('/push/key');
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
  return 'on';
}

/** Адреса підписки — сервер забуває її при виході з акаунта */
export async function webPushEndpoint(): Promise<string | undefined> {
  return supported() ? (await currentSubscription())?.endpoint : undefined;
}
