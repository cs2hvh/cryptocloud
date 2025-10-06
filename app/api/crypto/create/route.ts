import { NextRequest, NextResponse } from 'next/server'
import { calculateCryptoDepositFee, formatFeeStructure } from '@/config/fees'
import { createServerSupabase } from '@/lib/supabaseServer'
import { createNOWPaymentsAPI } from '@/lib/nowpayments'
import { getBearer } from '@/lib/serverAuth';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const bearer = getBearer(request);
    if (!bearer) return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    // Use anon-key auth client to read user from the bearer token reliably
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authClient = createClient(url, anon, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${bearer}` } as any },
    } as any);
    const { data: userData } = await authClient.auth.getUser();
    const userId = userData?.user?.id as string | undefined;
    if (!userId) return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const body = await request.json()
    const { amount, currency } = body

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Valid amount is required'
      }, { status: 400 })
    }

    if (!currency) {
      return NextResponse.json({
        success: false,
        error: 'Currency is required'
      }, { status: 400 })
    }

    const baseAmount = parseFloat(amount)

    // Validate amount limits
    if (baseAmount < 20) {
      return NextResponse.json({
        success: false,
        error: 'Minimum amount is $20.00'
      }, { status: 400 })
    }

    const baseUrl = process.env.NOWPAYMENTS_CALLBACK_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Create unique order ID
    const orderId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

    // Calculate fee using new fee structure
    const feeAmount = calculateCryptoDepositFee(currency, baseAmount)
    const totalAmount = baseAmount + feeAmount

    console.log('Creating NOWPayments payment:', {
      orderId,
      baseAmount: baseAmount.toFixed(2),
      feeAmount: feeAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      currency,
      userId,
      feeStructure: formatFeeStructure(currency)
    })

    // Create payment with NOWPayments
    const nowPayments = createNOWPaymentsAPI()
    const paymentData = await nowPayments.createPayment({
      price_amount: totalAmount,
      price_currency: "usd",
      pay_currency: currency,
      ipn_callback_url: `${baseUrl}`,
      order_id: orderId,
      order_description: `Wallet deposit for user ${userId}`
    })

    // Get user's wallet
    const supabase = createServerSupabase()
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (walletError || !walletData) {
      console.error('Failed to get wallet:', walletError)
      return NextResponse.json({
        success: false,
        error: 'Failed to get wallet'
      }, { status: 500 })
    }

    // Call crypto_create_payment function
    const { data: transactionData, error: functionError } = await supabase
      .rpc('wallet_crypto_create_payment', {
        p_user_id: userId,
        p_wallet_id: walletData.id,
        p_order_id: orderId,
        p_amount: baseAmount,
        p_fee_amount: feeAmount,
        p_currency: currency,
        p_payment_provider: 'nowpayments',
        p_payment_id: paymentData.payment_id.toString(),
        p_payment_url: paymentData.payment_id,
        p_metadata: {
          nowpayments_response: paymentData,
          base_amount: baseAmount,
          total_amount: totalAmount,
          fee_structure: formatFeeStructure(currency),
          pay_address: paymentData.pay_address,
          pay_amount: paymentData.pay_amount,
          pay_currency: paymentData.pay_currency,
          network: paymentData.network,
          expiration_estimate_date: paymentData.expiration_estimate_date
        }
      })

    if (functionError) {
      console.error('Failed to create payment record:', functionError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create payment record'
      }, { status: 500 })
    }
    console.log('Payment record created successfully:', paymentData)
    return NextResponse.json({
      success: true,
      payment_id: paymentData.payment_id,
      order_id: orderId,
      amount: baseAmount.toFixed(2),
      fee: feeAmount.toFixed(2),
      total: totalAmount.toFixed(2),
      fee_structure: formatFeeStructure(currency),
      pay_address: paymentData.pay_address,
      pay_amount: paymentData.pay_amount,
      pay_currency: paymentData.pay_currency,
      network: paymentData.network,
      expiration_estimate_date: paymentData.expiration_estimate_date,
      payment_status: paymentData.payment_status,
      payment_url: paymentData.payment_id,
      transaction_id: transactionData?.[0]?.transaction_id,
    })

  } catch (error) {
    console.error('NOWPayments payment creation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}