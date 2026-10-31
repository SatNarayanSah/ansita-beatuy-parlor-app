/**
 * Seeded pseudo-random generator (mulberry32). Seed builders must be pure:
 * stores rebuild their slice independently, and generated appointments,
 * reviews and notifications must agree on ids every time.
 */
export interface SeededRandom {
  /** Float in [0, 1). */
  next: () => number;
  /** Integer in [min, max], inclusive. */
  int: (min: number, max: number) => number;
  /** True with probability `p`. */
  chance: (p: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
  /** Fisher-Yates shuffle into a new array. */
  shuffle: <T>(items: readonly T[]) => T[];
  /** Picks a key by relative weight, e.g. { completed: 8, cancelled: 1 }. */
  weighted: <K extends string>(weights: Readonly<Record<K, number>>) => K;
}

export const createRandom = (seed: number): SeededRandom => {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const pick = <T>(items: readonly T[]): T => {
    const item = items[Math.floor(next() * items.length)];
    if (item === undefined) throw new Error('pick() called with an empty list');
    return item;
  };

  const weighted = <K extends string>(weights: Readonly<Record<K, number>>): K => {
    const entries = Object.entries(weights) as [K, number][];
    let roll = next() * entries.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [key, weight] of entries) {
      roll -= weight;
      if (roll < 0) return key;
    }
    const last = entries[entries.length - 1];
    if (!last) throw new Error('weighted() called with no options');
    return last[0];
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [result[i], result[j]] = [result[j] as T, result[i] as T];
    }
    return result;
  };

  return {
    next,
    shuffle,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick,
    weighted,
  };
};
