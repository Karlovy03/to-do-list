import css from './ProgressBar.module.css';

export function ProgressBar({ value, done, label }: { value: number; done?: boolean; label: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={done ? `${css.track} ${css.done}` : css.track} role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${v}%` }} />
    </div>
  );
}
