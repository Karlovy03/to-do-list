import { subscriptionsRepository as subs } from '../subscriptions.repository';
import { sendApns } from './apns';
import { sendFcm } from './fcm';
import { sendWeb } from './web';
import type { PushPayload } from './types';

/** Доставляє push на всі пристрої людини; мертві підписки й токени прибирає */
export async function pushToUser(userId: string, p: PushPayload) {
  const [web, devices] = await Promise.all([subs.webForUser(userId), subs.devicesForUser(userId)]);
  await Promise.all([
    ...web.map(async (s) => {
      if ((await sendWeb(s, p)) === 'dead') await subs.removeWeb(s.id);
    }),
    ...devices.map(async (d) => {
      const r = d.platform === 'ios' ? await sendApns(d.token, d.sandbox, p) : await sendFcm(d.token, p);
      if (r === 'dead') await subs.removeDevice(d.id);
    }),
  ]);
}
