type Pt = [number, number];

/** Неперервні шматки графіка (0–100 %) у координатах SVG W×H; пропуск (null) розриває лінію */
export function segments(values: (number | null)[], w: number, h: number): Pt[][] {
  const step = w / Math.max(1, values.length - 1);
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (cur.length) out.push(cur);
      cur = [];
      return;
    }
    cur.push([i * step, h - (Math.min(100, Math.max(0, v)) / 100) * h]);
  });
  if (cur.length) out.push(cur);
  return out;
}

const xy = ([x, y]: Pt) => `${x.toFixed(1)} ${y.toFixed(1)}`;

export const linePath = (segs: Pt[][]) => segs.map((s) => `M${s.map(xy).join(' L')}`).join(' ');

/** Заливка під лінією: кожен шматок замкнений донизу */
export const areaPath = (segs: Pt[][], h: number) =>
  segs.map((s) => `M${s[0][0].toFixed(1)} ${h} L${s.map(xy).join(' L')} L${s[s.length - 1][0].toFixed(1)} ${h} Z`).join(' ');

/** Найбільше значення і його індекс — для підказки «найбільше за період» */
export function peakOf(values: (number | null)[]): { value: number; index: number } | null {
  let best: { value: number; index: number } | null = null;
  values.forEach((v, i) => {
    if (v !== null && (best === null || v > best.value)) best = { value: v, index: i };
  });
  return best;
}
