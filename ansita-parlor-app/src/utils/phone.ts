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
  { code: 'NP', name: 'Nepal', dialCode: '977', flag: '\u{1F1F3}\u{1F1F5}', pattern: /^9[678]\d{8}$/, example: '9812345678' },
  { code: 'IN', name: 'India', dialCode: '91', flag: '\u{1F1EE}\u{1F1F3}', pattern: /^[6-9]\d{9}$/, example: '9876543210' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '971', flag: '\u{1F1E6}\u{1F1EA}', pattern: /^5\d{8}$/, example: '501234567' },
  { code: 'GB', name: 'United Kingdom', dialCode: '44', flag: '\u{1F1EC}\u{1F1E7}', pattern: /^7\d{9}$/, example: '7400123456' },
  { code: 'US', name: 'United States', dialCode: '1', flag: '\u{1F1FA}\u{1F1F8}', pattern: /^[2-9]\d{9}$/, example: '2015550123' },
  { code: 'AU', name: 'Australia', dialCode: '61', flag: '\u{1F1E6}\u{1F1FA}', pattern: /^4\d{8}$/, example: '412345678' },
];

export const DEFAULT_COUNTRY: CountryCode = 'NP';

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

export const isValidPhone = (input: string): boolean => {
  const parsed = parsePhone(normalizePhone(input));
  return parsed !== null && parsed.country.pattern.test(parsed.national);
};

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
