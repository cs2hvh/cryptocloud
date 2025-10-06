import { notFound } from 'next/navigation'
import { createNOWPaymentsAPI } from '@/lib/nowpayments'
import PaymentClient from './payment-client'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

interface PaymentPageProps {
  params: Promise<{
    id: string
  }>
}

async function getPaymentData(paymentId: string) {
  try {
    const nowPayments = createNOWPaymentsAPI()
    const paymentData = await nowPayments.getPaymentStatus(paymentId)
    return paymentData
  } catch (error) {
    console.error('Failed to fetch payment data:', error)
    return null
  }
}

function PaymentLoader() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  )
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const paymentData = await getPaymentData((await params).id)

  if (!paymentData) {
    notFound()
  }

  // const isPaymentActive = !['finished', 'failed', 'refunded', 'expired'].includes(paymentData.payment_status.toLowerCase())

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<PaymentLoader />}>
        <PaymentClient initialPaymentData={paymentData} paymentId={(await params).id} />
      </Suspense>
    </div>
  )
}