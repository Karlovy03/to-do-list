import { useEffect, useState } from 'react';

/** Поточна мить, що оновлюється раз на step мс: «через 20 хв», «триває», лінія «зараз» */
export function useNow(step = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), step);
    return () => clearInterval(id);
  }, [step]);
  return now;
}
