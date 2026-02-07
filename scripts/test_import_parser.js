// Standalone parser logic for testing
function normalizeProductName(name) {
    // User requested to remove assumptions about Geena Cloth Plain/Printed
    return name;
}

function normalizeVariation(variation) {
    let clean = variation.split(',')[0].trim();
    // Improved regex to handle spaces in # number
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

function parseShopeeOrderText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
        order_id: null,
        status: null,
        payout_status: 'Pending',
        buyer_address: null,
        buyer_username: null,
        order_date: null,
        items: [],
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
        }
    };

    const parseMoney = (str) => {
        if (!str) return 0;
        const isNegative = str.includes('-');
        const val = parseFloat(str.replace(/[^-0-9.]/g, ''));
        return isNaN(val) ? 0 : (isNegative && val > 0 ? -val : val);
    };

    const orderIdIdx = lines.findIndex(l => l === 'Order ID');
    if (orderIdIdx !== -1) result.order_id = lines[orderIdIdx + 1];

    const addressIdx = lines.findIndex(l => l === 'Delivery Address');
    if (addressIdx !== -1) {
        result.buyer_username = lines[addressIdx + 1];
        result.buyer_address = lines[addressIdx + 2];
    }

    const knownStatuses = ['Unpaid', 'To Ship', 'Shipping', 'Shipped', 'Completed', 'Cancelled', 'Return', 'Refund', 'Delivery', 'Delivered'];
    let statusFound = null;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i];
        if (knownStatuses.some(s => line.includes(s) || s === line)) {
            if (line.startsWith('Completed') || line.startsWith('Delivered')) {
                statusFound = line.split(' ')[0];
                break;
            }
            if (knownStatuses.includes(line)) {
                statusFound = line;
                break;
            }
        }
    }
    result.status = statusFound || (lines.length > 0 ? lines[0] : null);

    if (text.includes('Fund transfer has completed') || text.includes('The payment has been successfully transferred')) {
        result.payout_status = 'Transferred';
    }

    const dateRegex = /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/;
    const dateLine = lines.find(l => dateRegex.test(l));
    if (dateLine) {
        const match = dateLine.match(dateRegex);
        if (match) {
            result.order_date = match[0];
        }
    }

    const productsStartIdx = lines.findIndex(l => l === 'Product(s)');
    if (productsStartIdx !== -1) {
        let i = productsStartIdx;
        while (i < lines.length) {
            const variationIdx = lines.findIndex((l, idx) => idx > i && l.startsWith('Variation:'));
            if (variationIdx === -1) break;

            const rawName = lines[variationIdx - 1];
            const rawVariation = lines[variationIdx].replace('Variation: ', '').trim();
            const price = parseMoney(lines[variationIdx + 1]);
            const quantityStr = lines[variationIdx + 2];
            const quantity = parseInt(quantityStr);

            if (rawName && rawVariation && !isNaN(price) && !isNaN(quantity)) {
                result.items.push({
                    product_name: normalizeProductName(rawName),
                    variation: normalizeVariation(rawVariation),
                    price: price,
                    quantity: quantity
                });
            }
            i = variationIdx + 3;
        }
    }

    const extractMoney = (labels) => {
        for (const label of labels) {
            const idx = lines.findIndex(l => l.startsWith(label) || l === label);
            if (idx !== -1 && lines[idx + 1]) {
                const val = parseMoney(lines[idx + 1]);
                if (lines[idx + 1].startsWith('-')) return -Math.abs(val);
                return val;
            }
        }
        return 0;
    };

    result.fees.shipping_fee_paid_by_buyer = extractMoney(['Shipping Fee Paid by Buyer', 'Shipping Fee']);
    result.fees.transaction_fee = extractMoney(['Transaction Fee']);
    result.fees.service_fee = extractMoney(['Service Fee']);
    result.fees.commission_fee = extractMoney(['Commission Fee']);
    result.fees.support_program_fee = extractMoney(['Support Program Fee']);
    result.fees.tax = extractMoney(['Withholding Tax', 'Tax']);
    result.fees.estimated_shipping_fee = extractMoney(['Estimated Shipping Fee Charged by Logistic Provider', 'Shipping Fee Charged by Logistic Provider']);
    result.fees.shipping_fee_rebate = extractMoney(['Estimated Shipping Fee Rebate from Shopee', 'Shipping Fee Rebate From Shopee']);

    result.totals.merchandise_subtotal = extractMoney(['Merchandise Subtotal']);
    result.totals.estimated_income = extractMoney(['Estimated Order Income', 'Order Income', 'Final Amount']);

    const totalPaymentIdx = lines.findIndex(l => l === 'Total Buyer Payment');
    if (totalPaymentIdx !== -1) {
        result.totals.total_payment = parseMoney(lines[totalPaymentIdx + 1]);
    }

    return result;
}

const text = `Home
My Orders
Order Details
tela_phoria_textile_shop
Completed
Order ID
251031HVHGQH1T
Delivery Address
M******o, ******36
******ary School, Conalum, Argao, Visayas, Cebu, 6021
Logistic Information
Package 1: Standard LocalJ&T Express# 789886809697
DR_Decierdo, Job Revilla
+639512153914
Total 1 products
Parcel has been delivered to buyer
11/08/2025 17:12
Expand
Invoice
Order Invoice
Order Summary
mercycamello
Payment Information
No.
Product(s)
Unit Price
Quantity
Subtotal
1
Good Quality Geena Fabric/Gina Tela for Curtains, Valance, Table, Chair Cover, DIY for decoration
Variation: Lavender # 35,1 Yard = 36 Inches
29.00
20
580.00
Hide Income Details
Merchandise Subtotal
₱580.00
Product Price
₱580.00
Shipping Subtotal
₱0.00
Shipping Fee Paid by Buyer
₱0.00
Shipping Fee Charged by Logistic Provider
-₱171.00
Shipping Fee Rebate From Shopee
₱171.00
Fees & Charges
-₱47.68
Commission Fee
₱0.00
Service Fee 
-₱32.00
Transaction Fee 
-₱13.00
Withholding Tax 
-₱2.68
Order Income 
₱532.32
Order Adjustment
Adjustment Complete Date
Adjustment Reason
Released Amount
No adjustments have been made to this order.
 
Final Amount
₱532.32
Buyer Payment
Merchandise Subtotal
₱580.00
Shipping Fee
₱0.00
Shopee Voucher
-₱87.00
Seller Voucher
₱0.00
Total Buyer Payment
₱493.00
Add a Note
Order History
Fund transfer has completed
The payment has been successfully transferred.
11/16/2025 02:39
Completed
11/10/2025 07:31
Buyer confirmed order received
Order has been received and payment is being processed.
11/10/2025 07:31
New Order
10/31/2025 20:59
46`;

const parsed = parseShopeeOrderText(text);
console.log(JSON.stringify(parsed, null, 2));
