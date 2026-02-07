const SAMPLE_TEXT = `
Shipped
Order is being shipped to buyer.
Order ID
2601179R6PBVAY
Delivery Address
N******Y, ******83
Alimango Elementary School, Alimango, Escalante City, Visayas, Negros Occidental, 6124
Logistic Information
Package 1: Standard LocalSPX Express# PH262086194702Z
Total 1 products
Parcel has departed from sorting facility
01/19/2026 05:28
Expand
neleneuy
Payment Information
No.
Product(s)
Unit Price
Quantity
Subtotal
1
Printed Geena Cloth Per Yard/ Tela 4 Curtain, Valance, Birthday Decor, Table Cover, or DIY projects
Variation: Red- Drake
39.00
20
780.00
Hide Income Details
Merchandise Subtotal
₱780.00
Product Price
₱780.00
Estimated Shipping Subtotal
₱0.00
Shipping Fee Paid by Buyer
₱0.00
Estimated Shipping Fee Charged by Logistic Provider
-₱171.00
Estimated Shipping Fee Rebate from Shopee
₱171.00
Fees & Charges
-₱66.60
Commission Fee
₱0.00
Support Program Fee
-₱2.00
Service Fee 
-₱44.00
Transaction Fee 
-₱17.00
Withholding Tax 
-₱3.60
Estimated Order Income 
₱713.40
Order Adjustment
Adjustment Complete Date
Adjustment Reason
Released Amount
No adjustments have been made to this order.
 
Final Amount
₱713.40
Buyer Payment
Merchandise Subtotal
₱780.00
Shipping Fee
₱0.00
Shopee Voucher
₱0.00
Seller Voucher
₱0.00
Total Buyer Payment
₱780.00
`;

function parseOrder(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
        order_id: null,
        status: null,
        buyer_address: null,
        items: [],
        fees: {},
        totals: {}
    };

    // Helper to find value after label
    const findValue = (label) => {
        const idx = lines.findIndex(l => l.includes(label));
        return idx !== -1 && lines[idx + 1] ? lines[idx + 1] : null;
    };

    // Helper to find money amount
    const parseMoney = (str) => {
        if (!str) return 0;
        return parseFloat(str.replace(/[^-0-9.]/g, ''));
    };

    // Extract Basic Info
    const orderIdIdx = lines.findIndex(l => l === 'Order ID');
    if (orderIdIdx !== -1) result.order_id = lines[orderIdIdx + 1];

    const addressIdx = lines.findIndex(l => l === 'Delivery Address');
    // Address often spans multiple lines or is 2 lines below (Name, then Address)
    if (addressIdx !== -1) {
        // usually name is next, then address
        result.buyer_username = lines[addressIdx + 1]; // obfuscated name
        result.buyer_address = lines[addressIdx + 2];
    }

    // Status (usually first line)
    result.status = lines[0];

    // Extract Products
    // Pattern: No. -> Product(s) -> ... -> 1 -> Name -> Variation -> Price -> Qty -> Subtotal
    const productsStartIdx = lines.findIndex(l => l === 'Product(s)');
    if (productsStartIdx !== -1) {
        let i = productsStartIdx;
        while (i < lines.length) {
            // simpler approach: search for numbered items "1", "2" etc or "Variation:"
            // The structure seems to be: 
            // 1
            // Name
            // Variation: ...
            // Price
            // Qty
            // Subtotal
            // Check for "Variation:" and look backwards for Name
            const variationIdx = lines.findIndex((l, idx) => idx > i && l.startsWith('Variation:'));
            if (variationIdx === -1) break; // no more items? or single item without variation?

            // Assuming structure from sample
            const variation = lines[variationIdx].replace('Variation: ', '').trim();
            const name = lines[variationIdx - 1];
            const price = parseMoney(lines[variationIdx + 1]);
            const quantity = parseInt(lines[variationIdx + 2]);

            result.items.push({
                product_name: name,
                variation: variation,
                price: price,
                quantity: quantity
            });

            i = variationIdx + 3; // move past

            // Stop if we hit "Hide Income Details" or "Income Details"
            if (lines[i] && (lines[i].includes('Income Details') || lines[i].includes('Merchandise Subtotal'))) {
                break;
            }
            // Need loop for multiple items. search next variation...
            const nextVarIdx = lines.slice(i).findIndex(l => l.startsWith('Variation:'));
            if (nextVarIdx === -1) break;
        }
    }

    // Money extraction helper for labeled rows
    const extractMoney = (label) => {
        const idx = lines.findIndex(l => l.startsWith(label) || l === label);
        if (idx !== -1) {
            // Value could be next line or same line if separated by tabs (but split by newline here)
            // In the sample, value is distinctly on the next line usually
            // Specially for "Estimated Order Income" -> line after
            return parseMoney(lines[idx + 1]);
        }
        return 0;
    }

    // Extract Financials
    result.fees.shipping_fee_paid_by_buyer = extractMoney('Shipping Fee Paid by Buyer');
    result.fees.transaction_fee = extractMoney('Transaction Fee');
    result.fees.service_fee = extractMoney('Service Fee');
    result.fees.commission_fee = extractMoney('Commission Fee');
    result.fees.support_program_fee = extractMoney('Support Program Fee');
    result.fees.tax = extractMoney('Withholding Tax'); // OR "Tax"
    result.fees.estimated_shipping_fee = extractMoney('Estimated Shipping Fee Charged by Logistic Provider');

    result.totals.merchandise_subtotal = extractMoney('Merchandise Subtotal');
    result.totals.estimated_income = extractMoney('Estimated Order Income');

    // Total Buyer Payment
    const totalPaymentIdx = lines.findIndex(l => l === 'Total Buyer Payment');
    if (totalPaymentIdx !== -1) {
        result.totals.total_payment = parseMoney(lines[totalPaymentIdx + 1]);
    }

    return result;
}

const parsed = parseOrder(SAMPLE_TEXT);
console.log(JSON.stringify(parsed, null, 2));
