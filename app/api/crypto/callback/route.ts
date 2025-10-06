import { NextRequest, NextResponse } from 'next/server'
import { createNOWPaymentsAPI } from '@/lib/nowpayments'
import { createServerSupabase } from '@/lib/supabaseServer'

export async function GET() {
  console.log('GET request to crypto callback endpoint - webhook is accessible')
  return NextResponse.json({
    message: 'Nothing here',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('=== CRYPTO CALLBACK RECEIVED ===')
  console.log('Timestamp:', new Date().toISOString())
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))

  try {
    const body = await request.text()
    console.log('Raw body:', body)

    const data = JSON.parse(body)

    console.log('Parsed callback data:', {
      payment_id: data.payment_id,
      payment_status: data.payment_status,
      pay_amount: data.pay_amount,
      actually_paid: data.actually_paid,
      order_id: data.order_id,
      outcome_amount: data.outcome_amount,
      full_data: data
    })

    // Verify webhook signature
    const receivedSignature = request.headers.get('x-nowpayments-sig')

    if (receivedSignature) {
      try {
        const nowpayments = createNOWPaymentsAPI()
        const isValidSignature = nowpayments.verifyWebhookSignature(data, receivedSignature)

        if (!isValidSignature) {
          console.warn('Invalid webhook signature')
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        } else {
          console.log('Signature verification passed')
        }
      } catch (error) {
        console.warn('Signature verification error:', error)
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
      }
    } else {
      console.warn('No signature received in webhook')
      return NextResponse.json({ error: 'No signature received' }, { status: 401 })
    }

    // Basic validation - ensure required fields are present
    if (!data.payment_id || !data.payment_status) {
      console.error('Invalid webhook data - missing required fields:', data)
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 })
    }

    // Process the callback using the crypto_callback function
    const supabase = createServerSupabase()
    const { data: callbackResult, error: callbackError } = await supabase
      .rpc('crypto_callback', {
        p_order_id: data.order_id,
        p_payment_status: data.payment_status,
        p_payment_id: data.payment_id.toString(),
        p_actually_paid: data.actually_paid || null,
        p_outcome_amount: data.outcome_amount || null,
        p_outcome_currency: data.outcome_currency || null,
        p_payin_hash: data.payin_hash || null,
        p_payout_hash: data.payout_hash || null,
        p_metadata: {
          webhook_data: data,
          processed_at: new Date().toISOString(),
          source: 'nowpayments'
        }
      })

    if (callbackError) {
      console.error('Failed to process callback:', callbackError)
      return NextResponse.json({
        error: 'Failed to process callback',
        details: callbackError.message
      }, { status: 500 })
    }

    const result = callbackResult?.[0]
    if (!result) {
      console.error('No result returned from callback function')
      return NextResponse.json({ error: 'No result from callback processing' }, { status: 500 })
    }

    console.log('Callback processed successfully:', {
      transaction_id: result.transaction_id,
      user_id: result.user_id,
      new_balance: result.new_balance,
      status_updated: result.status_updated,
      amount_credited: result.amount_credited
    })

    // Log the outcome for different scenarios
    if (result.status_updated) {
      if (result.amount_credited > 0) {
        if (data.payment_status === 'partially_paid') {
          console.log(`⚠️ Payment partially paid: ${result.amount_credited} credited to user ${result.user_id}. New balance: ${result.new_balance}`)
        } else {
          console.log(`🎉 Payment completed: ${result.amount_credited} credited to user ${result.user_id}. New balance: ${result.new_balance}`)
        }
        console.log(`✅ Payment processed: ${result.amount_credited} credited to user ${result.user_id}. New balance: ${result.new_balance}`)
      } else {
        console.log(`📝 Status updated for user ${result.user_id} to ${data.payment_status}`)
      }
    } else {
      console.log(`ℹ️ No status change for payment ${data.payment_id}`)
    }

    return NextResponse.json({
      status: 'ok',
      processed: {
        transaction_id: result.transaction_id,
        status_updated: result.status_updated,
        amount_credited: result.amount_credited,
        new_balance: result.new_balance
      }
    })

  } catch (error) {
    console.error('Crypto callback error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 200 })
  }
}