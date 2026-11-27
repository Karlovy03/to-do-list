import type { Me } from '@/shared/api/types';
import { t } from '@/shared/lib/texts';
import { Card } from '@/shared/ui';
import { sectionsFor } from '../../lib/sections';
import { RowButton } from '../RowButton/RowButton';

/** Розділи, яких немає в нижній навігації й рейці (Figma 25, 42); на комп'ютері вони в бічній панелі */
export function SectionsPanel({ me }: { me: Me }) {
  return (
    <Card title={t('settings.account.sections')}>
      {sectionsFor(me.role).map((s) => (
        <RowButton key={s.to} icon={s.icon} to={s.to}>
          {t(s.label)}
        </RowButton>
      ))}
    </Card>
  );
}
