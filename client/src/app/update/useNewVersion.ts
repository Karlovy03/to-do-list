import { useEffect, useState } from 'react';
import { hasNewVersion } from './checkVersion';

const EVERY_MS = 5 * 60_000;

/**
 * Згорнутий застосунок телефон повертає з пам'яті без перезавантаження — інтерфейс лишається старим.
 * Тому звіряємо номер збірки при поверненні у вікно і раз на 5 хв, поки вікно на виду.
 */
export function useNewVersion(): boolean {
  const [found, setFound] = useState(false);
  useEffect(() => {
    if (found) return;
    let alive = true;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      void hasNewVersion(__BUILD_ID__).then((yes) => alive && yes && setFound(true));
    };
    const timer = window.setInterval(check, EVERY_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [found]);
  return found;
}
