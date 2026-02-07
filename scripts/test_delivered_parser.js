// Mock normalization logic to verify locally
function normalizeVariation(variation) {
    let clean = variation.split(',')[0].trim();
    clean = clean.replace(/\s*#[a-zA-Z0-9]+$/, '').trim();

    const match = clean.match(/^([^-]+)-\s*(.+)$/);
    if (match) {
        clean = `${match[2].trim()} ${match[1].trim()}`;
    }

    const lower = clean.toLowerCase();
    if (lower === 'emerald green') return 'Emerald';
    if (lower === 'yellow gold') return 'Yellow Gold';

    return clean;
}

function parseOrder(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
        order_id: null,
        status: null,
        items: []
    };

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

    const productsStartIdx = lines.findIndex(l => l === 'Product(s)');
    if (productsStartIdx !== -1) {
        let i = productsStartIdx;
        while (i < lines.length) {
            const variationIdx = lines.findIndex((l, idx) => idx > i && l.startsWith('Variation:'));
            if (variationIdx === -1) break;

            const rawVariation = lines[variationIdx].replace('Variation: ', '').trim();

            result.items.push({
                variation: normalizeVariation(rawVariation),
                raw: rawVariation
            });
            i = variationIdx + 3;
            if (lines[i] && (lines[i].includes('Income Details') || lines[i].includes('Merchandise Subtotal'))) break;
        }
    }
    return result;
}

const sampleText = `Home
My Orders
Order Details
tela_phoria_textile_shop
Delivered
Order has been delivered to buyer. Escrow will be released by 01/23/2026 (Fri).
What you can do next
Order ID
260112T7V6049M
Delivery Address
...
Logistic Information
...
Product(s)
Unit Price
Quantity
Subtotal
1
Geena Cloth Per Yard...
Variation: Yellow Gold #62,1 Yard = 36 Inches
29.00
10
290.00
2
Geena Cloth Per Yard...
Variation: Emerald Green #15,1 Yard = 36 Inches
29.00
4
116.00
Hide Income Details`;

const parsed = parseOrder(sampleText);
console.log(JSON.stringify(parsed, null, 2));
