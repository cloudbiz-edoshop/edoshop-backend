import type {
  AssignOrdersToBundleRequest,
  CreateTrackingBundleRequest,
  UpdateBundleStepRequest,
  UpdateTrackingBundleRequest,
  CreateKiloBillRequest,
} from "./tracking-bundles.schema";

import { NotificationTypeIds } from "@/constants/notification-types.constants";
import { notificationDeliveryService } from "../notifications/notification-delivery.service";
import { TrackingBundlesRepository } from "./tracking-bundles.repository";

export class TrackingBundlesService {
  private repository = new TrackingBundlesRepository();

  listSteps() {
    return this.repository.listSteps();
  }

  async list(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
  }) {
    const result = await this.repository.list(params);

    return {
      data: result.data.map((bundle) => this.mapBundle(bundle)),
      total: result.total,
      searchableFields: result.searchableFields,
    };
  }

  async listTrackedOrders(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: Record<string, unknown>;
  }) {
    return this.repository.listTrackedOrders(params);
  }

  async getOne(id: number) {
    const bundle = await this.repository.findById(id);
    if (!bundle) return null;

    const orders = await this.repository.getBundleOrders(id);

    return {
      ...this.mapBundle(bundle),
      currentStep: bundle.currentStep
        ? {
            id: bundle.currentStep.id,
            stepOrder: bundle.currentStep.stepOrder,
            code: bundle.currentStep.code,
            label: bundle.currentStep.label,
            leg: bundle.currentStep.leg,
            description: bundle.currentStep.description,
          }
        : undefined,
      orders,
      history: (bundle.history ?? []).map((entry) => ({
        id: entry.id,
        stepId: entry.stepId,
        stepOrder: entry.step?.stepOrder ?? 0,
        stepLabel: entry.step?.label ?? "",
        notes: entry.notes,
        attachmentUrl: entry.attachmentUrl,
        createdAt: entry.createdAt,
        updatedByName: entry.createdByUser?.fullName ?? null,
      })).sort((left, right) => left.stepOrder - right.stepOrder),
    };
  }

  async create(payload: CreateTrackingBundleRequest, userId: number) {
    const created = await this.repository.create(payload, userId);
    if (!created) return null;
    return this.getOne(created.id);
  }

  async update(id: number, payload: UpdateTrackingBundleRequest, userId: number) {
    await this.repository.update(id, payload, userId);
    return this.getOne(id);
  }

  async searchOrder(orderCode: string) {
    const result = await this.repository.searchOrder(orderCode);
    if (!result) return null;

    const { order, existingAssignment } = result;

    return {
      orderCode: order.orderCode,
      orderId: order.id,
      customerId: order.customerId,
      totalAmount: String(order.totalAmount),
      status: order.orderStatus?.name ?? "pending",
      orderType: order.orderType?.name,
      alreadyAssigned: Boolean(existingAssignment),
      assignedBundleCode: existingAssignment?.bundle?.bundleCode ?? null,
    };
  }

  assignOrders(
    bundleId: number,
    payload: AssignOrdersToBundleRequest,
    userId: number,
  ) {
    return this.repository.assignOrders(bundleId, payload, userId);
  }

  removeOrder(bundleId: number, orderId: number) {
    return this.repository.removeOrder(bundleId, orderId);
  }

  async updateStep(bundleId: number, payload: UpdateBundleStepRequest, userId: number) {
    const bundle = await this.repository.updateStep(bundleId, payload, userId);
    if (bundle?.currentStep?.code === "order_at_the_store") {
      await this.notifyOrderAtStore(bundle.id, bundle.bundleCode);
    }
    return this.getOne(bundle.id);
  }

  async undoLastStep(bundleId: number, userId: number) {
    const bundle = await this.repository.undoLastStep(bundleId, userId);
    return this.getOne(bundle.id);
  }

  findBundleByOrderId(orderId: number) {
    return this.repository.findBundleByOrderId(orderId);
  }

  async createKiloBill(bundleId: number, payload: CreateKiloBillRequest, userId: number) {
    const bill = await this.repository.createKiloBill(bundleId, payload, userId);
    await this.notifyKiloBillReady(payload.orderId, bill.amount);
    return bill;
  }

  private mapBundle(bundle: {
    id: number;
    trackingBundleId?: number | null;
    sourceBundleId?: number | null;
    sourceEntryId?: number | null;
    bundleCode: string;
    name: string;
    description?: string | null;
    supplierId?: number | null;
    supplierName?: string | null;
    supplierCode?: string | null;
    storeType: string;
    status: string;
    currentStepId: number;
    currentStepLabel?: string | null;
    createdAt: string;
    updatedAt?: string | null;
    currentStep?: { label: string } | null;
    sourceBundle?: {
      id: number;
      entryId?: number;
      entry?: {
        id?: number;
        supplier?: {
          id: number;
          storeName: string;
          supplierCode: string;
        } | null;
      } | null;
    } | null;
    orderCount?: number;
  }) {
    const supplier = bundle.sourceBundle?.entry?.supplier;
    const sourceEntryId =
      bundle.sourceEntryId
      ?? bundle.sourceBundle?.entry?.id
      ?? bundle.sourceBundle?.entryId
      ?? null;

    return {
      id: bundle.id,
      trackingBundleId: bundle.trackingBundleId ?? bundle.id,
      sourceBundleId: bundle.sourceBundleId ?? bundle.sourceBundle?.id ?? null,
      sourceEntryId,
      bundleCode: bundle.bundleCode,
      name: bundle.name,
      description: bundle.description,
      supplierId: bundle.supplierId ?? supplier?.id ?? null,
      supplierName: bundle.supplierName ?? supplier?.storeName ?? null,
      supplierCode: bundle.supplierCode ?? supplier?.supplierCode ?? null,
      storeType: bundle.storeType,
      status: bundle.status,
      currentStepId: bundle.currentStepId,
      currentStepLabel: bundle.currentStepLabel ?? bundle.currentStep?.label,
      orderCount: bundle.orderCount ?? 0,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };
  }

  private async notifyOrderAtStore(bundleId: number, bundleCode: string) {
    const recipients = await this.repository.getCustomerUsersForBundle(bundleId);
    await Promise.all(
      recipients.map((recipient) =>
        notificationDeliveryService.deliverToUser({
          userId: recipient.userId,
          title: "Your order items are at the store",
          message: `Your item(s) in bundle ${bundleCode} for order(s) ${recipient.orderCodes.join(", ")} have arrived at the Edoshop store. Our team is preparing your kilo/shipping bill.`,
          notificationTypeId: NotificationTypeIds.ORDERS_ARRIVED_AT_EDOSHOP_STORE,
        }),
      ),
    );
  }

  private async notifyKiloBillReady(orderId: number, amount: string) {
    const recipients = await this.repository.getCustomerUsersForOrder(orderId);
    await Promise.all(
      recipients.map((recipient) =>
        notificationDeliveryService.deliverToUser({
          userId: recipient.userId,
          title: "Payment of kilo required",
          message: `Your kilo/shipping bill for order ${recipient.orderCode} is ready. Amount due: ${amount}.`,
          notificationTypeId: NotificationTypeIds.PAY_YOUR_CUSTOM_AND_SHIPPING_FEES,
        }),
      ),
    );
  }
}
