import type { Me } from '@/shared/api/types';
import { isDayKey, todayKey } from '@/shared/lib/days';

/** «В строю»: день і підрозділ живуть в адресі — ними можна поділитися, і вони переживають оновлення сторінки */
export interface StrengthParams {
  day: string;
  /** null — підрозділ керівника, а директору без підрозділу — верхній у вертикалі */
  unitId: string | null;
  sub: boolean;
}

export function readStrength(sp: URLSearchParams, me: Me, now = new Date()): StrengthParams {
  const date = sp.get('date');
  return { day: isDayKey(date) ? date : todayKey(now), unitId: sp.get('unit') ?? me.unitId, sub: sp.get('sub') !== '0' };
}

export function writeStrength(p: StrengthParams, me: Me, now = new Date()): URLSearchParams {
  const sp = new URLSearchParams();
  if (p.day !== todayKey(now)) sp.set('date', p.day);
  if (p.unitId && p.unitId !== me.unitId) sp.set('unit', p.unitId);
  if (!p.sub) sp.set('sub', '0');
  return sp;
}
