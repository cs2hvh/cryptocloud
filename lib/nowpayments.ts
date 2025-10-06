// NOWPayments API client
import crypto from "crypto"
interface NOWPaymentsConfig {
  apiKey: string
  ipnSecret?: string
  sandboxMode?: boolean
}

interface CreatePaymentRequest {
  price_amount: number
  price_currency: string
  pay_currency: string
  ipn_callback_url: string
  order_id: string
  order_description?: string
  [key: string]: unknown
}

interface CreatePaymentResponse {
  payment_id: number
  payment_status: string
  pay_address: string
  payin_extra_id?: string | null
  price_amount: number
  price_currency: string
  pay_amount: number
  pay_currency: string
  order_id?: string | null
  order_description?: string | null
  purchase_id: number
  outcome_amount?: number | null
  outcome_currency?: string | null
  payout_hash?: string | null
  payin_hash?: string | null
  created_at: string
  updated_at: string
  burning_percent?: string | null
  type: string
  payment_extra_ids?: number[] | null
  network?: string
  expiration_estimate_date?: string
}

interface PaymentStatusResponse extends CreatePaymentResponse {
  actually_paid?: number | null
}

interface Currency {
  id: number
  code: string
  name: string
  enable: boolean
  wallet_regex: string
  priority: number
  extra_id_exists: boolean
  extra_id_regex?: string | null
  logo_url: string
  track: boolean
  cg_id: string
  is_maxlimit: boolean
  network: string
  smart_contract?: string | null
  network_precision: string
  explorer_link_hash?: string | null
  precision: number
  ticker: string
  is_defi: boolean
  is_popular: boolean
  is_stable: boolean
  available_for_to_conversion: boolean
  trust_wallet_id?: string | null
  created_at: string
  updated_at: string
  available_for_payment: boolean
  available_for_payout: boolean
  extra_id_optional: boolean
}

class NOWPaymentsAPI {
  private config: NOWPaymentsConfig
  private baseUrl: string

  constructor(config: NOWPaymentsConfig) {
    this.config = config
    this.baseUrl = 'https://api.nowpayments.io'
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const options: RequestInit = {
      method,
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json'
      }
    }

    if (body && method === 'POST') {
      options.body = JSON.stringify(body)
    }

    // console.log(`NOWPayments API ${method} ${url}`)

    const response = await fetch(url, options)

    if (!response.ok) {
      const errorText = await response.text()
      // console.error(`NOWPayments API error: ${response.status} ${errorText}`)
      throw new Error(`NOWPayments API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    // console.log(`NOWPayments response:`, data)
    return data
  }

  async createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    return this.makeRequest<CreatePaymentResponse>('/v1/payment', 'POST', request)
  }

  async getPaymentStatus(paymentId: string | number): Promise<PaymentStatusResponse> {
    return this.makeRequest<PaymentStatusResponse>(`/v1/payment/${paymentId}`)
  }

  async getSupportedCurrencies(): Promise<Currency[]> {
    const response = await this.makeRequest<{ currencies: Currency[] }>('/v1/full-currencies')

    // Filter to only enabled currencies that are available for payment
    return response.currencies
      .filter(currency => currency.enable && currency.available_for_payment)
      .sort((a, b) => {
        // Sort by popularity first, then by priority
        if (a.is_popular && !b.is_popular) return -1
        if (!a.is_popular && b.is_popular) return 1
        return a.priority - b.priority
      })
  }

  async getMinimumPaymentAmount(
    currencyFrom: string,
    currencyTo: string = 'usd'
  ): Promise<{ min_amount: number }> {
    return this.makeRequest<{ min_amount: number }>(
      `/v1/min-amount?currency_from=${currencyFrom}&currency_to=${currencyTo}`
    )
  }

  async getEstimatedPrice(
    amount: number,
    currencyFrom: string,
    currencyTo: string = 'usd'
  ): Promise<{ estimated_amount: number }> {
    return this.makeRequest<{ estimated_amount: number }>(
      `/v1/estimate?amount=${amount}&currency_from=${currencyFrom}&currency_to=${currencyTo}`
    )
  }

  // Webhook signature verification
  verifyWebhookSignature(webhookData: Record<string, unknown>, signature: string): boolean {
    if (!this.config.ipnSecret) {
      console.warn('IPN secret not configured, skipping signature verification')
      return true // Skip verification if no secret is configured
    }

    // Method 1: Raw JSON without sorting (this was the working method)
    const rawMessage = JSON.stringify(webhookData)
    const expectedSignature = crypto
      .createHmac('sha512', this.config.ipnSecret)
      .update(rawMessage)
      .digest('hex')

    const isValidSignature = signature === expectedSignature

    console.log('Signature verification debug:', {
      receivedSignature: signature,
      isValidSignature,
      matchedMethod: 1,
      rawBodyLength: rawMessage.length,
      ipnSecretLength: this.config.ipnSecret?.length
    })

    return isValidSignature
  }
}

// Factory function to create NOWPayments API instance
export function createNOWPaymentsAPI(): NOWPaymentsAPI {
  const apiKey = process.env.NOWPAYMENTS_API_KEY
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET
  const sandboxMode = process.env.NODE_ENV === 'development'

  if (!apiKey) {
    throw new Error('NOWPAYMENTS_API_KEY environment variable is required')
  }

  return new NOWPaymentsAPI({
    apiKey,
    ipnSecret,
    sandboxMode
  })
}

export type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatusResponse,
  Currency
}