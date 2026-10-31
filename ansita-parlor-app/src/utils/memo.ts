/**
 * `React.memo` comparator for list rows: shallow-compares data props and
 * ignores function props. Parents pass inline callbacks that are recreated on
 * every render but behave the same (they close over stable navigation/state
 * setters and the row's own item), so comparing them would defeat the memo.
 */
export const sameDataProps = <P extends object>(prev: Readonly<P>, next: Readonly<P>): boolean => {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]) as Set<keyof P>;
  for (const key of keys) {
    const a = prev[key];
    const b = next[key];
    if (typeof a === 'function' && typeof b === 'function') continue;
    if (!Object.is(a, b)) return false;
  }
  return true;
};
