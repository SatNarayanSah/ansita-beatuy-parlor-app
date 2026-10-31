// Nepal uses lakh/crore digit grouping, the same as en-IN.
const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const CURRENCY_SYMBOL = 'Rs.';

/** 2500 -> "Rs. 2,500" (Nepalese rupees) */
export const formatCurrency = (amount: number): string =>
  `${amount < 0 ? '-' : ''}${CURRENCY_SYMBOL} ${numberFormatter.format(Math.abs(amount))}`;

/** 125000 -> "1,25,000" */
export const formatNumber = (value: number): string => numberFormatter.format(value);

/** 90 -> "1h 30m", 45 -> "45m", 120 -> "2h" */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/** "Priya Sharma" -> "PS" */
export const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export const capitalize = (value: string): string =>
  value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);

/** "no_show" -> "No Show", "senior_stylist" -> "Senior Stylist" */
export const formatEnumLabel = (value: string): string =>
  value.split('_').filter(Boolean).map(capitalize).join(' ');

/** pluralize(1, 'visit') -> "1 visit", pluralize(3, 'visit') -> "3 visits" */
export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;
/** Rounds to one decimal, e.g. 4.666 -> 4.7 */
export const roundRating = (value: number): number => Math.round(value * 10) / 10;

/** Percentage 0-100, safe for a zero total. */
export const toPercent = (part: number, total: number): number =>
  total <= 0 ? 0 : Math.round((part / total) * 100);
