import { managesUnits, type PolicyUser } from '../access';

/**
 * Шаблони (ADR-0023, рішення власника): бачать і додають усі, хто увійшов.
 * Замінити файл, змінити назву й опис, видалити — той, хто додав, керівник того підрозділу за вертикаллю,
 * директор і адміністратор.
 */
export interface PolicyTemplate {
  uploadedById: string | null;
  unitId: string | null;
}

export const canChangeTemplate = (t: PolicyTemplate, u: PolicyUser) => (!!t.uploadedById && t.uploadedById === u.id) || managesUnits(u, [t.unitId]);
