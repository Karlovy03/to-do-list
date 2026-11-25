/** Режим «Без прозорості»: вибір людини або слабкий пристрій. Клас no-glass вимикає скло (utilities/glass). */
const KEY = 'kt_no_glass';

type DeviceNavigator = Navigator & { deviceMemory?: number };

const weakDevice = () => {
  const n = navigator as DeviceNavigator;
  return (n.deviceMemory !== undefined && n.deviceMemory <= 4) || navigator.hardwareConcurrency <= 4;
};

export function getNoGlass(): boolean | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
}

export function applyAppearance() {
  const pref = getNoGlass();
  document.documentElement.classList.toggle('no-glass', pref ?? weakDevice());
}

export function setNoGlass(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* сховище недоступне — діє лише до перезапуску */
  }
  document.documentElement.classList.toggle('no-glass', on);
}

export const isNoGlass = () => document.documentElement.classList.contains('no-glass');
