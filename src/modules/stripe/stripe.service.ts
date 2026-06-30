import Stripe from "stripe";

import { PaymentMethod } from "@/constants/payment-methods.constants";
import { PAYMENT_STATUSES } from "@/constants/payment-statuses.constants";
import { ValidationError } from "@/core/errors";
import stripeConfig from "@/config/stripe.config";
import { OrdersRepository } from "@/modules/orders/orders.repository";

import type { CheckoutDirectOrderRequest } from "@/modules/orders/orders.schema";

export class StripeService {
  private readonly ordersRepository: OrdersRepository;
  private readonly stripe: Stripe | null;

  constructor() {
    this.ordersRepository = new OrdersRepository();
    this.stripe = stripeConfig.enabled
      ? new Stripe(stripeConfig.secretKey)
      : null;
  }

  getPublicConfig() {
    return {
      enabled: stripeConfig.enabled,
      publishableKey: stripeConfig.publishableKey,
      currency: stripeConfig.currency,
    };
  }

  private assertConfigured() {
    if (!this.stripe || !stripeConfig.enabled) {
      throw new ValidationError("Stripe payments are not configured");
    }
    return this.stripe;
  }

  async checkoutDirectOrder(userId: number, payload: CheckoutDirectOrderRequest) {
    const stripe = this.assertConfigured();

    const customer = await this.ordersRepository.findCustomerByUserId(userId);
    if (!customer) {
      throw new ValidationError("Customer profile not found for this account");
    }

    const stripeMethod = await this.ordersRepository.findPaymentMethodByName(
      PaymentMethod.STRIPE,
    );
    if (!stripeMethod) {
      throw new ValidationError("Stripe payment method is not configured");
    }

    const checkout = await this.ordersRepository.createDirectOrderCheckout({
      userId,
      customerId: customer.id,
      paymentMethodId: stripeMethod.id,
      payOnDelivery: false,
      paymentPending: true,
      billing: payload.billing,
      items: payload.items,
    });

    const amount = stripeConfig.toStripeAmount(Number(checkout.totalAmount));

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: stripeConfig.currency,
      automatic_payment_methods: { enabled: true },
      receipt_email: payload.billing.email,
      metadata: {
        orderId: String(checkout.orderId),
        orderCode: checkout.orderCode,
        paymentTransactionId: String(checkout.paymentTransactionId),
        userId: String(userId),
      },
      description: `Edoshop order ${checkout.orderCode}`,
    });

    await this.ordersRepository.updatePaymentTransactionReference(
      checkout.paymentTransactionId,
      paymentIntent.id,
      userId,
    );

    if (!paymentIntent.client_secret) {
      throw new ValidationError("Unable to initialize Stripe payment");
    }

    return {
      orderId: checkout.orderId,
      orderCode: checkout.orderCode,
      totalAmount: checkout.totalAmount,
      paymentMethod: checkout.paymentMethod,
      paymentStatus: checkout.paymentStatus,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async handleWebhook(rawBody: string, signature: string | undefined) {
    const stripe = this.assertConfigured();

    if (!stripeConfig.webhookSecret) {
      throw new ValidationError("Stripe webhook secret is not configured");
    }
    if (!signature) {
      throw new ValidationError("Missing Stripe signature");
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeConfig.webhookSecret,
    );

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await this.ordersRepository.updatePaymentStatusByTransactionReference(
        paymentIntent.id,
        PAYMENT_STATUSES.COMPLETED,
      );
    }

    if (
      event.type === "payment_intent.payment_failed"
      || event.type === "payment_intent.canceled"
    ) {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await this.ordersRepository.updatePaymentStatusByTransactionReference(
        paymentIntent.id,
        PAYMENT_STATUSES.FAILED,
      );
    }

    return { received: true };
  }
}

export const stripeService = new StripeService();
