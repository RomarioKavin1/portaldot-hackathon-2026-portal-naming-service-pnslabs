import { describe, expect, it } from "vitest";
import { normalize, tryNormalize, NormalizeError } from "../src/normalize.js";
import vectors from "./vectors/namehash.json" with { type: "json" };

describe("normalize", () => {
  for (const c of vectors.normalize) {
    if (c.expected === null) {
      it(`rejects: ${c.name}`, () => {
        expect(() => normalize(c.input)).toThrowError(NormalizeError);
        expect(tryNormalize(c.input)).toBeNull();
      });
    } else {
      it(`accepts: ${c.name}`, () => {
        expect(normalize(c.input)).toBe(c.expected);
        expect(tryNormalize(c.input)).toBe(c.expected);
      });
    }
  }

  it("idempotent: normalize(normalize(x)) === normalize(x)", () => {
    for (const c of vectors.normalize) {
      if (c.expected !== null) {
        const once = normalize(c.input);
        const twice = normalize(once);
        expect(twice).toBe(once);
      }
    }
  });
});
