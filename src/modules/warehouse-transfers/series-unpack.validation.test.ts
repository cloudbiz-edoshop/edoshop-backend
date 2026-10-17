import { describe, expect, it } from "vitest";

import {
  assertUnpackQuantity,
  UNPACK_QUANTITY_MAX,
  UNPACK_QUANTITY_MIN,
} from "./series-unpack.validation";

describe("assertUnpackQuantity", () => {
  it("accepts bounds", () => {
    expect(() => assertUnpackQuantity(UNPACK_QUANTITY_MIN)).not.toThrow();
    expect(() => assertUnpackQuantity(UNPACK_QUANTITY_MAX)).not.toThrow();
    expect(() => assertUnpackQuantity(10)).not.toThrow();
  });

  it("rejects invalid values", () => {
    expect(() => assertUnpackQuantity(0)).toThrow(/integer between/);
    expect(() => assertUnpackQuantity(501)).toThrow(/integer between/);
    expect(() => assertUnpackQuantity(1.5)).toThrow(/integer between/);
  });
});
