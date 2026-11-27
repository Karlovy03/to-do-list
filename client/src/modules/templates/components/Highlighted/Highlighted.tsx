import { segments } from '../../lib/highlight';
import css from './Highlighted.module.css';

/** Текст зі збігами запиту, виділеними жирним (Figma 43); без вставки HTML */
export function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {segments(text, query).map((s, i) => (s.hit ? <mark key={i} className={css.hit}>{s.text}</mark> : s.text))}
    </>
  );
}
