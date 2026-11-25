import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform';

/**
 * Токен входу мобільного застосунку. Веб використовує httpOnly cookie і токена не бачить.
 * Сховище замінюється на Keychain/Keystore на етапі мобільних застосунків (building-mobile-apps).
 */
const KEY = 'kt_token';
let token: string | null = null;

export async function loadToken() {
  if (isNative) token = (await Preferences.get({ key: KEY })).value;
}

export const getToken = () => token;

export async function setToken(value: string | null) {
  token = value;
  if (!isNative) return;
  if (value) await Preferences.set({ key: KEY, value });
  else await Preferences.remove({ key: KEY });
}
