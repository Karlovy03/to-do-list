import sign from './mvs-sign.svg';
import css from './BrandMark.module.css';

/** Офіційний знак МВС: не перефарбовувати, не обрізати (охоронна зона — ½ висоти) */
export function BrandMark({ size = 40, label }: { size?: number; label: string }) {
  return <img className={css.mark} src={sign} width={size} height={size} alt={label} />;
}
