import {
  AbstractPaymentProvider,
  PaymentProviderError,
  PaymentProviderSessionResponse,
} from "@medusajs/framework/utils"
import {
  CreatePaymentProviderSession,
  UpdatePaymentProviderSession,
  ProviderWebhookPayload,
  WebhookActionResult,
  PaymentSessionStatus,
} from "@medusajs/types"
import crypto from "crypto"

type NOWPaymentsOptions = {
  apiKey: string
  ipnSecret: string
  sandbox?: boolean
}

class NOWPaymentsProviderService extends AbstractPaymentProvider<NOWPaymentsOptions> {
  static identifier = "nowpayments"

  private readonly apiKey: string
  private readonly ipnSecret: string
  private readonly baseUrl: string

  constructor(container: Record<string, unknown>, options: NOWPaymentsOptions) {
    super(container, options)
    this.apiKey = options.apiKey
    this.ipnSecret = options.ipnSecret
    this.baseUrl = options.sandbox
      ? "https://api-sandbox.nowpayments.io/v1"
      : "https://api.nowpayments.io/v1"
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const error = await res.text()
      throw new Error(`NOWPayments API error ${res.status}: ${error}`)
    }
    return res.json() as Promise<T>
  }

  async initiatePayment(
    input: CreatePaymentProviderSession
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    try {
      const { amount, currency_code, context } = input

      const invoice = await this.request<{
        id: string
        invoice_url: string
        pay_currency: string
      }>("/invoice", "POST", {
        price_amount: amount / 100,
        price_currency: currency_code.toUpperCase(),
        pay_currency: "usdttrc20",
        order_id: context.resource_id,
        success_url: `${process.env.STORE_CORS}/checkout/success`,
        cancel_url: `${process.env.STORE_CORS}/checkout`,
        is_fixed_rate: true,
        is_fee_paid_by_user: false,
      })

      return {
        id: invoice.id,
        data: {
          invoiceId: invoice.id,
          invoiceUrl: invoice.invoice_url,
          status: "pending",
        },
      }
    } catch (e) {
      return {
        error: (e as Error).message,
        code: "payment_initiation_failed",
        detail: e,
      }
    }
  }

  async authorizePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    | PaymentProviderError
    | { status: PaymentSessionStatus; data: Record<string, unknown> }
  > {
    const status = paymentSessionData.status as string
    if (status === "finished" || status === "confirmed") {
      return { status: "authorized", data: paymentSessionData }
    }
    return { status: "pending", data: paymentSessionData }
  }

  async capturePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | Record<string, unknown>> {
    return paymentSessionData
  }

  async cancelPayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | Record<string, unknown>> {
    return paymentSessionData
  }

  async refundPayment(
    paymentSessionData: Record<string, unknown>,
    refundAmount: number
  ): Promise<PaymentProviderError | Record<string, unknown>> {
    return {
      ...paymentSessionData,
      refund_amount: refundAmount,
      refund_note: "Crypto refunds are processed manually. Contact support.",
    }
  }

  async retrievePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | Record<string, unknown>> {
    try {
      const invoiceId = paymentSessionData.invoiceId as string
      const data = await this.request<Record<string, unknown>>(
        `/invoice/${invoiceId}`
      )
      return data
    } catch (e) {
      return {
        error: (e as Error).message,
        code: "payment_retrieval_failed",
        detail: e,
      }
    }
  }

  async updatePayment(
    input: UpdatePaymentProviderSession
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    return { id: input.data.invoiceId as string, data: input.data }
  }

  async deletePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | Record<string, unknown>> {
    return paymentSessionData
  }

  async getPaymentStatus(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentSessionStatus> {
    const status = paymentSessionData.status as string
    switch (status) {
      case "finished":
      case "confirmed":
        return "authorized"
      case "failed":
      case "expired":
        return "error"
      default:
        return "pending"
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { data, rawData, headers } = payload
    const signature = headers["x-nowpayments-sig"] as string

    const sorted = JSON.stringify(
      Object.fromEntries(Object.entries(data as object).sort())
    )
    const expected = crypto
      .createHmac("sha512", this.ipnSecret)
      .update(sorted)
      .digest("hex")

    if (signature !== expected) {
      return { action: "failed", data: { session_id: "", amount: 0 } }
    }

    const paymentData = data as Record<string, unknown>
    const paymentStatus = paymentData.payment_status as string

    if (paymentStatus === "finished" || paymentStatus === "confirmed") {
      return {
        action: "authorized",
        data: {
          session_id: paymentData.order_id as string,
          amount: Number(paymentData.price_amount) * 100,
        },
      }
    }

    return {
      action: "not_supported",
    }
  }
}

export default NOWPaymentsProviderService
