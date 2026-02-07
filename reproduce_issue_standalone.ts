
// Mock logic
function parseShopeeOrderText(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const result = {
        order_history: [] as { title: string, description: string | null, timestamp: string }[],
    };

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
                if (line.startsWith('Order ID')) break;

                buffer.push(line);
            }
        }
    }
    return result;
}

const text = `
Order ID 241106U5X9F3Q1
Order Summary
joceryb28
Delivery Address
Juan Dela Cruz
123 Main St, Manila
Product(s)
1
Geena Cloth
Variation: Plain
₱100.00
1
Order History 
 Fund transfer has completed 
 The payment has been successfully transferred. 
 11/23/2025 01:05 
 Buyer confirmed order received 
 Order has been received and payment is being processed. 
 11/18/2025 23:48 
 Completed 
 11/18/2025 23:48 
 New Order 
 11/06/2025 18:20 
`;

const result = parseShopeeOrderText(text);
console.log("Order History:", JSON.stringify(result.order_history, null, 2));
