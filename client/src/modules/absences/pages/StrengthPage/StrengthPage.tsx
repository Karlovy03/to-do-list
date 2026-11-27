import { useState, type ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useSession } from '@/modules/auth';
import { errorText } from '@/shared/api/errors';
import { usePeople, useUnits } from '@/shared/api/people';
import type { Absence, Me } from '@/shared/api/types';
import { useNow } from '@/shared/hooks/useNow';
import { useWindowClass } from '@/shared/hooks/useWindowClass';
import { addDays, dayTitle, todayKey } from '@/shared/lib/days';
import { t } from '@/shared/lib/texts';
import { formatLongDate } from '@/shared/lib/time';
import { verticalOf } from '@/shared/lib/vertical';
import { Button, ErrorState, Loading, PageHeader, PeriodBar, Sheet } from '@/shared/ui';
import { AbsenceSheet } from '../../components/AbsenceSheet/AbsenceSheet';
import { AbsenceRow } from '../../components/AbsenceRow/AbsenceRow';
import { AbsentCard } from '../../components/AbsentCard/AbsentCard';
import { NewAbsenceForm } from '../../components/AbsenceForm/NewAbsenceForm';
import { PresentCard } from '../../components/PresentCard/PresentCard';
import { StrengthCounter } from '../../components/StrengthCounter/StrengthCounter';
import { StrengthPrint } from '../../components/StrengthPrint/StrengthPrint';
import { UnitSheet } from '../../components/UnitSheet/UnitSheet';
import { useAbsences } from '../../hooks/useAbsences';
import { readStrength, writeStrength, type StrengthParams } from '../../lib/params';
import { byUnit, peopleOf, strengthOn, upcomingFor } from '../../lib/strength';
import css from './StrengthPage.module.css';

const UPCOMING_DAYS = 14;
/** скільки прізвищ у «В строю» до «та ще N»: телефон і Flip — 2, Fold — 3, комп'ютер — 6 (Figma 23, 28, 30) */
const PRESENT_NAMES = { xs: 2, sm: 2, md: 3, lg: 6 } as const;

export function StrengthPage() {
  const { me } = useSession();
  if (!me) return null;
  // «В строю» — для тих, хто відповідає за людей; виконавець бачить свої відсутності в «Ще»
  if (me.role === 'MEMBER') return <Navigate to="/" replace />;
  return <Strength me={me} />;
}

/** «В строю» (Figma 23, 28–30): скільки людей підрозділу на службі в обраний день, хто відсутній і хто піде найближчим часом */
function Strength({ me }: { me: Me }) {
  const wc = useWindowClass();
  const now = useNow();
  const today = todayKey(now);
  const [sp, setSp] = useSearchParams();
  const units = useUnits();
  const people = usePeople();
  const vertical = verticalOf(me, units.data ?? [], people.data ?? []);
  const params = readStrength(sp, me, now);
  const unitId = params.unitId ?? vertical.units[0]?.id ?? null;
  const absences = useAbsences(params.day, addDays(params.day, UPCOMING_DAYS));
  const [choosing, setChoosing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<Absence | null>(null);
  const set = (next: Partial<StrengthParams>) => setSp(writeStrength({ ...params, unitId, ...next }, me, now));

  const unitName = units.data?.find((u) => u.id === unitId)?.name ?? '';
  const bar = (
    <PeriodBar
      title={dayTitle(params.day, now)}
      who={unitId ? { label: unitName, icon: 'users', onOpen: () => setChoosing(true) } : undefined}
      onShift={(dir) => set({ day: addDays(params.day, dir) })}
      onToday={() => set({ day: today })}
    />
  );
  const error = units.error ?? people.error ?? absences.error;
  const ready = units.data && people.data && absences.data;
  let body: ReactNode;
  let paper: ReactNode = null;
  if (error) body = <ErrorState message={errorText(error)} onRetry={() => void Promise.all([units.refetch(), people.refetch(), absences.refetch()])} />;
  else if (!ready || !unitId) body = <Loading />;
  else {
    const scope = peopleOf(unitId, params.sub, units.data ?? [], people.data ?? []);
    const strength = strengthOn(scope, absences.data ?? [], params.day);
    const upcoming = upcomingFor(scope, absences.data ?? [], params.day, UPCOMING_DAYS);
    paper = <StrengthPrint strength={strength} units={units.data ?? []} unitName={unitName} sub={params.sub} day={params.day} now={now} />;
    const wide = wc === 'md' || wc === 'lg';
    // вузькі колонки Fold і Flip — коротка дата «до 28.11» (правка власника)
    const short = wc === 'md' || wc === 'xs';
    const absent = (
      <Section title={t('absences.strength.absent')} count={strength.absent.length}>
        <AbsentCard groups={byUnit(strength.absent, units.data ?? [])} today={today} short={short} compact={wc === 'xs'} inline={wc === 'lg'} onOpen={setOpen} />
      </Section>
    );
    const present = (
      <Section title={t('absences.strength.in_line')} count={strength.present.length}>
        <PresentCard key={`${unitId}|${params.sub}|${params.day}`} people={strength.present} first={PRESENT_NAMES[wc]} />
      </Section>
    );
    const next = (
      <Section title={t('absences.strength.upcoming')} count={upcoming.length}>
        <div className={css.card}>
          {upcoming.length === 0 && <p className={css.empty}>{t('absences.strength.none_upcoming')}</p>}
          {upcoming.map((a) => (
            <AbsenceRow key={a.id} absence={a} today={today} short={short} compact={wc === 'xs'} inline={wc === 'lg'} onOpen={() => setOpen(a)} />
          ))}
        </div>
      </Section>
    );
    const mark = (
      <Button variant="outline" size="l" icon="plus" block={!wide} className={css.mark} onClick={() => setAdding(true)}>
        {t('absences.strength.mark')}
      </Button>
    );
    body = (
      <div className={wide ? `${css.cols} ${css.wide}` : css.cols}>
        <div className={css.col}>
          {wc === 'md' && bar}
          <StrengthCounter strength={strength} hideZero={wc === 'xs'} />
          {absent}
          {wc === 'xs' && bar}
          {!wide && present}
          {!wide && next}
          {!wide && mark}
        </div>
        {wide && (
          <div className={css.col}>
            {next}
            {present}
            {mark}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={css.page}>
      <div className={css.screen} data-print="hide">
        <PageHeader
          eyebrow={wc === 'xs' ? undefined : formatLongDate(now)}
          title={t('absences.strength.title')}
          actions={
            wc === 'xs' || !paper ? undefined : (
              <Button variant="primary" icon="printer" onClick={() => window.print()}>
                {t('absences.print.print')}
              </Button>
            )
          }
        />
        {(wc === 'sm' || wc === 'lg' || !ready) && bar}
        {body}
      </div>
      {paper}

      {choosing && unitId && (
        <UnitSheet vertical={vertical} units={units.data ?? []} unitId={unitId} sub={params.sub} onClose={() => setChoosing(false)}
          onApply={(id, sub) => { setChoosing(false); set({ unitId: id, sub }); }} />
      )}
      {adding && (
        <Sheet title={t('absences.strength.mark')} onClose={() => setAdding(false)}>
          <NewAbsenceForm me={me} onCreated={() => setAdding(false)} />
        </Sheet>
      )}
      {open && <AbsenceSheet absence={open} me={me} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className={css.section}>
      <h2 className={css.heading}>
        {title} <span className={css.count}>{count}</span>
      </h2>
      {children}
    </section>
  );
}
