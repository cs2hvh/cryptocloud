import { createNOWPaymentsAPI } from '@/lib/nowpayments'
import { NextResponse } from 'next/server'


export async function GET() {
    try {
        const nowPayments = createNOWPaymentsAPI()
        const currencies = await nowPayments.getSupportedCurrencies()

        return NextResponse.json({
            success: true,
            currencies
        })

    } catch (error) {
        console.error('Error fetching NOWPayments currencies:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch currencies'
        }, { status: 500 })
    }
}