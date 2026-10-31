import type { ID } from '@/types';

export type IdPrefix =
  | 'usr'
  | 'cus'
  | 'cat'
  | 'svc'
  | 'stf'
  | 'apt'
  | 'crs'
  | 'bat'
  | 'mod'
  | 'enr'
  | 'pay'
  | 'ntf'
  | 'rev';

let counter = 0;

const randomChunk = (length: number): string =>
  Math.random()
    .toString(36)
    .slice(2, 2 + length)
    .padEnd(length, '0');

/** Collision-resistant id such as `apt_lq2x9k_3f8a_1`. Sortable by creation time. */
export const generateId = (prefix: IdPrefix): ID => {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}_${randomChunk(4)}${counter.toString(36)}`;
};

/** Opaque fake session token. */
export const generateToken = (): string =>
  `demo.${randomChunk(8)}${randomChunk(8)}.${Date.now().toString(36)}`;
