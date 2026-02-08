export interface ParsedShopeeOrder {
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
    shopee_voucher: number
    voucher_code: string | null
    date_paid: string | null
    date_shipped: string | null
    date_completed: string | null
    
    order_history: {
        title: string
        description: string | null
        timestamp: string
    }[]
    
    shipping_history: {
        description: string
        timestamp: string
    }[]

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
    // Remove "X Cancelled " or "X Return " prefixes (e.g. "2 Cancelled Geena Cloth...")
    // Regex matches: Start of string, one or more digits, whitespace, Status, whitespace
    let clean = name.replace(/^\d+\s+(Cancelled|Return|Refund)\s+/i, '');
    
    // Also handle just "Cancelled " or "Return " without number if that happens
    clean = clean.replace(/^(Cancelled|Return|Refund)\s+/i, '');

    return clean.trim();
}

// Helper to normalize variations
function normalizeVariation(variation: string): string {
    // 1. Clean up "Quantity" or "Batch" suffix
    let clean = variation.split(',')[0].trim();
    clean = clean.replace(/\s*#[a-zA-Z0-9\s]+$/, '').trim();

    // 2. Handle Reversed Format: "Color - Pattern" -> "Pattern Color"
    const match = clean.match(/^([^-]+)-\s*(.+)$/);
    if (match) {
        clean = `${match[2].trim()} ${match[1].trim()}`;
    }

    const lower = clean.toLowerCase();

    // 3. Specific Mappings
    if (lower.includes('noraisa')) return 'NORAISA'; // Map all Noraisa colors to single Inventory item
    if (lower === 'emerald green') return 'Emerald';
    if (lower === 'yellow gold') return 'Yellow Gold';

    return clean;
}

export function parseShopeeOrderText(text: string): ParsedShopeeOrder & { payout_status: string } {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
        order_id: null as string | null,
        status: null as string | null,
        payout_status: 'Pending', // Default
        buyer_address: null as string | null,
        buyer_username: null as string | null,
        order_date: null as string | null,
        date_completed: null as string | null,
        date_paid: null as string | null,
        date_shipped: null as string | null,
        tracking_number: null as string | null,
        shipping_provider: null as string | null,
        payment_method: null as string | null,
        shopee_voucher: 0,
        voucher_code: null as string | null,
        order_history: [] as { title: string, description: string | null, timestamp: string }[],
        shipping_history: [] as { description: string, timestamp: string }[],
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
        }
    };

    // ... (rest of text parser logic)

    // Helper to find money amount
    const parseMoney = (str: string | undefined) => {
        if (!str) return 0;
        // Handle negative amounts (e.g. -₱171.00)
        const isNegative = str.includes('-');
        const val = parseFloat(str.replace(/[^-0-9.]/g, ''));
        return isNaN(val) ? 0 : (isNegative && val > 0 ? -val : val);
    };

    // Extract Basic Info
    const orderIdIdx = lines.findIndex(l => l === 'Order ID');
    if (orderIdIdx !== -1) result.order_id = lines[orderIdIdx + 1];

    // Priority: Order Summary for Username
    const orderSummaryIdx = lines.findIndex(l => l === 'Order Summary');
    if (orderSummaryIdx !== -1) {
        let rawUsername = lines[orderSummaryIdx + 1];
        if (rawUsername) {
            // Clean up user comments or extra text
            // e.g. "joceryb28 -Eto ang username paps" -> "joceryb28"
            rawUsername = rawUsername.split(' -')[0].trim();
            result.buyer_username = rawUsername;
        }
    }

    // Fallback 1: Backwards Search from "Payment Information" (Most Reliable for Missing Order Summary)
    // Structure is usually: ... -> Username -> [Chat Now] -> [Collapse] -> Payment Information
    if (!result.buyer_username) {
        const paymentInfoIdx = lines.findIndex(l => l === 'Payment Information');
        if (paymentInfoIdx !== -1) {
            // Scan backwards up to 5 lines
            for (let i = 1; i <= 5; i++) {
                const idx = paymentInfoIdx - i;
                if (idx < 0) break;
                
                const candidate = lines[idx];
                if (!candidate) continue;

                const lower = candidate.toLowerCase();
                // Skip navigation/UI elements that might appear between Username and Payment Info
                const skipPhrases = [
                    'collapse', 
                    'chat now', 
                    'active', 
                    'view shop', 
                    'message', 
                    'products', // "Total X products"
                    'logistics',
                    'delivery'
                ];
                
                // If it matches a skip phrase, continue searching upwards
                if (skipPhrases.some(p => lower.includes(p))) continue;

                // Also use the main invalid list for safety
                const invalid = [
                    'courier assigned', 'kindly wait', 'parcel has been', 'standard delivery',
                    'j&t express', 'flash express', 'spx express', 'sender created', 'sender is preparing'
                ];
                
                if (invalid.some(p => lower.includes(p))) continue;

                // Basic validation
                const hasSpace = candidate.trim().includes(' ');
                const isTooLong = candidate.length > 30;
                const isTooShort = candidate.length < 3;

                // Found a candidate!
                if (!hasSpace && !isTooLong && !isTooShort) {
                    result.buyer_username = candidate.trim();
                    break;
                }
            }
        }
    }

    // Fallback 2: Search for username between "Total X products" and "Payment Information"
    if (!result.buyer_username) {
        const totalProductsIdx = lines.findIndex(l => l.match(/^Total \d+ products$/i));
        const paymentInfoIdx = lines.findIndex(l => l === 'Payment Information');
        
        if (totalProductsIdx !== -1 && paymentInfoIdx !== -1 && paymentInfoIdx > totalProductsIdx) {
            for (let i = totalProductsIdx + 1; i < paymentInfoIdx; i++) {
                const candidate = lines[i];
                if (!candidate) continue;

                const lower = candidate.toLowerCase();
                const invalid = [
                    'courier assigned', 
                    'kindly wait', 
                    'parcel has been', 
                    'payment information', 
                    'standard delivery',
                    'j&t express',
                    'flash express',
                    'spx express',
                    'delivery attempt',
                    'sender created',
                    'recipient',
                    'order details',
                    'collapse',
                    'expand',
                    'invoice',
                    'my orders',
                    'home',
                    'logistics information',
                    'delivery address'
                ];

                const hasInvalidPhrase = invalid.some(phrase => lower.includes(phrase));
                const isTooLong = candidate.length > 30;
                const hasSpace = candidate.trim().includes(' ');
                
                if (!hasInvalidPhrase && !isTooLong && !hasSpace) {
                    result.buyer_username = candidate.split(' -')[0].trim();
                    break;
                }
            }
        }
    }

    // Fallback 2: Search for username between "Order Invoice" and "Payment Information"
    // (In case "Order Summary" is missing but "Order Invoice" is present)
    if (!result.buyer_username) {
        const invoiceIdx = lines.findIndex(l => l === 'Order Invoice' || l === 'Invoice');
        const paymentInfoIdx = lines.findIndex(l => l === 'Payment Information');
        
        if (invoiceIdx !== -1 && paymentInfoIdx !== -1 && paymentInfoIdx > invoiceIdx) {
            for (let i = invoiceIdx + 1; i < paymentInfoIdx; i++) {
                const candidate = lines[i];
                if (!candidate) continue;

                const lower = candidate.toLowerCase();
                const invalid = ['courier', 'parcel', 'payment', 'delivery', 'address', 'invoice', 'summary'];
                const hasInvalidPhrase = invalid.some(phrase => lower.includes(phrase));
                const hasSpace = candidate.trim().includes(' ');

                if (!hasInvalidPhrase && !hasSpace && candidate.length > 3 && candidate.length < 30) {
                    result.buyer_username = candidate.trim();
                    break;
                }
            }
        }
    }

    const addressIdx = lines.findIndex(l => l === 'Delivery Address');
    if (addressIdx !== -1) {
        const recipientName = lines[addressIdx + 1];
        const addressLine = lines[addressIdx + 2];

        // Strict Separation Rule:
        // 1. Username is strictly from Order Summary (or distinct username sections).
        // 2. Address MUST contain Recipient Name + Address Line.
        // We do NOT use Recipient Name as a fallback for Username anymore.
        
        result.buyer_address = `${recipientName}\n${addressLine}`;
    }

    // Status
    // Scan first few lines for known statuses
    const knownStatuses = ['Unpaid', 'To Ship', 'Shipping', 'Shipped', 'Completed', 'Cancelled', 'Return', 'Refund', 'Delivery', 'Delivered'];
    let statusFound = null;
    for (let i = 0; i < Math.min(lines.length, 20); i++) { // Increased range to 20 lines to be safe
        const line = lines[i];
        
        // Priority Checks for Status
        if (line.includes('Cancelled') || line.includes('Cancellation')) {
            statusFound = 'Cancelled';
            break;
        }
        if (line.includes('Return') || line.includes('Refund')) {
            statusFound = 'Return/Refund';
            break;
        }
        
        if (knownStatuses.some(s => line.includes(s) || s === line)) {
            // Check if it's "Completed" or "Delivered"
            if (line.startsWith('Completed') || line.startsWith('Delivered')) {
                statusFound = line.split(' ')[0]; // Just take the status word
                break;
            }
            if (knownStatuses.includes(line)) {
                statusFound = line;
                break;
            }
        }
    }
    result.status = statusFound || (lines.length > 0 ? lines[0] : null);

    // Payout Status
    if (text.includes('Fund transfer has completed') || text.includes('The payment has been successfully transferred')) {
        result.payout_status = 'Transferred';
    }

    // Date Extraction
    // Look for date pattern MM/DD/YYYY HH:mm or DD/MM/YYYY HH:mm
    // Shopee uses DD/MM/YYYY mostly in PH.
    const dateRegex = /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/;
    
    // Improved Date Logic:
    // 1. Order Date -> "Order Time" or "New Order"
    // 2. Paid Date -> "Payment Time" or "Fund transfer has completed" or "The payment has been successfully transferred."
    // 3. Completed Date -> "Completed"
    
    const findDateAfter = (trigger: string, useLast = false): string | null => {
        let idx = -1;
        if (useLast) {
            // Polyfill findLastIndex if needed or just iterate backwards
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].includes(trigger)) {
                    idx = i;
                    break;
                }
            }
        } else {
            idx = lines.findIndex(l => l.includes(trigger));
        }

        if (idx !== -1) {
            // Check next few lines for a date
            for (let k = 1; k <= 3; k++) {
                if (lines[idx + k] && dateRegex.test(lines[idx + k])) {
                     try {
                        const d = new Date(lines[idx + k]);
                        if (isNaN(d.getTime())) {
                             // Try parsing manually if Date constructor fails
                             // Assuming MM/DD/YYYY HH:mm
                             const parts = lines[idx + k].split(/[\/\s:]/).filter(p => p); // filter empty
                             if (parts.length >= 5) {
                                 const iso = `${parts[2]}-${parts[0]}-${parts[1]}T${parts[3]}:${parts[4]}:00.000Z`;
                                 const d2 = new Date(iso);
                                 if (!isNaN(d2.getTime())) return d2.toISOString();
                             }
                             continue; 
                        }
                        return d.toISOString();
                     } catch (e) { continue; }
                }
            }
        }
        return null;
    }

    result.order_date = findDateAfter('Order Time') || findDateAfter('New Order') || new Date().toISOString();
    result.date_paid = findDateAfter('Payment Time') || findDateAfter('The payment has been successfully transferred');
    result.date_completed = findDateAfter('Completed Time') || findDateAfter('Completed', true); // Use last occurrence for Completed
    
    // Fallback if order_date is still today (and not found in text) but we found other dates, maybe pick the earliest?
    // Actually finding 'New Order' usually works.

    // --- New Fields Extraction ---

    // 1. Logistic Information
    const logisticIdx = lines.findIndex(l => l.includes('Logistic Information'));
    if (logisticIdx !== -1) {
        // A. Extract Provider & Tracking Number
        for (let i = logisticIdx + 1; i < Math.min(logisticIdx + 20, lines.length); i++) {
            const line = lines[i];
            
            // Clean extraction for mixed lines like "Package 1: Standard LocalSPX Express# PH..."
            if (line.includes('Express') || line.includes('J&T') || line.includes('SPX') || line.includes('Flash') || line.includes('XDE')) {
                let provider = line;
                if (line.includes('Standard LocalSPX Express')) provider = 'SPX Express';
                else if (line.includes('J&T Express')) provider = 'J&T Express';
                else if (line.includes('Flash Express')) provider = 'Flash Express';
                else if (line.includes('XDE')) provider = 'XDE';
                
                result.shipping_provider = provider;
            }
            
            // Tracking Number usually starts with # or is just alphanumeric
            if (line.includes('#')) {
                const match = line.match(/#\s*([A-Z0-9]+)/i);
                if (match) {
                    result.tracking_number = match[1];
                }
            }
        }

        // B. Extract Shipping History
        // Find start point: "Total X products" which usually precedes the history list
        let historyStartIdx = -1;
        for (let i = logisticIdx + 1; i < Math.min(logisticIdx + 20, lines.length); i++) {
             if (lines[i].match(/^Total \d+ products$/i)) {
                 historyStartIdx = i + 1;
                 break;
             }
        }

        if (historyStartIdx !== -1) {
            let buffer: string[] = [];
            for (let i = historyStartIdx; i < lines.length; i++) {
                const line = lines[i];
                // Date Pattern: MM/DD/YYYY HH:mm
                const dateMatch = line.match(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/);
                
                if (dateMatch) {
                    if (buffer.length > 0) {
                        const description = buffer.join(' ');
                        result.shipping_history.push({
                            description: description,
                            timestamp: line
                        });
                    }
                    buffer = [];
                } else {
                     // Stop conditions
                     if (line.startsWith('Order ID')) break; 
                     buffer.push(line);
                }
            }
        }
    }

    // 2. Payment Method
    const payMethodIdx = lines.findIndex(l => l === 'Payment Method');
    if (payMethodIdx !== -1) {
        result.payment_method = lines[payMethodIdx + 1];
    }

    // 3. Shopee Voucher
    // Look for "Shopee Voucher" line and get amount
    const voucherIdx = lines.findIndex(l => l === 'Shopee Voucher');
    if (voucherIdx !== -1) {
        result.shopee_voucher = parseMoney(lines[voucherIdx + 1]);
    }

    // 4. Order History Dates (Removed - merged with Date Extraction above)
    // --- End New Fields Extraction ---

    // Extract Products
    const productsStartIdx = lines.findIndex(l => l === 'Product(s)');
    if (productsStartIdx !== -1) {
        let i = productsStartIdx + 1;
        let currentItemIndex = 1;

        while (i < lines.length) {
            // Stop if we hit financials
            if (lines[i].includes('Income Details') || lines[i].includes('Merchandise Subtotal')) break;

            // Look for the item index (e.g., "1", "2", "3")
            if (lines[i] === String(currentItemIndex)) {
                // Found start of item
                const productName = lines[i+1];
                
                // Safety check
                if (!productName) {
                    i++; 
                    continue;
                }

                // FORCE CHECK STATUS FROM PRODUCT NAME (e.g. "2 Cancelled Geena Cloth")
                // This is critical because sometimes status is not found in top 20 lines
                if (productName.includes('Cancelled') || productName.includes('Return') || productName.includes('Refund')) {
                     if (!result.status || (!result.status.includes('Cancelled') && !result.status.includes('Return') && !result.status.includes('Refund'))) {
                         if (productName.includes('Cancelled')) result.status = 'Cancelled';
                         else if (productName.includes('Return') || productName.includes('Refund')) result.status = 'Return/Refund';
                     }
                }

                let variation = 'No Variation'; // Default
                let priceIdx = i + 2;

                // Check if next line is Variation
                // Be careful: "Variation:" line vs Price line
                if (lines[i+2] && lines[i+2].startsWith('Variation:')) {
                    variation = lines[i+2].replace('Variation: ', '').trim();
                    priceIdx = i + 3;
                }

                // Check if priceIdx line is a number (Price)
                const priceStr = lines[priceIdx];
                const price = parseMoney(priceStr);
                
                // Quantity is next
                const quantityStr = lines[priceIdx + 1];
                const quantity = parseInt(quantityStr);

                if (!isNaN(price) && !isNaN(quantity)) {
                    result.items.push({
                        product_name: normalizeProductName(productName),
                        variation: normalizeVariation(variation),
                        price: price,
                        quantity: quantity
                    });
                    currentItemIndex++; // Expect next item
                    i = priceIdx + 2; // Advance index
                    continue;
                }
            }
            i++;
        }
    }

    // Helper for finance logic
    const extractMoney = (labels: string[], findAll = false) => {
        const values: number[] = [];
        for (const label of labels) {
            // If findAll is true, we look for all occurrences
            if (findAll) {
                for (let i = 0; i < lines.length; i++) {
                    if ((lines[i].startsWith(label) || lines[i] === label) && lines[i+1]) {
                        const val = parseMoney(lines[i+1]);
                        values.push(lines[i+1].startsWith('-') ? -Math.abs(val) : val);
                    }
                }
            } else {
                const idx = lines.findIndex(l => l.startsWith(label) || l === label);
                if (idx !== -1 && lines[idx + 1]) {
                    // Check if the next line is a date (e.g. 18/01/2026) which happens in Adjustment sections
                    // If it is a date, skip it and look at the next line
                    let valueLine = lines[idx + 1];
                    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/; // Simple DD/MM/YYYY check
                    
                    if (dateRegex.test(valueLine) && lines[idx + 2]) {
                         // It's a date! Look further down.
                         // Pattern: Label -> Date -> Reason -> Amount
                         // Released Amount -> 18/01/2026 -> Return Refund... -> ₱26.86
                         // Or sometimes: Released Amount -> No adjustments...
                         
                         // Try to find the money line in the next 3 lines
                         for(let k=1; k<=3; k++) {
                             const candidate = lines[idx+k];
                             if (!candidate) continue;

                             // Check if it's "No adjustments" text first
                             if (candidate.includes('No adjustments')) return 0;
                             
                             // Check for currency symbol or if it parses to a valid number
                             if (candidate.includes('₱') || (!isNaN(parseFloat(candidate)) && /[\d.]+/.test(candidate))) {
                                 const val = parseMoney(candidate);
                                 // Additional check: Ensure it's not a date again
                                 if (!dateRegex.test(candidate)) {
                                     if (candidate.startsWith('-')) return -Math.abs(val);
                                     return val;
                                 }
                             }
                         }
                    }

                    // Handle "No adjustments" case directly
                    if (valueLine.includes('No adjustments')) return 0;

                    const val = parseMoney(valueLine);
                    if (valueLine.startsWith('-')) {
                        return -Math.abs(val);
                    }
                    return val;
                }
            }
        }
        if (findAll && values.length > 0) {
            // Return the one with largest absolute value usually? 
            // Or typically for Merchandise Subtotal, we want the positive non-zero one.
            return values.reduce((max, current) => (Math.abs(current) > Math.abs(max) ? current : max), 0);
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

    // Totals
    // Use findAll=true for Merchandise Subtotal to avoid picking up 0.00 from "Hide Income Details" in refunds
    result.totals.merchandise_subtotal = extractMoney(['Merchandise Subtotal'], true);
    
    // Income Logic: Prioritize "Final Amount" if present (handles refunds/adjustments), else use "Order Income"
    const finalAmount = extractMoney(['Final Amount']);
    const orderIncome = extractMoney(['Estimated Order Income', 'Order Income']);
    const releasedAmount = extractMoney(['Released Amount']);
    
    // If Final Amount is found and non-zero (or explicitly 0), use it. 
    // Usually Final Amount appears at the end of calculation.
    if (lines.some(l => l.includes('Final Amount'))) {
        result.totals.estimated_income = finalAmount;
    } else if (lines.some(l => l.includes('Released Amount'))) {
        // Fallback for Adjustments where "Final Amount" might be missing but "Released Amount" is present
        result.totals.estimated_income = releasedAmount;
    } else {
        result.totals.estimated_income = orderIncome;
    }

    // Total Buyer Payment
    const totalPaymentIdx = lines.findIndex(l => l === 'Total Buyer Payment');
    if (totalPaymentIdx !== -1) {
        result.totals.total_payment = parseMoney(lines[totalPaymentIdx + 1]);
    } else {
        // Fallback for collapsed view: "Buyer Payment" followed by amount
        const buyerPaymentIdx = lines.findIndex(l => l === 'Buyer Payment');
        if (buyerPaymentIdx !== -1 && lines[buyerPaymentIdx + 1]) {
            const potentialAmount = lines[buyerPaymentIdx + 1];
            // Check if it looks like money (starts with currency or is a number)
            // AND ensure it's NOT "Merchandise Subtotal" (which happens in expanded view)
            if ((potentialAmount.includes('₱') || /^\d/.test(potentialAmount)) && 
                !potentialAmount.includes('Merchandise Subtotal')) {
                result.totals.total_payment = parseMoney(potentialAmount);
            }
        }
    }

    // 5. Order History
    const historyIdx = lines.findIndex(l => l === 'Order History');
    if (historyIdx !== -1) {
        let buffer: string[] = [];
        // Start from next line
        for (let i = historyIdx + 1; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if line is a date (MM/DD/YYYY HH:mm or DD/MM/YYYY HH:mm)
            const dateMatch = line.match(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/);
            
            if (dateMatch) {
                // End of an event block
                if (buffer.length > 0) {
                    const title = buffer[0];
                    const description = buffer.length > 1 ? buffer.slice(1).join(' ') : null;
                    
                    result.order_history.push({
                        title: title,
                        description: description,
                        timestamp: line
                    });
                }
                buffer = []; // Reset buffer
            } else {
                // Check for stop keywords if needed
                // If line starts with "Order ID" it means we hit the next order (if pasted multiple)
                if (line.startsWith('Order ID')) break;

                buffer.push(line);
            }
        }
    }

    return result;
}

export function mergeParsedOrders(orders: ParsedShopeeOrder[]): ParsedShopeeOrder {
    const merged: ParsedShopeeOrder = {
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
        },
        tracking_number: null,
        shipping_provider: null,
        payment_method: null,
        shopee_voucher: 0,
        voucher_code: null,
        date_paid: null,
        date_shipped: null,
        date_completed: null,
        order_history: [],
        shipping_history: []
    };

    const uniqueItems = new Map<string, any>();

    for (const order of orders) {
        if (!merged.order_id && order.order_id) merged.order_id = order.order_id;
        
        if (order.status) {
            if (!merged.status) merged.status = order.status;
            else if (['Cancelled', 'Return/Refund', 'Cancellation'].some(s => order.status!.includes(s)) && 
                     !['Cancelled', 'Return/Refund', 'Cancellation'].some(s => merged.status!.includes(s))) {
                merged.status = order.status;
            }
        }
        
        if (order.payout_status === 'Transferred') merged.payout_status = 'Transferred';

        if (order.buyer_address) merged.buyer_address = order.buyer_address;
        if (order.buyer_username) merged.buyer_username = order.buyer_username;
        if (order.order_date) merged.order_date = order.order_date;
        
        if (order.tracking_number) merged.tracking_number = order.tracking_number;
        if (order.shipping_provider) merged.shipping_provider = order.shipping_provider;
        if (order.payment_method) merged.payment_method = order.payment_method;
        if (order.voucher_code) merged.voucher_code = order.voucher_code;
        
        if (order.date_paid) merged.date_paid = order.date_paid;
        if (order.date_shipped) merged.date_shipped = order.date_shipped;
        if (order.date_completed) merged.date_completed = order.date_completed;

        if (order.order_history && order.order_history.length > 0) {
            if (merged.order_history.length === 0 || order.order_history.length > merged.order_history.length) {
                merged.order_history = order.order_history;
            }
        }

        if (order.shipping_history && order.shipping_history.length > 0) {
            if (merged.shipping_history.length === 0 || order.shipping_history.length > merged.shipping_history.length) {
                merged.shipping_history = order.shipping_history;
            }
        }

        if (order.shopee_voucher !== 0) merged.shopee_voucher = order.shopee_voucher;
        
        (Object.keys(merged.fees) as Array<keyof typeof merged.fees>).forEach(key => {
            if (order.fees[key] !== 0) merged.fees[key] = order.fees[key];
        });
        
        (Object.keys(merged.totals) as Array<keyof typeof merged.totals>).forEach(key => {
            if (order.totals[key] !== 0) merged.totals[key] = order.totals[key];
        });
        
        order.items.forEach(item => {
            const sig = JSON.stringify(item);
            uniqueItems.set(sig, item);
        });
    }
    
    merged.items = Array.from(uniqueItems.values());
    
    return merged;
}

