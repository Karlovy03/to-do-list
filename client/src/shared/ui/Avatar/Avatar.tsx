import css from './Avatar.module.css';

interface Named {
  id?: string;
  fullName: string;
  position?: string;
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function Avatar({ person, large, done }: { person: Named; large?: boolean; done?: boolean }) {
  const cls = [css.avatar, large && css.lg, done && css.done].filter(Boolean).join(' ');
  return (
    <span className={cls} title={person.fullName} aria-hidden="true">
      {initials(person.fullName)}
    </span>
  );
}

export function Avatars({ people, max = 3 }: { people: (Named & { doneAt?: string | null })[]; max?: number }) {
  return (
    <span className={css.stack}>
      {people.slice(0, max).map((p) => <Avatar key={p.id ?? p.fullName} person={p} done={!!p.doneAt} />)}
      {people.length > max && <span className={css.avatar}>+{people.length - max}</span>}
    </span>
  );
}

export function PersonLine({ person, note, done }: { person: Named; note?: string; done?: boolean }) {
  return (
    <div className={css.line}>
      <Avatar person={person} large done={done} />
      <div className={css.text}>
        <div>{person.fullName}</div>
        {(note ?? person.position) && <small className={done ? css.doneNote : undefined}>{note ?? person.position}</small>}
      </div>
    </div>
  );
}
