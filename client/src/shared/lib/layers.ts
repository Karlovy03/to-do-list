/**
 * Стек відкритих шарів (аркуші, випадні списки, календар).
 * Escape і клік поза шаром стосуються лише верхнього — інакше закрилося б усе одразу.
 */
const stack: symbol[] = [];

export function pushLayer(): { id: symbol; isTop: () => boolean; pop: () => void } {
  const id = Symbol('layer');
  stack.push(id);
  return {
    id,
    isTop: () => stack[stack.length - 1] === id,
    pop: () => {
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
    },
  };
}
