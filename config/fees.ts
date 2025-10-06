// Fee configuration for different currencies and operations

export interface FeeStructure {
    type: 'fixed' | 'percentage_plus_fixed'
    fixed?: number // Fixed fee amount in USD
    percentage?: number // Percentage rate (0.02 = 2%)
    fixedComponent?: number // Fixed component when using percentage_plus_fixed
}

export interface CryptoDepositFees {
    [currencyCode: string]: FeeStructure
}

// Default fee structure for most currencies: 2% + $10
const DEFAULT_CRYPTO_FEE: FeeStructure = {
    type: 'percentage_plus_fixed',
    percentage: 0.02, // 2%
    fixedComponent: 10 // $10
}

// Specific fee overrides for certain currencies
export const CRYPTO_DEPOSIT_FEES: CryptoDepositFees = {
    // USDT has a fixed $7 fee
    'usdt': {
        type: 'fixed',
        fixed: 7
    },
    'usdttrc20': {
        type: 'fixed',
        fixed: 7
    },
    'usdterc20': {
        type: 'fixed',
        fixed: 7
    },
    'usdtbep20': {
        type: 'fixed',
        fixed: 7
    }
}

/**
 * Calculate the fee for a given currency and amount
 */
export function calculateCryptoDepositFee(currencyCode: string, amount: number): number {
    const currency = currencyCode.toLowerCase()
    const feeStructure = CRYPTO_DEPOSIT_FEES[currency] || DEFAULT_CRYPTO_FEE

    switch (feeStructure.type) {
        case 'fixed':
            return feeStructure.fixed || 0

        case 'percentage_plus_fixed':
            const percentageFee = amount * (feeStructure.percentage || 0)
            const fixedFee = feeStructure.fixedComponent || 0
            return percentageFee + fixedFee

        default:
            return 0
    }
}

/**
 * Get the fee structure for a given currency (for display purposes)
 */
export function getFeeStructure(currencyCode: string): FeeStructure {
    const currency = currencyCode.toLowerCase()
    return CRYPTO_DEPOSIT_FEES[currency] || DEFAULT_CRYPTO_FEE
}

/**
 * Format fee structure as a human-readable string
 */
export function formatFeeStructure(currencyCode: string): string {
    const feeStructure = getFeeStructure(currencyCode)

    switch (feeStructure.type) {
        case 'fixed':
            return `$${feeStructure.fixed} fixed fee`

        case 'percentage_plus_fixed':
            const percentage = ((feeStructure.percentage || 0) * 100).toFixed(1)
            return `${percentage}% + $${feeStructure.fixedComponent} fee`

        default:
            return 'No fee information available'
    }
}