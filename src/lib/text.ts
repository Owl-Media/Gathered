/**
 * Text normalisation helpers.
 *
 * On XSS (Spec 4.2, 8.x): event descriptions, dietary requirements and guest
 * messages are stored and treated as *plain text*. React escapes interpolated
 * text by default and nothing in this app uses `dangerouslySetInnerHTML`, so
 * markup submitted by a guest or organiser is rendered as literal characters
 * rather than executed. Newlines are preserved with CSS (`whitespace-pre-line`)
 * rather than by converting to `<br>`.
 *
 * What is stripped here are control characters, which are invisible and can be
 * used to disguise content in exports and email.
 */

/**
 * True for C0 and C1 control characters, excluding the three whitespace
 * characters worth keeping: tab (0x09), newline (0x0A) and carriage return
 * (0x0D).
 */
function isControlCodePoint(code: number): boolean {
  return (
    code <= 0x08 ||
    code === 0x0b ||
    code === 0x0c ||
    (code >= 0x0e && code <= 0x1f) ||
    (code >= 0x7f && code <= 0x9f)
  );
}

/**
 * Strips control characters. Written as an explicit code-point scan rather
 * than a regex character class: a class of literal control characters is
 * invisible in source and easily corrupted by editing.
 */
export function stripControlCharacters(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code !== undefined && isControlCodePoint(code)) continue;
    out += char;
  }
  return out;
}

/** Trims and collapses runs of whitespace, for single-line fields. */
export function normaliseSingleLine(value: string): string {
  return stripControlCharacters(value).replace(/\s+/g, " ").trim();
}

/**
 * Cleans a multi-line field: normalises line endings, trims trailing spaces on
 * each line, and collapses runs of 3+ blank lines down to one blank line.
 */
export function normaliseMultiLine(value: string): string {
  return stripControlCharacters(value)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Normalises an email address for storage and matching (Spec 4.5).
 * Lowercases and trims only, the local part is not otherwise rewritten, since
 * stripping dots or plus-tags would be wrong for many mail providers.
 */
export function normaliseEmail(value: string): string {
  return stripControlCharacters(value).trim().toLowerCase();
}

/** "Ada" + "Lovelace" -> "Ada Lovelace" */
export function fullName(forename: string, surname: string): string {
  return `${forename} ${surname}`.trim();
}
