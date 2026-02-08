function parseShopeeOrderText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
        order_id: null,
        items: []
    };

    // Extract Order ID
    const orderIdIdx = lines.findIndex(l => l === 'Order ID');
    if (orderIdIdx !== -1) result.order_id = lines[orderIdIdx + 1];

    // Extract Products
    const productsStartIdx = lines.findIndex(l => l === 'Product(s)');
    if (productsStartIdx !== -1) {
        let i = productsStartIdx + 1; // Start searching after 'Product(s)'
        
        // Skip header row if present (Unit Price, Quantity, Subtotal)
        // Usually these are separate lines.
        // Let's just iterate and look for "No." or just start scanning.
        // The structure usually has "No." then "Product(s)" ...
        // The provided text has:
        // Payment Information 
        // No. 
        // Product(s) 
        // Unit Price 
        // Quantity 
        // Subtotal 
        // 1 
        // Product Name ...

        // We can look for lines that are strictly numbers (1, 2, 3...) which denote the start of an item.
        // But we must be careful not to match Quantity or Price or Date.
        // Usually "No." column is sequential 1, 2, 3.
        
        let currentItemIndex = 1;

        while (i < lines.length) {
            // Stop if we hit financials
            if (lines[i].includes('Income Details') || lines[i].includes('Merchandise Subtotal')) break;

            // Look for the item index
            if (lines[i] === String(currentItemIndex)) {
                // Found start of item
                const productName = lines[i+1];
                let variation = null;
                let priceIdx = i + 2;

                // Check if next line is Variation
                if (lines[i+2].startsWith('Variation:')) {
                    variation = lines[i+2].replace('Variation: ', '').trim();
                    priceIdx = i + 3;
                }

                // Check if priceIdx line is a number (Price)
                // Price might be "39.00" or "₱39.00"
                const priceStr = lines[priceIdx];
                const price = parseFloat(priceStr.replace(/[^-0-9.]/g, ''));
                
                // Quantity is next
                const quantityStr = lines[priceIdx + 1];
                const quantity = parseInt(quantityStr);

                if (productName && !isNaN(price) && !isNaN(quantity)) {
                    result.items.push({
                        product_name: productName,
                        variation: variation || 'No Variation', // Mark as No Variation
                        price,
                        quantity
                    });
                    currentItemIndex++; // Expect next item
                    i = priceIdx + 2; // Advance index
                    continue;
                }
            }
            i++;
        }
    }
    return result;
}

const text = `Home 
 My Orders 
 Order Details 
 tela_phoria_textile_shop 
 Completed 
 Order ID 
 251030EMXU4GVB 
 Delivery Address 
 J******e, ******20 
 ******, Sampaloc, Metro Manila, Metro Manila, 1000 
 Logistic Information 
 Package 1: Standard LocalSPX Express# PH2547661398739 
 Jashley Mcaine 
 +639151138604 
 Total 1 products 
 Parcel has been delivered to buyer 
 10/31/2025 16:11 
 Expand 
 Invoice 
 Order Invoice 
 Order Summary 
 joceryb28 
 Payment Information 
 No. 
 Product(s) 
 Unit Price 
 Quantity 
 Subtotal 
 1 
 Good Quality Geena Fabric/Gina Tela for Curtains, Valance, Table, Chair Cover, DIY for decoration 
 39.00 
 3 
 117.00 
 Hide Income Details 
 Merchandise Subtotal 
 ₱117.00 
 Product Price 
 ₱117.00 
 Shipping Subtotal 
 ₱0.00 
 Shipping Fee Paid by Buyer 
 ₱0.00 
 Shipping Fee Charged by Logistic Provider 
 -₱36.00 
 Shipping Fee Rebate From Shopee 
 ₱36.00 
 Fees & Charges 
 -₱10.54 
 Commission Fee 
 ₱0.00 
 Service Fee  
 -₱7.00 
 Transaction Fee  
 -₱3.00 
 Withholding Tax  
 -₱0.54 
 Order Income  
 ₱106.46 
 Order Adjustment 
 Adjustment Complete Date 
 Adjustment Reason 
 Released Amount 
 No adjustments have been made to this order. 
 Final Amount 
 ₱106.46 
 Buyer Payment 
 ₱117.00 
 Order History 
 Fund transfer has completed 
 The payment has been successfully transferred. 
 11/07/2025 20:02 
 Buyer confirmed order received 
 Order has been received and payment is being processed. 
 11/03/2025 16:27 
 Completed 
 11/03/2025 16:27 
 New Order 
 10/30/2025 14:05 
 23`;

try {
    const result = parseShopeeOrderText(text);
    console.log(JSON.stringify(result, null, 2));
} catch (e) {
    console.error(e);
}
