/**
 * Pragmatic v1 normalize() for `.pot` names.
 *
 * The PNS design spec calls for "ENSIP-15-style" normalization. Real
 * ENSIP-15 is a massive Unicode data spec (tens of thousands of cases);
 * shipping its full table is out of scope for v1. This implementation
 * enforces the high-impact subset that catches the realistic spoofing
 * attacks, namely:
 *
 *   1. Empty input / leading dot / trailing dot / empty label → reject.
 *   2. NFC composition + case-fold to lowercase.
 *   3. Reject ASCII control characters (U+0000..U+001F, U+007F).
 *   4. Reject zero-width characters (ZWSP, ZWNJ, ZWJ, BOM, joiners).
 *   5. Reject mixed-script labels (Latin mixed with Cyrillic / Greek /
 *      Armenian etc. in the same label is the classic homograph attack).
 *
 * The SDK refuses non-normalized labels at every boundary (resolve,
 * register, commit) so integrators cannot opt out — see spec §8.
 */

const ZERO_WIDTH = new Set<number>([
  0x200b, // ZERO WIDTH SPACE
  0x200c, // ZERO WIDTH NON-JOINER
  0x200d, // ZERO WIDTH JOINER
  0x2060, // WORD JOINER
  0xfeff, // ZERO WIDTH NO-BREAK SPACE / BOM
]);

type Script = "Latin" | "Cyrillic" | "Greek" | "Armenian" | "Hebrew" | "Arabic" | "Common" | "Digit" | "Other";

function scriptOf(cp: number): Script {
  // Common: ASCII letters/digits/hyphen, plus the script-neutral chars we allow.
  if (cp >= 0x30 && cp <= 0x39) return "Digit"; // 0-9
  if ((cp >= 0x61 && cp <= 0x7a) || cp === 0x2d) return "Latin"; // a-z, hyphen
  if (cp >= 0x00c0 && cp <= 0x024f) return "Latin"; // Latin-1 supplement + Latin Ext A/B
  if (cp >= 0x0370 && cp <= 0x03ff) return "Greek";
  if (cp >= 0x0400 && cp <= 0x04ff) return "Cyrillic";
  if (cp >= 0x0530 && cp <= 0x058f) return "Armenian";
  if (cp >= 0x0590 && cp <= 0x05ff) return "Hebrew";
  if (cp >= 0x0600 && cp <= 0x06ff) return "Arabic";
  return "Other";
}

export class NormalizeError extends Error {
  constructor(public reason: string, public input: string) {
    super(`normalize(${JSON.stringify(input)}): ${reason}`);
    this.name = "NormalizeError";
  }
}

function checkLabel(label: string, input: string): void {
  if (label.length === 0) {
    throw new NormalizeError("empty label (leading/trailing/double dot)", input);
  }
  const scripts = new Set<Script>();
  for (const ch of label) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x20 || cp === 0x7f) {
      throw new NormalizeError(`ascii control U+${cp.toString(16).padStart(4, "0")}`, input);
    }
    if (ZERO_WIDTH.has(cp)) {
      throw new NormalizeError(`zero-width U+${cp.toString(16).padStart(4, "0")}`, input);
    }
    if (cp === 0x2e) {
      // A '.' inside a label after split() is impossible; guard anyway.
      throw new NormalizeError("unexpected dot inside label", input);
    }
    const s = scriptOf(cp);
    if (s === "Other") {
      throw new NormalizeError(
        `disallowed codepoint U+${cp.toString(16).padStart(4, "0")}`, input,
      );
    }
    if (s !== "Common" && s !== "Digit") scripts.add(s);
  }
  if (scripts.size > 1) {
    throw new NormalizeError(`mixed script in label: ${[...scripts].join("+")}`, input);
  }
}

/**
 * Returns the normalized form of `name` or throws NormalizeError.
 *
 * @example
 *   normalize("Alice.POT")     === "alice.pot"
 *   normalize("café")          === "café"   // NFC composed
 *   normalize(".bad")          // throws (leading dot)
 *   normalize("ali‍ce")   // throws (zero-width joiner)
 *   normalize("аlice")    // throws (cyrillic 'a' + latin)
 */
export function normalize(name: string): string {
  if (name === "") {
    throw new NormalizeError("empty input", name);
  }
  // NFC + lowercase. .normalize("NFC") composes decomposed sequences
  // (e.g. e + combining acute -> precomposed é). Lowercase folds case.
  const folded = name.normalize("NFC").toLowerCase();
  // Validate label structure BEFORE returning the folded form.
  const labels = folded.split(".");
  for (const label of labels) checkLabel(label, name);
  return folded;
}

/**
 * Non-throwing variant. Returns the normalized form or `null` if the
 * input would be rejected.
 */
export function tryNormalize(name: string): string | null {
  try {
    return normalize(name);
  } catch (e) {
    if (e instanceof NormalizeError) return null;
    throw e;
  }
}
