/**
 * Nepali mobile numbers: only NTC and Ncell run mobile networks.
 * Same list as the server (`NEPAL_OPERATOR_PREFIXES` in backend/app/utils.py), which
 * has the final say; this gives instant feedback while typing.
 */
export const NEPAL_OPERATOR_PREFIXES = {
  NTC: ["984", "985", "986", "974", "975", "976"],
  Ncell: ["980", "981", "982", "970", "971"],
} as const;

export type NepalOperator = keyof typeof NEPAL_OPERATOR_PREFIXES;

/** Digits of a Nepali number without +977 / 977 / leading 0, or null if it is from another country. */
function nepalNational(input: string): string | null {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    if (!digits.startsWith("977")) return null;
    digits = digits.slice(3);
  } else if (digits.startsWith("977") && digits.length === 13) {
    digits = digits.slice(3);
  }
  return digits.replace(/^0+/, "");
}

/** "NTC" / "Ncell" once the first three digits are typed, else null. */
export function nepalOperator(input: string): NepalOperator | null {
  const national = nepalNational(input);
  if (!national || national.length < 3) return null;
  const prefix = national.slice(0, 3);
  for (const [name, prefixes] of Object.entries(NEPAL_OPERATOR_PREFIXES) as [NepalOperator, readonly string[]][]) {
    if (prefixes.includes(prefix)) return name;
  }
  return null;
}

/** Why the number can't be used as a mobile, or "" when it can. Foreign (+...) numbers are left to the server. */
export function mobileNumberError(input: string): string {
  if (!input.trim()) return "Enter a mobile number.";
  const national = nepalNational(input);
  if (national === null) return "";
  if (!/^\d{10}$/.test(national)) return "A Nepali mobile number has 10 digits, e.g. 9812345678.";
  if (!nepalOperator(national)) return "Enter an NTC (984, 985, 986, 974–976) or Ncell (980–982, 970, 971) number.";
  return "";
}

/** Hint under a phone field: the network once known, or what's wrong once it's long enough to judge. */
export function phoneHint(input: string): { text: string; error: boolean } | null {
  const national = nepalNational(input);
  if (national === null || national.length < 3) return null; // foreign number, or too short to tell
  const operator = nepalOperator(national);
  if (!operator || national.length >= 10) {
    const error = mobileNumberError(national);
    if (error) return { text: error, error: true };
  }
  return operator ? { text: `${operator} number`, error: false } : null;
}
