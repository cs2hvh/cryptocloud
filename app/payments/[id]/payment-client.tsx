"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Copy, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight } from "lucide-react"
import Image from "next/image"
import QRCode from "qrcode"

interface PaymentData {
  payment_id: number
  payment_status: string
  pay_address: string
  pay_amount: number
  pay_currency: string
  price_amount: number
  price_currency: string
  network?: string
  created_at: string
  updated_at: string
  expiration_estimate_date?: string
  order_id?: string | null
  order_description?: string | null
}

interface PaymentClientProps {
  initialPaymentData: PaymentData
  paymentId: string
}

export default function PaymentClient({ initialPaymentData, paymentId }: PaymentClientProps) {
  const [paymentData, setPaymentData] = useState<PaymentData>(initialPaymentData)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [refreshing, setRefreshing] = useState(false)

  // Generate QR code
  useEffect(() => {
    const generateQR = async () => {
      if (paymentData.pay_address) {
        try {
          const qrUrl = await QRCode.toDataURL(paymentData.pay_address, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          })
          setQrCodeUrl(qrUrl)
        } catch {
          console.error('Failed to generate QR code')
        }
      }
    }
    generateQR()
  }, [paymentData.pay_address])

  // Auto-refresh every minute
  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setRefreshing(true)
        const response = await fetch(`/api/crypto/payment/${paymentId}`)
        const data = await response.json()

        if (response.ok && data.success) {
          setPaymentData(data.payment)
        }
      } catch {
        console.error('Failed to refresh payment data')
      } finally {
        setRefreshing(false)
      }
    }

    // Set up interval for auto-refresh
    const interval = setInterval(fetchPaymentData, 60000) // 1 minute

    return () => clearInterval(interval)
  }, [paymentId])

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'finished':
        return 'bg-green-500'
      case 'confirmed':
      case 'sending':
        return 'bg-blue-500'
      case 'confirming':
        return 'bg-orange-500'
      case 'waiting':
        return 'bg-yellow-500'
      case 'partially_paid':
        return 'bg-orange-500'
      case 'failed':
      case 'refunded':
      case 'expired':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'finished':
        return <CheckCircle className="h-4 w-4" />
      case 'confirmed':
      case 'sending':
        return <ArrowRight className="h-4 w-4" />
      case 'confirming':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'waiting':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'partially_paid':
        return <AlertCircle className="h-4 w-4" />
      case 'failed':
      case 'refunded':
      case 'expired':
        return <XCircle className="h-4 w-4" />
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />
    }
  }

  const getStatusDescription = (status: string) => {
    switch (status.toLowerCase()) {
      case 'waiting':
        return 'Waiting for payment'
      case 'confirming':
        return 'Payment detected, awaiting blockchain confirmations'
      case 'confirmed':
        return 'Payment confirmed, processing transaction'
      case 'sending':
        return 'Processing payment to your wallet'
      case 'partially_paid':
        return 'Partial payment received and added to your balance'
      case 'finished':
        return 'Payment completed and added to your wallet balance'
      case 'failed':
        return 'Payment failed, please try again'
      case 'refunded':
        return 'Payment was refunded to your original wallet'
      case 'expired':
        return 'Payment window expired, please create a new payment'
      default:
        return 'Unknown status'
    }
  }

  const isPaymentActive = !['finished', 'failed', 'refunded', 'expired'].includes(paymentData.payment_status.toLowerCase())

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Payment #{paymentData.payment_id}</h1>
            <Badge className={`${getStatusColor(paymentData.payment_status)} text-white text-sm px-4 py-2 rounded-full`}>
              <span className="flex items-center gap-2">
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  getStatusIcon(paymentData.payment_status)
                )}
                {paymentData.payment_status.replace('_', ' ').toUpperCase()}
              </span>
            </Badge>
          </div>

          {/* Payment Details - Only show if payment is still active */}
          {isPaymentActive && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* QR Code Section */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-6 rounded-2xl">
                  {qrCodeUrl ? (
                    <Image
                      src={qrCodeUrl}
                      alt="Payment QR Code"
                      width={220}
                      height={220}
                      className="w-55 h-55"
                    />
                  ) : (
                    <div className="w-55 h-55 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                  )}
                </div>
                <p className="text-zinc-400 text-sm mt-3 text-center">
                  Scan with your crypto wallet app
                </p>
              </div>

              {/* Payment Details Section */}
              <div className="space-y-6">
                {/* Recipient Address */}
                <div>
                  <label className="text-zinc-400 text-sm mb-2 block font-medium">Recipient Address</label>
                  <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-sm font-mono break-all text-white flex-1">
                        {paymentData.pay_address}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(paymentData.pay_address, 'Address')}
                        className="shrink-0 h-9 px-3 border-zinc-600 hover:bg-zinc-700 text-white"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="ml-1 text-xs">Copy</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-zinc-400 text-sm mb-2 block font-medium">Amount</label>
                  <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-2xl font-mono font-bold text-white">
                        {paymentData.pay_amount} {paymentData.pay_currency?.toUpperCase()}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(paymentData.pay_amount.toString(), 'Amount')}
                        className="shrink-0 h-9 px-3 border-zinc-600 hover:bg-zinc-700 text-white"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="ml-1 text-xs">Copy</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Network */}
                {paymentData.network && (
                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block font-medium">Network</label>
                    <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4">
                      <div className="text-lg font-bold text-white">
                        {paymentData.network}
                      </div>
                    </div>
                  </div>
                )}

                {/* USD Equivalent */}
                <div>
                  <label className="text-zinc-400 text-sm mb-2 block font-medium">USD Equivalent</label>
                  <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4">
                    <div className="text-lg font-bold text-white">
                      {paymentData.price_amount}
                    </div>
                  </div>
                </div>

                {/* Expiration */}
                {paymentData.expiration_estimate_date && (
                  <div>
                    <label className="text-zinc-400 text-sm mb-2 block font-medium">Expires</label>
                    <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-4">
                      <div className="text-lg font-bold text-orange-400">
                        {new Date(paymentData.expiration_estimate_date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-xl font-bold mb-4 ">
              {isPaymentActive ? 'Payment Instructions' : 'Payment Complete'}
            </h3>

            {isPaymentActive ? (
              <div className="space-y-4">
                <div className="bg-blue-950/50 border border-blue-800/50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-300 mb-3">How to complete your payment:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-200">
                    <li>Copy the payment address above or scan the QR code</li>
                    <li>Send exactly <strong className="text-white">{paymentData.pay_amount} {paymentData.pay_currency.toUpperCase()}</strong> to the address</li>
                    <li>Wait for network confirmation (usually 10-30 minutes)</li>
                    <li>Your wallet will be credited automatically once confirmed</li>
                  </ol>
                </div>

                <div className="bg-orange-950/50 border border-orange-800/50 rounded-lg p-4">
                  <h4 className="font-medium text-orange-300 mb-3">Important:</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-orange-200">
                    <li>Send the exact amount shown above</li>
                    <li>Use the correct network ({paymentData.network || paymentData.pay_currency.toUpperCase()})</li>
                    <li>Double-check the address before sending</li>
                    <li>Payment will expire if not received in time</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className={`${paymentData.payment_status === 'finished'
                ? 'bg-green-950/50 border-green-800/50'
                : 'bg-red-950/50 border-red-800/50'
                } border rounded-lg p-4`}>
                <h4 className={`font-medium mb-2 text-center ${paymentData.payment_status === 'finished'
                  ? 'text-green-300'
                  : 'text-red-300'
                  }`}>
                  Payment {paymentData.payment_status === 'finished' ? 'Completed' : 'Ended'}
                </h4>
                <p className={`text-sm text-center ${paymentData.payment_status === 'finished'
                  ? 'text-green-200'
                  : 'text-red-200'
                  }`}>
                  {getStatusDescription(paymentData.payment_status)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}