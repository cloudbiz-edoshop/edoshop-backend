import type {
  CreateDeliveryPlanRequest,
  DeliveryPlanResponse,
  UpdateDeliveryPlanRequest,
} from "./delivery-plans.schema";
import { ConflictError, NotFoundError } from "@/core/errors";
import { AppError } from "@/core/errors/app-error";
import {
  DIRECT_ORDER_DELIVERY_FEE_XAF,
  DIRECT_ORDER_DELIVERY_OPTIONS,
  DIRECT_ORDER_PICKUP_FEE_XAF,
  FulfillmentMethod,
} from "@/constants/fulfillment.constants";

import db from "@/db";

import { DeliveryPlansRepository } from "./delivery-plans.repository";

export class DeliveryPlansService {
  private readonly deliveryPlansRepository: DeliveryPlansRepository;

  constructor() {
    this.deliveryPlansRepository = new DeliveryPlansRepository();
  }

  mapToPublicOption(plan: {
    id: number;
    code: string;
    label: string;
    leadTime: string;
    description: string;
    fee: number;
  }) {
    return {
      id: plan.id,
      code: plan.code,
      label: plan.label,
      leadTime: plan.leadTime,
      description: plan.description,
      fee: plan.fee,
    };
  }

  async getActiveDeliveryOptions() {
    const plans = await this.deliveryPlansRepository.listActive();

    if (plans.length > 0) {
      return plans.map((plan) => this.mapToPublicOption(plan));
    }

    return DIRECT_ORDER_DELIVERY_OPTIONS.map((option) => ({ ...option }));
  }

  async getDefaultDeliveryFee() {
    const plans = await this.deliveryPlansRepository.listActive();
    return plans[0]?.fee ?? DIRECT_ORDER_DELIVERY_FEE_XAF;
  }

  async getShippingFee(
    fulfillmentMethod: FulfillmentMethod | string,
    shippingPriorityCodeId?: number | null,
  ) {
    if (fulfillmentMethod === FulfillmentMethod.PICKUP) {
      return DIRECT_ORDER_PICKUP_FEE_XAF;
    }

    return this.deliveryPlansRepository.getFeeById(shippingPriorityCodeId);
  }

  async createDeliveryPlan(
    data: CreateDeliveryPlanRequest & { createdBy: number },
  ): Promise<DeliveryPlanResponse> {
    const existing = await this.deliveryPlansRepository.findByCode(data.code);
    if (existing) {
      throw new ConflictError("A delivery plan with this code already exists");
    }

    const plan = await db.transaction(async (tx) =>
      this.deliveryPlansRepository.create(tx, {
        code: data.code,
        label: data.label,
        leadTime: data.leadTime,
        description: data.description,
        fee: data.fee,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      }),
    );

    const planWithRelations = await this.deliveryPlansRepository.findById(plan.id);
    if (!planWithRelations) {
      throw new AppError("Delivery plan could not be fetched after creation");
    }

    return planWithRelations;
  }

  async getDeliveryPlanById(id: number): Promise<DeliveryPlanResponse> {
    const plan = await this.deliveryPlansRepository.findById(id);
    if (!plan) {
      throw new NotFoundError("Delivery plan not found");
    }

    return plan;
  }

  async updateDeliveryPlan(
    id: number,
    data: UpdateDeliveryPlanRequest & { updatedBy: number },
  ): Promise<DeliveryPlanResponse> {
    if (data.code) {
      const existing = await this.deliveryPlansRepository.findByCode(data.code);
      if (existing && existing.id !== id) {
        throw new ConflictError("A delivery plan with this code already exists");
      }
    }

    await db.transaction(async (tx) => {
      const updatedPlan = await this.deliveryPlansRepository.update(tx, id, {
        ...data,
        updatedBy: data.updatedBy,
      });

      if (!updatedPlan) {
        throw new NotFoundError("Delivery plan not found");
      }
    });

    const planWithRelations = await this.deliveryPlansRepository.findById(id);
    if (!planWithRelations) {
      throw new AppError("Delivery plan could not be fetched after update");
    }

    return planWithRelations;
  }

  async deleteDeliveryPlan(id: number): Promise<void> {
    const plan = await this.deliveryPlansRepository.findById(id);
    if (!plan) {
      throw new NotFoundError("Delivery plan not found");
    }

    await db.transaction(async (tx) => {
      await this.deliveryPlansRepository.delete(tx, id);
    });
  }

  async listDeliveryPlans(params: {
    search?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    filters?: string | Record<string, unknown>;
  }) {
    const parsedFilters =
      typeof params.filters === "string"
        ? JSON.parse(params.filters)
        : params.filters;

    return this.deliveryPlansRepository.list({
      ...params,
      filters: parsedFilters,
    });
  }
}

export const deliveryPlansService = new DeliveryPlansService();
