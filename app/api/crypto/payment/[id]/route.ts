import { createNOWPaymentsAPI } from '@/lib/nowpayments'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const paymentId = (await params).id

    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: 'Payment ID is required'
      }, { status: 400 })
    }

    // Get payment status from NOWPayments
    const nowPayments = createNOWPaymentsAPI()
    const paymentData = await nowPayments.getPaymentStatus(paymentId)

    return NextResponse.json({
      success: true,
      payment: paymentData
    })

  } catch (error) {
    console.error('Failed to fetch payment status:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payment status'
    }, { status: 500 })
  }
}