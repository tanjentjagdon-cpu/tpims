export interface ParsedTiktokOrder {
    order_id: string | null
    status: string | null
    payout_status: string // 'Pending' or 'Transferred'
    buyer_address: string | null
    buyer_username: string | null
    order_date: string | null // ISO string
    // New Fields
    tracking_number: string | null
    shipping_provider: string | null
    payment_method: string | null
    shopee_voucher: number // Might need rename for TikTok but keeping for compatibility
    voucher_code: string | null
    date_paid: string | null
    date_shipped: string | null
    date_completed: string | null
    
    items: {
        product_name: string
        variation: string
        price: number
        quantity: number
    }[]
    fees: {
        shipping_fee_paid_by_buyer: number
        transaction_fee: number
        service_fee: number
        commission_fee: number
        support_program_fee: number
        tax: number
        estimated_shipping_fee: number
        shipping_fee_rebate: number
    }
    totals: {
        merchandise_subtotal: number
        estimated_income: number
        total_payment: number
    }
}

// Helper to normalize product names
function normalizeProductName(name: string): string {
    return name;
}

// Helper to normalize variations
function normalizeVariation(variation: string): string {
    let clean = variation.split(',')[0].trim();
    clean = clean.replace(/\s*#[a-zA-Z0-9\s]+$/, '').trim();

    const match = clean.match(/^([^-]+)-\s*(.+)$/);
    if (match) {
        clean = `${match[2].trim()} ${match[1].trim()}`;
    }

    const lower = clean.toLowerCase();

    if (lower.includes('noraisa')) return 'NORAISA';
    if (lower === 'emerald green') return 'Emerald';
    if (lower === 'yellow gold') return 'Yellow Gold';

    return clean;
}

export function parseTiktokOrderText(text: string): ParsedTiktokOrder & { payout_status: string } {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
        order_id: null as string | null,
        status: null as string | null,
        payout_status: 'Pending', 
        buyer_address: null as string | null,
        buyer_username: null as string | null,
        order_date: null as string | null,
        items: [] as any[],
        fees: {
            shipping_fee_paid_by_buyer: 0,
            transaction_fee: 0,
            service_fee: 0,
            commission_fee: 0,
            support_program_fee: 0,
            tax: 0,
            estimated_shipping_fee: 0,
            shipping_fee_rebate: 0
        },
        totals: {
            merchandise_subtotal: 0,
            estimated_income: 0,
            total_payment: 0
        },
        // Additional fields
        tracking_number: null as string | null,
        shipping_provider: null as string | null,
        payment_method: null as string | null,
        shopee_voucher: 0,
        voucher_code: null as string | null,
        date_paid: null as string | null,
        date_shipped: null as string | null,
        date_completed: null as string | null
    };

    const parseMoney = (str: string | undefined) => {
        if (!str) return 0;
        const clean = str.replace(/[^\d.-]/g, '');
        return parseFloat(clean) || 0;
    }

    // Reuse Shopee parsing logic for now as a placeholder
    // In reality, TikTok order text will be different.
    // Ideally we should warn the user or try to adapt.
    
    // Naive implementation: Try to find common patterns
    
    // Order ID
    const orderIdIdx = lines.findIndex(l => l.includes('Order ID'));
    if (orderIdIdx !== -1 && lines[orderIdIdx + 1]) {
        result.order_id = lines[orderIdIdx + 1];
    }

    // Status
    const statusKeywords = ['Completed', 'To Pay', 'To Ship', 'Shipping', 'Cancelled', 'Return/Refund'];
    const foundStatus = lines.find(l => statusKeywords.includes(l));
    if (foundStatus) result.status = foundStatus;

    // TODO: Implement actual TikTok parsing logic when sample data is available.
    
    return result;
}
