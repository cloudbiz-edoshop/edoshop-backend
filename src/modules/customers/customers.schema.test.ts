import { describe, expect, it } from "vitest";

import { publicCustomerSignupRequestSchema } from "@/modules/customers/customers.schema";

describe("publicCustomerSignupRequestSchema", () => {
  const base = {
    phoneNumber: "+237675500863",
    countryCode: "CM",
    address: "Douala Bonamoussadi",
    password: "2OXu1CYqgxQbsqiz",
  };

  it("accepts everyday names without format rules", () => {
    const result = publicCustomerSignupRequestSchema.safeParse({
      ...base,
      fullName: "N'guemo Jean-Paul 2",
    });
    expect(result.success).toBe(true);
  });

  it("normalizes phone numbers before length check", () => {
    const result = publicCustomerSignupRequestSchema.safeParse({
      ...base,
      fullName: "Jean Paul",
      phoneNumber: "237 675 500 863",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phoneNumber).toBe("+237675500863");
    }
  });

  it("rejects invalid phone format with a clear message", () => {
    const result = publicCustomerSignupRequestSchema.safeParse({
      ...base,
      fullName: "Jean Paul",
      phoneNumber: "+237",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/whatsapp/i);
    }
  });
});
