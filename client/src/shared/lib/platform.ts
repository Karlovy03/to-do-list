import { Capacitor } from '@capacitor/core';

/** true — запущено як застосунок Android/iPhone, false — у браузері */
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform() as 'web' | 'android' | 'ios';

/** У браузері API на тому ж домені; застосунок ходить на адресу з VITE_API_URL */
export const API_BASE = isNative ? (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') : '';

export const isIosBrowser = !isNative && /iPad|iPhone|iPod/.test(navigator.userAgent);
export const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
