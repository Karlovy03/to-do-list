/** «Петренко Віктор» → «Петренко В.»; вільний текст лишається як є */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2 || parts.length > 3) return full;
  return `${parts[0]} ${parts[1][0]}.`;
}
