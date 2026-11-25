import { useSyncExternalStore } from 'react';

/**
 * Клас вікна (див. скіл styling-components):
 * xs — обкладинка Flip, вузьке вікно; sm — телефон і зовнішній екран Fold;
 * md — внутрішній екран Fold, планшет у портреті (список і картка поруч); lg — планшет, DeX, комп'ютер.
 */
export type WindowClass = 'xs' | 'sm' | 'md' | 'lg';

export function windowClass(w: number, h: number): WindowClass {
  if (w < 340 || h < 480) return 'xs';
  if (w < 680) return 'sm';
  if (w < 1200) return 'md';
  return 'lg';
}

const subscribe = (cb: () => void) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};
const snapshot = () => windowClass(window.innerWidth, window.innerHeight);

export const useWindowClass = () => useSyncExternalStore(subscribe, snapshot);
export const isWide = (c: WindowClass) => c === 'md' || c === 'lg';
