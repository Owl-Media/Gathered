import { describe, expect, it } from "vitest";
import {
  eventHasPayment,
  formatMoney,
  parseMoney,
  paymentSummary,
  toAmountInputValue,
} from "./money";

describe("parseMoney", () => {
  it("parses whole amounts", () => {
    expect(parseMoney("40")).toEqual({ ok: true, minorUnits: 4000 });
    expect(parseMoney("0")).toEqual({ ok: true, minorUnits: 0 });
  });

  it("parses decimal amounts without floating point drift", () => {
    expect(parseMoney("40.50")).toEqual({ ok: true, minorUnits: 4050 });
    expect(parseMoney("40.5")).toEqual({ ok: true, minorUnits: 4050 });
    expect(parseMoney("0.01")).toEqual({ ok: true, minorUnits: 1 });
    // The classic float trap: 19.99 * 100 is 1998.9999... in binary floating point.
    expect(parseMoney("19.99")).toEqual({ ok: true, minorUnits: 1999 });
    expect(parseMoney("0.29")).toEqual({ ok: true, minorUnits: 29 });
  });

  it("tolerates currency symbols, spaces and thousands separators", () => {
    expect(parseMoney("£40.50")).toEqual({ ok: true, minorUnits: 4050 });
    expect(parseMoney(" 1,250 ")).toEqual({ ok: true, minorUnits: 125000 });
  });

  it("treats blank as no amount rather than zero", () => {
    expect(parseMoney("")).toEqual({ ok: true, minorUnits: undefined });
    expect(parseMoney("   ")).toEqual({ ok: true, minorUnits: undefined });
  });

  it("rejects negatives", () => {
    const result = parseMoney("-10");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/zero or more/i);
  });

  it("rejects more than two decimal places instead of rounding a typo", () => {
    const result = parseMoney("40.505");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/two decimal places/i);
  });

  it("rejects nonsense", () => {
    expect(parseMoney("forty").ok).toBe(false);
    expect(parseMoney("4o").ok).toBe(false);
    expect(parseMoney("40.").ok).toBe(false);
  });

  it("rejects implausibly large amounts", () => {
    expect(parseMoney("99999999").ok).toBe(false);
  });
});

describe("formatMoney", () => {
  it("drops decimals for whole amounts", () => {
    expect(formatMoney(4000, "GBP")).toBe("£40");
  });

  it("keeps decimals when there are pence", () => {
    expect(formatMoney(4050, "GBP")).toBe("£40.50");
    expect(formatMoney(1999, "GBP")).toBe("£19.99");
  });

  it("handles zero", () => {
    expect(formatMoney(0, "GBP")).toBe("£0");
  });
});

describe("toAmountInputValue", () => {
  it("round-trips through parseMoney", () => {
    for (const minor of [0, 1, 100, 4050, 125000]) {
      const value = toAmountInputValue(minor);
      expect(parseMoney(value).minorUnits).toBe(minor);
    }
  });

  it("renders null as blank", () => {
    expect(toAmountInputValue(null)).toBe("");
  });
});

describe("paymentSummary", () => {
  it("treats the total as inclusive of the deposit", () => {
    // £40 total with a £10 deposit leaves £30 to pay.
    expect(paymentSummary(4000, 1000)).toEqual({
      total: 4000,
      deposit: 1000,
      balance: 3000,
    });
  });

  it("reports no balance when either amount is unset", () => {
    expect(paymentSummary(4000, null).balance).toBeNull();
    expect(paymentSummary(null, 1000).balance).toBeNull();
  });

  it("never reports a negative balance", () => {
    // A deposit larger than the total is a data-entry mistake, not a refund.
    expect(paymentSummary(1000, 4000).balance).toBe(0);
  });

  it("reports a zero balance when the deposit covers the total", () => {
    expect(paymentSummary(4000, 4000).balance).toBe(0);
  });
});

describe("eventHasPayment", () => {
  it("is false only when neither amount is set", () => {
    expect(eventHasPayment(null, null)).toBe(false);
    expect(eventHasPayment(4000, null)).toBe(true);
    expect(eventHasPayment(null, 1000)).toBe(true);
    expect(eventHasPayment(0, null)).toBe(true);
  });
});
