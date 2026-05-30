import { describe, expect, it } from "vitest";

import app from "@/app";
import { parseResponse, testRequest } from "@/test/helpers";

describe("users Module - Authentication", () => {
  describe("pOST /v1/login", () => {
    it("should return 422 for missing credentials", async () => {
      const response = await testRequest(app, "/v1/login", {
        method: "POST",
        body: {},
      });

      // Log response details before assertion
      const data = await parseResponse<{ success: boolean }>(response);
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(data, null, 2));

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });
  });
});
