import { PAYMENT_STATUSES } from "@/constants/payment-statuses.constants";
import campayConfig from "@/config/campay.config";
import { ValidationError } from "@/core/errors";
import { OrdersRepository } from "@/modules/orders/orders.repository";

type CampayTokenResponse = {
  token?: string;
};

type CampayCollectResponse = {
  reference?: string;
  ussd_code?: string;
  operator?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
  external_reference?: string;
  message?: string;
  detail?: string;
};

type CampayTransactionResponse = {
  reference?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
  operator?: string;
  external_reference?: string;
  code?: string;
  operator_reference?: string;
};

export const normalizeCameroonPhone = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) {
    throw new ValidationError("A valid mobile money phone number is required");
  }

  if (digits.startsWith("237") && digits.length >= 12) {
    return digits.slice(0, 12);
  }

  if (digits.startsWith("0") && digits.length >= 9) {
    return `237${digits.slice(1, 10)}`;
  }

  if (digits.length === 9) {
    return `237${digits}`;
  }

  throw new ValidationError(
    "Phone number must be a valid MTN or Orange Cameroon number",
  );
};

export class CampayService {
  private readonly ordersRepository: OrdersRepository;
  private cachedToken: string | null = null;

  constructor() {
    this.ordersRepository = new OrdersRepository();
  }

  getPublicConfig() {
    return {
      enabled: campayConfig.enabled,
      environment: campayConfig.environment,
      currency: campayConfig.currency,
    };
  }

  private assertConfigured() {
    if (!campayConfig.enabled) {
      throw new ValidationError("CamPay mobile money is not configured");
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit & { auth?: boolean } = {},
  ): Promise<T> {
    this.assertConfigured();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };

    if (options.auth !== false) {
      const token = await this.getAccessToken();
      headers.Authorization = `Token ${token}`;
    }

    const response = await fetch(`${campayConfig.baseUrl}${path}`, {
      ...options,
      headers,
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        (body as { message?: string; detail?: string; non_field_errors?: string[] })
          .message
        || (body as { detail?: string }).detail
        || (body as { non_field_errors?: string[] }).non_field_errors?.join(", ")
        || `CamPay request failed (${response.status})`;
      throw new ValidationError(message);
    }

    return body as T;
  }

  async getAccessToken(forceRefresh = false) {
    this.assertConfigured();

    if (this.cachedToken && !forceRefresh) {
      return this.cachedToken;
    }

    const body = await this.request<CampayTokenResponse>("/token/", {
      method: "POST",
      auth: false,
      body: JSON.stringify({
        username: campayConfig.username,
        password: campayConfig.password,
      }),
    });

    if (!body.token) {
      throw new ValidationError("CamPay authentication failed");
    }

    this.cachedToken = body.token;
    return body.token;
  }

  async initCollect(params: {
    amount: number;
    phone: string;
    description: string;
    externalReference: string;
  }) {
    const amount = Math.max(1, Math.round(params.amount));
    const from = normalizeCameroonPhone(params.phone);

    try {
      return await this.request<CampayCollectResponse>("/collect/", {
        method: "POST",
        body: JSON.stringify({
          amount: String(amount),
          currency: campayConfig.currency.toUpperCase(),
          from,
          description: params.description,
          external_reference: params.externalReference,
        }),
      });
    } catch (error) {
      if (error instanceof ValidationError && /401|403|token/i.test(error.message)) {
        this.cachedToken = null;
        await this.getAccessToken(true);
        return await this.request<CampayCollectResponse>("/collect/", {
          method: "POST",
          body: JSON.stringify({
            amount: String(amount),
            currency: campayConfig.currency.toUpperCase(),
            from,
            description: params.description,
            external_reference: params.externalReference,
          }),
        });
      }
      throw error;
    }
  }

  async getTransactionStatus(reference: string) {
    return await this.request<CampayTransactionResponse>(
      `/transaction/${reference}/`,
      { method: "GET" },
    );
  }

  async syncTransactionStatus(reference: string, updatedBy = 1) {
    const transaction = await this.getTransactionStatus(reference);
    const status = String(transaction.status || "").toUpperCase();

    if (status === "SUCCESSFUL") {
      await this.ordersRepository.updatePaymentStatusByTransactionReference(
        reference,
        PAYMENT_STATUSES.COMPLETED,
        updatedBy,
      );
    }

    if (status === "FAILED" || status === "CANCELLED" || status === "CANCELED") {
      await this.ordersRepository.updatePaymentStatusByTransactionReference(
        reference,
        PAYMENT_STATUSES.FAILED,
        updatedBy,
      );
    }

    return {
      reference,
      status,
      operator: transaction.operator ?? null,
      amount: transaction.amount ?? null,
      currency: transaction.currency ?? campayConfig.currency.toUpperCase(),
      externalReference: transaction.external_reference ?? null,
      operatorReference: transaction.operator_reference ?? null,
      paymentCompleted: status === "SUCCESSFUL",
      paymentFailed: ["FAILED", "CANCELLED", "CANCELED"].includes(status),
    };
  }
}

export const campayService = new CampayService();
