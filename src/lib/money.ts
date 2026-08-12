/**
 * Money handling for event deposits and balances.
 *
 * Amounts are held as integer minor units (pence for GBP) everywhere: in the
 * database, in these helpers and in form values. Floating point is never used
 * for money, because 0.1 + 0.2 !== 0.3 and a rounding drift in someone's
 * balance is the kind of bug nobody forgives.
 */

/** Largest amount accepted, guarding against a mistyped extra zero. */
export const MAX_AMOUNT_MINOR_UNITS = 1_000_000_00; // £1,000,000.00

export interface ParsedMoney {
  ok: boolean;
  minorUnits?: number;
  error?: string;
}

/**
 * Parses organiser input into minor units.
 *
 * Accepts "40", "40.5", "40.50", "£40.50", "1,250" and blank. Rejects
 * negatives, more than two decimal places, and anything that is not a number,
 * rather than silently rounding a typo into a real charge.
 */
export function parseMoney(input: string): ParsedMoney {
  const cleaned = input.trim().replace(/[£$€\s,]/g, "");

  if (cleaned === "") return { ok: true, minorUnits: undefined };

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    if (/^-/.test(cleaned)) return { ok: false, error: "Enter an amount of zero or more." };
    if (/^\d+\.\d{3,}$/.test(cleaned)) {
      return { ok: false, error: "Enter an amount with at most two decimal places." };
    }
    return { ok: false, error: "Enter a valid amount, for example 40 or 40.50." };
  }

  const [wholePart, fractionPart = ""] = cleaned.split(".");
  const minorUnits =
    Number(wholePart) * 100 + Number(fractionPart.padEnd(2, "0").slice(0, 2));

  if (minorUnits > MAX_AMOUNT_MINOR_UNITS) {
    return { ok: false, error: "That amount looks too large. Please check it." };
  }

  return { ok: true, minorUnits };
}

/** "£40.50". Whole amounts drop the decimals, so £40 does not read as £40.00. */
export function formatMoney(minorUnits: number, currency: string): string {
  const hasFraction = minorUnits % 100 !== 0;

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

/**
 * The symbol for a currency code, e.g. "£" for GBP. Derived from Intl rather
 * than a hardcoded table, so changing DEFAULT_CURRENCY needs no code change.
 */
export function currencySymbolFor(currency: string): string {
  const parts = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).formatToParts(0);

  return parts.find((part) => part.type === "currency")?.value ?? currency;
}

/** Plain "40.50" for repopulating a number input. */
export function toAmountInputValue(minorUnits: number | null): string {
  if (minorUnits === null) return "";
  return minorUnits % 100 === 0
    ? String(minorUnits / 100)
    : (minorUnits / 100).toFixed(2);
}

export interface PaymentSummary {
  /** Total cost of attending, inclusive of the deposit. */
  total: number | null;
  deposit: number | null;
  /** What remains after the deposit. Null when either amount is unset. */
  balance: number | null;
}

/**
 * Works out the balance remaining after the deposit.
 *
 * The full amount is inclusive of the deposit, so the balance is the
 * difference. A deposit alone, with no total, means the balance is unknown
 * rather than zero.
 */
export function paymentSummary(
  total: number | null,
  deposit: number | null,
): PaymentSummary {
  const balance =
    total !== null && deposit !== null ? Math.max(0, total - deposit) : null;
  return { total, deposit, balance };
}

/** True when this event asks guests for money at all. */
export function eventHasPayment(total: number | null, deposit: number | null): boolean {
  return total !== null || deposit !== null;
}
