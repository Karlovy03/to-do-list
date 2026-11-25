import css from './ProgressRing.module.css';

/** Кільце готовності 0–100 */
export function ProgressRing({ value, label, size = 32 }: { value: number; label: string; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 13;
  const c = 2 * Math.PI * r;
  return (
    <span className={v === 100 ? `${css.ring} ${css.full}` : css.ring} role="img" aria-label={label} style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
        <circle className={css.track} cx="16" cy="16" r={r} />
        <circle className={css.value} cx="16" cy="16" r={r} strokeDasharray={`${(c * v) / 100} ${c}`} />
      </svg>
      <span className={css.text}>{v}</span>
    </span>
  );
}
