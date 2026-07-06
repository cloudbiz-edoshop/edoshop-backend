import Stripe from "stripe";

import currenciesConfig from "@/config/currencies.config";
import stripeConfig from "@/config/stripe.config";
import { PaymentMethod } from "@/constants/payment-methods.constants";
import { PAYMENT_STATUSES } from "@/constants/payment-statuses.constants";
import { ValidationError } from "@/core/errors";
import { OrdersRepository } from "@/modules/orders/orders.repository";

import type { CheckoutDirectOrderRequest } from "@/modules/orders/orders.schema";

type StripeCheckoutRequest = CheckoutDirectOrderRequest & {
  currency?: string;
  paymentGateway?: "stripe" | "paypal";
};

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
      defaultCurrency: stripeConfig.defaultCurrency,
      currencies: currenciesConfig.getPublicCurrencies(),
    };
  }

  private assertConfigured() {
    if (!this.stripe || !stripeConfig.enabled) {
      throw new ValidationError("Stripe payments are not configured");
    }
    return this.stripe;
  }

  async checkoutDirectOrder(userId: number, payload: StripeCheckoutRequest) {
    const stripe = this.assertConfigured();
    const currency = currenciesConfig.resolveCurrency(payload.currency);

    const customer = await this.ordersRepository.findCustomerByUserId(userId);
    if (!customer) {
      throw new ValidationError("Customer profile not found for this account");
    }

    const paymentGateway = payload.paymentGateway === "paypal" ? "paypal" : "stripe";
    const checkoutPaymentMethodName =
      paymentGateway === "paypal" ? PaymentMethod.PAYPAL : PaymentMethod.STRIPE;

    const checkoutMethod = await this.ordersRepository.findPaymentMethodByName(
      checkoutPaymentMethodName,
    );
    if (!checkoutMethod) {
      throw new ValidationError(
        paymentGateway === "paypal"
          ? "PayPal payment method is not configured"
          : "Stripe payment method is not configured",
      );
    }

    const checkout = await this.ordersRepository.createDirectOrderCheckout({
      userId,
      customerId: customer.id,
      paymentMethodId: checkoutMethod.id,
      payOnDelivery: false,
      paymentPending: true,
      fulfillmentMethod: payload.fulfillmentMethod,
      pickupWarehouseId: payload.pickupWarehouseId,
      billing: payload.billing,
      items: payload.items,
    });

    const totalInCurrency = currenciesConfig.convertFromBase(
      Number(checkout.totalAmount),
      currency,
    );
    const amount = stripeConfig.toStripeAmount(totalInCurrency, currency);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      ...(paymentGateway === "paypal"
        ? { payment_method_types: ["paypal"] }
        : { automatic_payment_methods: { enabled: true } }),
      receipt_email: payload.billing.email,
      metadata: {
        orderId: String(checkout.orderId),
        orderCode: checkout.orderCode,
        paymentTransactionId: String(checkout.paymentTransactionId),
        userId: String(userId),
        chargeCurrency: currency,
        paymentGateway,
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
      chargeAmount: totalInCurrency.toFixed(currency === "xaf" ? 0 : 2),
      currency,
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
