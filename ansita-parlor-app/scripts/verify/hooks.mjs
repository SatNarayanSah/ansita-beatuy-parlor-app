// Node module-resolution hooks so the verification scripts can import app code
// directly: maps the `@/` alias to src/, resolves extensionless TypeScript
// imports, and swaps AsyncStorage (a native module) for an in-memory shim.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const SHIM = new URL('./async-storage-shim.mjs', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === '@react-native-async-storage/async-storage') return { url: SHIM, shortCircuit: true };

  let target = null;
  if (specifier.startsWith('@/')) target = path.join(SRC, specifier.slice(2));
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.includes('/src/')) {
    target = path.join(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (target) {
    for (const ext of ['.ts', '.tsx', '/index.ts']) {
      if (existsSync(target + ext)) return next(pathToFileURL(target + ext).href, context);
    }
  }
  return next(specifier, context);
}
