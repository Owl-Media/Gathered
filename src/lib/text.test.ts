import { describe, expect, it } from "vitest";
import {
  fullName,
  normaliseEmail,
  normaliseMultiLine,
  normaliseSingleLine,
  stripControlCharacters,
} from "./text";
import { slugifyEventName } from "./slug";

describe("stripControlCharacters", () => {
  it("removes invisible control characters", () => {
    const withControls = `Hello${String.fromCharCode(0)}${String.fromCharCode(7)}world`;
    expect(stripControlCharacters(withControls)).toBe("Helloworld");
  });

  it("removes C1 controls, including the DEL range", () => {
    const withC1 = `a${String.fromCharCode(0x7f)}b${String.fromCharCode(0x9f)}c`;
    expect(stripControlCharacters(withC1)).toBe("abc");
  });

  it("keeps tab, newline and carriage return", () => {
    expect(stripControlCharacters("a\tb\nc\rd")).toBe("a\tb\nc\rd");
  });

  it("leaves ordinary and non-Latin text untouched", () => {
    expect(stripControlCharacters("Renée 🎉 こんにちは")).toBe("Renée 🎉 こんにちは");
  });
});

describe("normaliseSingleLine", () => {
  it("collapses whitespace and trims", () => {
    expect(normaliseSingleLine("  Amelia's   Baby \n Shower  ")).toBe("Amelia's Baby Shower");
  });
});

describe("normaliseMultiLine", () => {
  it("preserves intentional line breaks", () => {
    expect(normaliseMultiLine("12 Rose Lane\nBath\nBA1 2AB")).toBe("12 Rose Lane\nBath\nBA1 2AB");
  });

  it("normalises CRLF and trims trailing spaces per line", () => {
    expect(normaliseMultiLine("one   \r\ntwo  ")).toBe("one\ntwo");
  });

  it("collapses runs of blank lines", () => {
    expect(normaliseMultiLine("one\n\n\n\n\ntwo")).toBe("one\n\ntwo");
  });
});

describe("normaliseEmail", () => {
  it("lowercases and trims", () => {
    expect(normaliseEmail("  Ada.Lovelace@Example.COM ")).toBe("ada.lovelace@example.com");
  });

  it("does not strip dots or plus-tags, which are significant to many providers", () => {
    expect(normaliseEmail("ada.lovelace+shower@example.com")).toBe(
      "ada.lovelace+shower@example.com",
    );
  });
});

describe("fullName", () => {
  it("joins the parts", () => {
    expect(fullName("Ada", "Lovelace")).toBe("Ada Lovelace");
  });
});

describe("slugifyEventName", () => {
  it("produces a readable slug", () => {
    expect(slugifyEventName("Amelia's Baby Shower!")).toBe("amelias-baby-shower");
  });

  it("folds accents to their base letters rather than dropping them", () => {
    expect(slugifyEventName("Renée's Fête")).toBe("renees-fete");
  });

  it("falls back when nothing readable remains", () => {
    expect(slugifyEventName("🎉🎈")).toBe("event");
    expect(slugifyEventName("   ")).toBe("event");
  });

  it("does not leave leading or trailing hyphens", () => {
    const slug = slugifyEventName("!!! Party !!!");
    expect(slug).toBe("party");
  });

  it("caps the readable portion", () => {
    expect(slugifyEventName("a".repeat(200)).length).toBeLessThanOrEqual(60);
  });
});
