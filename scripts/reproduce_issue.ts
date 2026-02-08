
import { parseShopeeOrderText } from '../src/lib/shopee-parser';

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
