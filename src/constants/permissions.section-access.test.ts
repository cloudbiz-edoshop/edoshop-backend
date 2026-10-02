import { describe, expect, it } from "vitest";

import { EntityType, OperationType } from "@/constants";
import {
  buildSectionAccess,
  formatPermissionKey,
} from "@/constants/permissions.constants";

describe("buildSectionAccess", () => {
  it("opens Page Content when the role has filters read only", () => {
    const sections = buildSectionAccess([
      formatPermissionKey(EntityType.FILTERS, OperationType.READ),
    ]);

    expect(sections.cms).toBe(true);
    expect(sections.store).toBe(false);
  });

  it("opens Store when the role has products create without stores read", () => {
    const sections = buildSectionAccess([
      formatPermissionKey(EntityType.PRODUCTS, OperationType.CREATE),
      formatPermissionKey(EntityType.CATEGORIES, OperationType.READ),
    ]);

    expect(sections.store).toBe(true);
  });

  it("opens Ticketing when only per-page ticket grants exist", () => {
    const sections = buildSectionAccess([
      formatPermissionKey(EntityType.TICKET_PAGE_CREATE, OperationType.READ),
      formatPermissionKey(
        EntityType.TICKET_PAGE_REQUESTS_TO_APPROVE,
        OperationType.READ,
      ),
    ]);

    expect(sections.ticketing).toBe(true);
  });

  it("opens Warehouse 2 when the role has entries read without warehouse_2 read", () => {
    const sections = buildSectionAccess([
      formatPermissionKey(EntityType.ENTRIES, OperationType.READ),
    ]);

    expect(sections.ewms_w2).toBe(true);
    expect(sections.ewms_w1).toBe(true);
  });

  it("opens Delivery when the role has shipping_labels read only", () => {
    const sections = buildSectionAccess([
      formatPermissionKey(EntityType.SHIPPING_LABELS, OperationType.READ),
    ]);

    expect(sections.delivery).toBe(true);
  });

  it("keeps Ticket Management closed without ticket_page_management read", () => {
    const permissions = [
      formatPermissionKey(EntityType.TICKET_PAGE_CREATE, OperationType.READ),
      formatPermissionKey(EntityType.TICKETING, OperationType.READ),
      formatPermissionKey(EntityType.TICKETING, OperationType.CREATE),
    ];

    const sections = buildSectionAccess(permissions);

    expect(sections.ticketing).toBe(true);
    expect(permissions).not.toContain(
      formatPermissionKey(EntityType.TICKET_PAGE_MANAGEMENT, OperationType.READ),
    );
  });
});
