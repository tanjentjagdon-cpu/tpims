// const { parseShopeeOrderText } = require('../src/lib/shopee-parser'); // logic is mocked below

const sampleText = `Home
My Orders
Order Details
tela_phoria_textile_shop
Completed
No rating received
Order ID
251104U9RVXAP9
Delivery Address
E******e, ******52
******gsacan, Dingalan, North Luzon, Aurora, 3207
Logistic Information
Package 1: Standard LocalSPX Express# PH256831097328U
Reymundo
+639454959819
Total 1 products
Parcel has been delivered to buyer
11/05/2025 13:23
Expand
Invoice
Order Invoice
Order Summary
xm_ytffss2
Payment Information
No.
Product(s)
Unit Price
Quantity
Subtotal
1
Geena Cloth Per Yard/ Tela for Curtain, Valance, Birthday Decor, Table/ Chair Cover, or DIY projects
Variation: Light Pink #04,1 Yard = 36 Inches
29.00
11
319.00
Hide Income Details
Merchandise Subtotal
₱319.00
Product Price
₱319.00
Shipping Subtotal
₱0.00
Shipping Fee Paid by Buyer
₱0.00
Shipping Fee Charged by Logistic Provider
-₱290.00
Shipping Fee Rebate From Shopee
₱290.00
Fees & Charges
-₱26.47
Commission Fee
₱0.00
Service Fee 
-₱18.00
Transaction Fee 
-₱7.00
Withholding Tax 
-₱1.47
Order Income 
₱292.53
Order Adjustment
Adjustment Complete Date
Adjustment Reason
Released Amount
No adjustments have been made to this order.
 
Final Amount
₱292.53
Buyer Payment
Merchandise Subtotal
₱319.00
Shipping Fee
₱0.00
Shopee Voucher
₱0.00
Seller Voucher
₱0.00
Total Buyer Payment
₱319.00
Add a Note
Order History
Fund transfer has completed
The payment has been successfully transferred.
11/12/2025 22:43
Buyer confirmed order received
Order has been received and payment is being processed.
11/08/2025 15:17
Completed
11/08/2025 15:17
New Order
11/04/2025 14:50`;

// Mocking required internal logic since we can't import TS directly in JS script easily without compilation
// We will replicate the logic here for testing purposes or try to run ts-node if available.
// Since environment is uncertain, I'll rewrite the parser logic here for verification to ensure the logic itself holds.

function normalizeProductName(name) {
    const lower = name.toLowerCase();
    if (lower.includes('printed geena cloth')) return 'Geena Cloth Printed';
    if (lower.includes('geena cloth per yard')) return 'Geena Cloth';
    return name;
}

function normalizeVariation(variation) {
    let clean = variation.split(',')[0].trim();
    // 2. Remove specific codes like "#04" 
    clean = clean.replace(/\s*#[a-zA-Z0-9]+$/, '').trim();

    const match = clean.match(/^([^-]+)-\s*(.+)$/);
    if (match) {
        return `${match[2].trim()} ${match[1].trim()}`;
    }
    return clean;
}

function parseOrder(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
        order_id: null,
        status: null,
        payout_status: 'Pending',
        items: [],
        totals: { estimated_income: 0 }
    };

    const orderIdIdx = lines.findIndex(l => l === 'Order ID');
    if (orderIdIdx !== -1) result.order_id = lines[orderIdIdx + 1];

    if (lines.length > 0) result.status = lines[0];

    if (text.includes('Fund transfer has completed') || text.includes('The payment has been successfully transferred')) {
        result.payout_status = 'Transferred';
    }

    const productsStartIdx = lines.findIndex(l => l === 'Product(s)');
    if (productsStartIdx !== -1) {
        let i = productsStartIdx;
        while (i < lines.length) {
            const variationIdx = lines.findIndex((l, idx) => idx > i && l.startsWith('Variation:'));
            if (variationIdx === -1) break;

            const rawName = lines[variationIdx - 1];
            const rawVariation = lines[variationIdx].replace('Variation: ', '').trim();

            result.items.push({
                product_name: normalizeProductName(rawName),
                variation: normalizeVariation(rawVariation),
                raw_variation: rawVariation
            });
            i = variationIdx + 3;
            if (lines[i] && (lines[i].includes('Income Details') || lines[i].includes('Merchandise Subtotal'))) break;
        }
    }

    // Extract Income
    // Look for 'Order Income' or 'Final Amount'
    const incomeIdx = lines.findIndex(l => l === 'Order Income');
    if (incomeIdx !== -1) result.totals.estimated_income = lines[incomeIdx + 1];

    return result;
}

const parsed = parseOrder(sampleText);
console.log(JSON.stringify(parsed, null, 2));
