import type {
  AssignOrdersToBundleRequest,
  CreateTrackingBundleRequest,
  UpdateBundleStepRequest,
  UpdateTrackingBundleRequest,
} from "./tracking-bundles.schema";

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
        stepLabel: entry.step?.label ?? "",
        notes: entry.notes,
        attachmentUrl: entry.attachmentUrl,
        createdAt: entry.createdAt,
        updatedByName: entry.createdByUser?.fullName ?? null,
      })),
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
    await this.repository.updateStep(bundleId, payload, userId);
    return this.getOne(bundleId);
  }

  findBundleByOrderId(orderId: number) {
    return this.repository.findBundleByOrderId(orderId);
  }

  private mapBundle(bundle: {
    id: number;
    bundleCode: string;
    name: string;
    description?: string | null;
    storeType: string;
    status: string;
    currentStepId: number;
    createdAt: string;
    updatedAt?: string | null;
    currentStep?: { label: string } | null;
    orderCount?: number;
  }) {
    return {
      id: bundle.id,
      bundleCode: bundle.bundleCode,
      name: bundle.name,
      description: bundle.description,
      storeType: bundle.storeType,
      status: bundle.status,
      currentStepId: bundle.currentStepId,
      currentStepLabel: bundle.currentStep?.label,
      orderCount: bundle.orderCount ?? 0,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };
  }
}
