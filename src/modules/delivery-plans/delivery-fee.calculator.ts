import { and, asc, eq } from "drizzle-orm";

import {
  DIRECT_ORDER_DELIVERY_FEE_XAF,
  EDOSHOP_STORE_COORDINATES,
  FulfillmentMethod,
} from "@/constants/fulfillment.constants";
import db from "@/db";
import { deliveryFeeRules, deliveryPlans } from "@/db/models";
import { haversineDistanceKm } from "@/lib/geo-distance";

import { DeliveryPlansRepository } from "./delivery-plans.repository";

export type DeliveryFeeCalculationInput = {
  deliveryPlanId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  weightKg?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
};

export class DeliveryFeeCalculator {
  private readonly deliveryPlansRepository: DeliveryPlansRepository;

  constructor() {
    this.deliveryPlansRepository = new DeliveryPlansRepository();
  }

  async calculateFee(input: DeliveryFeeCalculationInput) {
    const planId = input.deliveryPlanId ?? null;
    if (!planId) {
      return DIRECT_ORDER_DELIVERY_FEE_XAF;
    }

    const rules = await db
      .select()
      .from(deliveryFeeRules)
      .where(
        and(
          eq(deliveryFeeRules.deliveryPlanId, planId),
          eq(deliveryFeeRules.isActive, true),
        ),
      )
      .orderBy(asc(deliveryFeeRules.sortOrder));

    if (rules.length === 0) {
      return this.deliveryPlansRepository.getFeeById(planId);
    }

    const distanceKm =
      input.latitude != null && input.longitude != null
        ? haversineDistanceKm(EDOSHOP_STORE_COORDINATES, {
            latitude: Number(input.latitude),
            longitude: Number(input.longitude),
          })
        : 0;
    const weightKg = Number(input.weightKg ?? 0);
    const lengthCm = input.lengthCm != null ? Number(input.lengthCm) : null;
    const widthCm = input.widthCm != null ? Number(input.widthCm) : null;
    const heightCm = input.heightCm != null ? Number(input.heightCm) : null;

    const matchedRule = rules.find((rule) => {
      const minDistance = Number(rule.minDistanceKm);
      const maxDistance =
        rule.maxDistanceKm != null ? Number(rule.maxDistanceKm) : null;
      const minWeight = Number(rule.minWeightKg);
      const maxWeight =
        rule.maxWeightKg != null ? Number(rule.maxWeightKg) : null;

      const distanceMatches =
        distanceKm >= minDistance &&
        (maxDistance == null || distanceKm <= maxDistance);
      const weightMatches =
        weightKg >= minWeight && (maxWeight == null || weightKg <= maxWeight);
      const dimensionMatches =
        (rule.maxLengthCm == null || (lengthCm != null && lengthCm <= rule.maxLengthCm)) &&
        (rule.maxWidthCm == null || (widthCm != null && widthCm <= rule.maxWidthCm)) &&
        (rule.maxHeightCm == null || (heightCm != null && heightCm <= rule.maxHeightCm));

      return distanceMatches && weightMatches && dimensionMatches;
    });

    return matchedRule?.fee ?? rules[rules.length - 1]?.fee ?? DIRECT_ORDER_DELIVERY_FEE_XAF;
  }

  async calculateFeeForOrder(
    fulfillmentMethod: FulfillmentMethod | string,
    input: DeliveryFeeCalculationInput,
  ) {
    if (fulfillmentMethod === FulfillmentMethod.PICKUP) {
      return 0;
    }

    return this.calculateFee(input);
  }
}

export const deliveryFeeCalculator = new DeliveryFeeCalculator();
