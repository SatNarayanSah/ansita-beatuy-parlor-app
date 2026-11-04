/**
 * Phone numbers are stored in E.164 format, e.g. "+9779812345678".
 * Nepal (+977) is the default country.
 */

export type CountryCode = 'NP' | 'IN' | 'AE' | 'GB' | 'US' | 'AU';

export interface PhoneCountry {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
  /** Validates the national number (digits after the dial code). */
  pattern: RegExp;
  /** Sample national number, used as input placeholder. */
  example: string;
}

export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { code: 'NP', name: 'Nepal', dialCode: '977', flag: '\u{1F1F3}\u{1F1F5}', pattern: /^9(?:8[0-2]|8[4-6]|7[0-1]|7[4-6])\d{7}$/, example: '9812345678' }, // NTC or Ncell
  { code: 'IN', name: 'India', dialCode: '91', flag: '\u{1F1EE}\u{1F1F3}', pattern: /^[6-9]\d{9}$/, example: '9876543210' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '971', flag: '\u{1F1E6}\u{1F1EA}', pattern: /^5\d{8}$/, example: '501234567' },
  { code: 'GB', name: 'United Kingdom', dialCode: '44', flag: '\u{1F1EC}\u{1F1E7}', pattern: /^7\d{9}$/, example: '7400123456' },
  { code: 'US', name: 'United States', dialCode: '1', flag: '\u{1F1FA}\u{1F1F8}', pattern: /^[2-9]\d{9}$/, example: '2015550123' },
  { code: 'AU', name: 'Australia', dialCode: '61', flag: '\u{1F1E6}\u{1F1FA}', pattern: /^4\d{8}$/, example: '412345678' },
];

export const DEFAULT_COUNTRY: CountryCode = 'NP';

export type NepalOperator = 'NTC' | 'Ncell';

/**
 * First three digits of a 10-digit Nepali mobile number. Only NTC and Ncell run mobile
 * networks; Smart Cell (961/962/988) and UTL (972) no longer operate.
 * Same list as the server (`NEPAL_OPERATOR_PREFIXES` in backend/app/utils.py).
 */
export const NEPAL_OPERATOR_PREFIXES: Record<NepalOperator, readonly string[]> = {
  NTC: ['984', '985', '986', '974', '975', '976'],
  Ncell: ['980', '981', '982', '970', '971'],
};

const OPERATOR_BY_PREFIX = new Map<string, NepalOperator>(
  (Object.entries(NEPAL_OPERATOR_PREFIXES) as [NepalOperator, readonly string[]][]).flatMap(([name, prefixes]) =>
    prefixes.map((prefix) => [prefix, name] as const),
  ),
);

/** "NTC" or "Ncell" from a Nepali national number (its first 3 digits), else null. */
export const nepalOperatorOf = (national: string): NepalOperator | null => OPERATOR_BY_PREFIX.get(national.slice(0, 3)) ?? null;

const countryByCode = new Map(PHONE_COUNTRIES.map((country) => [country.code, country]));

/** Longest dial codes first so "+971" is not mistaken for "+97...". */
const COUNTRIES_BY_DIAL_LENGTH = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

export const getPhoneCountry = (code: CountryCode): PhoneCountry => {
  const country = countryByCode.get(code);
  if (!country) throw new Error(`Unknown country code: ${code}`);
  return country;
};

export interface ParsedPhone {
  country: PhoneCountry;
  national: string;
}

/** Splits an E.164 number into its country and national number. */
export const parsePhone = (e164: string): ParsedPhone | null => {
  if (!e164.startsWith('+')) return null;
  const digits = e164.slice(1);
  const country = COUNTRIES_BY_DIAL_LENGTH.find((item) => digits.startsWith(item.dialCode));
  return country ? { country, national: digits.slice(country.dialCode.length) } : null;
};

/**
 * Converts user input to E.164. Accepts "+977 981-2345678", "9779812345678",
 * "09812345678" or "9812345678" (the last two use `defaultCountry`).
 */
export const normalizePhone = (input: string, defaultCountry: CountryCode = DEFAULT_COUNTRY): string => {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (trimmed.startsWith('+')) return `+${digits}`;

  const withDialCode = COUNTRIES_BY_DIAL_LENGTH.find(
    (country) => digits.startsWith(country.dialCode) && country.pattern.test(digits.slice(country.dialCode.length)),
  );
  if (withDialCode) return `+${digits}`;

  return `+${getPhoneCountry(defaultCountry).dialCode}${digits.replace(/^0+/, '')}`;
};

/**
 * Nepal landline: area code without the leading 0 + subscriber number, 8 digits
 * in all (Kathmandu 01-4xxxxxx -> 14xxxxxx, Janakpur 041-5xxxxx -> 415xxxxx).
 */
const NEPAL_LANDLINE = /^[1-8]\d{7}$/;

/** Mobile number (any supported country) or a Nepal landline. For business contact numbers. */
export const isValidContactPhone = (input: string): boolean => {
  const parsed = parsePhone(normalizePhone(input));
  if (!parsed) return false;
  return parsed.country.pattern.test(parsed.national) || (parsed.country.code === 'NP' && NEPAL_LANDLINE.test(parsed.national));
};

/** Why `input` is not an acceptable mobile number, or null when it is. Mirrors the server's messages. */
export const mobileNumberError = (input: string): string | null => {
  const parsed = parsePhone(normalizePhone(input));
  if (!parsed) return 'Enter a valid mobile number';
  const { country, national } = parsed;
  if (country.code === 'NP') {
    if (!/^\d{10}$/.test(national)) return 'A Nepali mobile number has 10 digits, e.g. 9812345678';
    if (!nepalOperatorOf(national)) return 'Enter an NTC (984, 985, 986, 974–976) or Ncell (980–982, 970, 971) number';
    return null;
  }
  return country.pattern.test(national) ? null : 'Enter a valid mobile number';
};

export const isValidPhone = (input: string): boolean => mobileNumberError(input) === null;

/** "+9779812345678" -> "+977 981-2345678", "+919876543210" -> "+91 98765 43210" */
export const formatPhone = (value: string): string => {
  const parsed = parsePhone(value);
  if (!parsed) return value;
  const { country, national } = parsed;
  if (country.code === 'NP' && national.length === 10) {
    return `+977 ${national.slice(0, 3)}-${national.slice(3)}`;
  }
  if (country.code === 'IN' && national.length === 10) {
    return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  }
  return `+${country.dialCode} ${national}`;
};
