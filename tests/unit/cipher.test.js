import { describe, expect, it } from "vitest";
import { decodeCaesar, encodeBinary, encodeCaesar } from "../../src/utils/cipher.js";

describe("Turing tape ciphers", () => {
  it("encodes uppercase text as space-separated binary bytes", () => {
    expect(encodeBinary("VOL")).toBe("01010110 01001111 01001100");
  });

  it("round-trips a Caesar shift while preserving spaces", () => {
    const encoded = encodeCaesar("TREND UP");
    expect(encoded).toBe("WUHQG XS");
    expect(decodeCaesar(encoded)).toBe("TREND UP");
  });
});
