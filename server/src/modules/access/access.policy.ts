import type { Role } from '@prisma/client';

/**
 * Спільні правила видимості (ADR-0012) для всього, що прив'язане до людей і підрозділів:
 * завдань, заходів, календаря. Конкретні права кожної сутності — у її власному *.policy.ts.
 */

/** 'all' — усе; інакше — підрозділи вертикалі (порожньо — лише власне) */
export type Scope = 'all' | ReadonlySet<string>;

export interface PolicyUser {
  id: string;
  role: Role;
  scope?: Scope;
}

/** Бачить і керує всім: адміністратор і директор */
export const hasFullAccess = (u: Pick<PolicyUser, 'role'>) => u.role === 'ADMIN' || u.role === 'DIRECTOR';

/** Керівна роль: доручає будь-кому і бере на контроль */
export const isManagerRole = (u: Pick<PolicyUser, 'role'>) => u.role === 'ADMIN' || u.role === 'DIRECTOR' || u.role === 'MANAGER';

/** Хоч один із підрозділів — у вертикалі людини */
export function inScope(u: PolicyUser, unitIds: (string | null | undefined)[]): boolean {
  const scope = u.scope;
  if (scope === 'all') return true;
  if (!scope || scope.size === 0) return false;
  return unitIds.some((id) => !!id && scope.has(id));
}

/** Підрозділи вертикалі керівника для умови в базі; порожньо — вертикалі немає */
export const scopeUnits = (u: PolicyUser): string[] => (u.role === 'MANAGER' && u.scope && u.scope !== 'all' ? [...u.scope] : []);

/** Керує як керівник: повний доступ або керівник, у чиїй вертикалі є хтось із підрозділів */
export const managesUnits = (u: PolicyUser, unitIds: (string | null | undefined)[]) => hasFullAccess(u) || (u.role === 'MANAGER' && inScope(u, unitIds));
