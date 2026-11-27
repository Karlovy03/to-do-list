import { useState } from 'react';
import type { Person } from '@/shared/api/types';
import { shortName } from '@/shared/lib/names';
import { t } from '@/shared/lib/texts';
import css from './PresentCard.module.css';

/** «В строю 12»: кілька прізвищ і «та ще N»; «Показати всіх» розгортає повний список */
export function PresentCard({ people, first }: { people: Person[]; first: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? people : people.slice(0, first);
  const rest = people.length - shown.length;
  if (people.length === 0) return null;
  return (
    <div className={css.card}>
      <p className={css.names}>
        {shown.map((p) => shortName(p.fullName)).join(', ')}
        {rest > 0 && ` ${t('absences.strength.and_more', { n: rest })}`}
      </p>
      {people.length > first && (
        <button type="button" className={css.more} aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? t('absences.strength.collapse') : t('absences.strength.show_all', { n: people.length })}
        </button>
      )}
    </div>
  );
}
