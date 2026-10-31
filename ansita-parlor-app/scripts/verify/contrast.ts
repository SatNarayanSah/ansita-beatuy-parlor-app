/** WCAG 2.1 AA contrast audit of the theme's text/surface pairs, light and dark. `npm run verify:contrast` */
import { darkColors, lightColors, type ThemeColors } from '@/theme/colors';
import { getToneColors, type Tone } from '@/theme/tones';

const lum = (hex: string): number => {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (ch[0] ?? 0) + 0.7152 * (ch[1] ?? 0) + 0.0722 * (ch[2] ?? 0);
};
const ratio = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

let fails = 0;
const audit = (mode: string, c: ThemeColors): void => {
  // [label, fg, bg, minimum] — 4.5 for body text, 3 for large text / UI glyphs.
  const pairs: [string, string, string, number][] = [];
  for (const [bgName, bg] of [['background', c.background], ['surface', c.surface], ['surfaceAlt', c.surfaceAlt]] as const) {
    pairs.push([`text on ${bgName}`, c.text, bg, 4.5]);
    pairs.push([`textSecondary on ${bgName}`, c.textSecondary, bg, 4.5]);
    pairs.push([`textMuted on ${bgName}`, c.textMuted, bg, 4.5]);
    pairs.push([`primary (links) on ${bgName}`, c.primary, bg, 4.5]);
  }
  pairs.push(['onPrimary on primary (buttons)', c.onPrimary, c.primary, 4.5]);
  pairs.push(['onPrimary on primaryDark (pressed)', c.onPrimary, c.primaryDark, 4.5]);
  pairs.push(['primaryDark on primarySoft (secondary btn)', c.primaryDark, c.primarySoft, 4.5]);
  pairs.push(['onAccent on accent', c.onAccent, c.accent, 4.5]);
  pairs.push(['textInverse on danger (danger btn)', c.textInverse, c.danger, 4.5]);
  for (const [status, { fg, bg }] of Object.entries(c.status)) pairs.push([`status ${status} pill`, fg, bg, 4.5]);
  for (const tone of ['primary', 'accent', 'highlight', 'success', 'warning', 'danger', 'info', 'neutral'] as Tone[]) {
    const t = getToneColors(c, tone);
    pairs.push([`${tone} text on soft`, t.fg, t.bg, 4.5]);
    pairs.push([`${tone} text on surface`, t.fg, c.surface, 4.5]);
  }
  pairs.push(['danger text on dangerSoft', c.danger, c.dangerSoft, 4.5]);
  console.log(`\n== ${mode}`);
  for (const [label, fg, bg, min] of pairs) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) fails += 1;
    if (!ok || process.argv.includes('--all')) console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}  (need ${min})  ${label}  ${fg} on ${bg}`);
  }
};
audit('light', lightColors);
audit('dark', darkColors);
console.log(`\n${fails} failing pairs`);
if (fails > 0) process.exitCode = 1;
