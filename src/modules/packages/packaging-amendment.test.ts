import { describe, expect, it } from "vitest";

import {
  amendmentDeadlineFrom,
  customerAmendmentNotice,
  isAmendmentWindowOpen,
  staffAmendmentNotice,
  staffSilenceNotice,
} from "./packaging-amendment";

describe("packaging amendment window", () => {
  it("gives the customer 24 hours after the video is released", () => {
    const releasedAt = new Date("2026-09-26T12:00:00.000Z");
    expect(amendmentDeadlineFrom(releasedAt).toISOString()).toBe(
      "2026-09-27T12:00:00.000Z",
    );
  });

  it("closes once the deadline has passed", () => {
    const deadline = "2026-09-27T12:00:00.000Z";
    expect(isAmendmentWindowOpen(deadline, new Date("2026-09-27T11:59:00.000Z"))).toBe(true);
    expect(isAmendmentWindowOpen(deadline, new Date("2026-09-27T12:00:01.000Z"))).toBe(false);
  });

  it("tells the customer about the 24 hour amendment window", () => {
    expect(customerAmendmentNotice("PKG_11")).toContain("24 hours");
    expect(staffSilenceNotice("PKG_11")).toContain("mark fulfillment complete yourself");
    expect(staffSilenceNotice("PKG_11")).toContain("shipping label");
    expect(staffAmendmentNotice("PKG_11", "Missing charger")).toContain("Missing charger");
  });
});
