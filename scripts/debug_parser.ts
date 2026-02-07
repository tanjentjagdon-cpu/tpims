
import { parseShopeeOrderText } from '../src/lib/shopee-parser';

const text = `
Home 
 My Orders 
 Order Details 
 tela_phoria_textile_shop 
 Completed 
 No rating received 
 Order ID 
 2601155D6RCCBH 
 Delivery Address 
 E******r, ******70 
 11206T. Reyes St , Paners Compound, Mayondon, Mayondon, Los Banos, South Luzon, Laguna, 4030 
 Logistic Information 
 Package 1: Standard LocalSPX Express# PH268996111773I 
 John Christian 
 +639213590402 
 Total 1 products 
 Parcel has been delivered to buyer 
 01/17/2026 20:51 
 Expand 
 ellatagsip02 
 Payment Information 
 No. 
 Product(s) 
 Unit Price 
 Quantity 
 Subtotal 
 1 
 1 Return/Refund Printed Geena Cloth Per Yard/ Tela 4 Curtain, Valance, Birthday Decor, Table Cover, or DIY projects 
 Variation: Black #17 
 29.00 
 1 
 29.00 
 Hide Income Details 
 Merchandise Subtotal 
 ₱0.00 
 Product Price 
 ₱29.00 
 Refund Amount 
 -₱29.00 
 Shipping Subtotal 
 ₱0.00 
 Shipping Fee Paid by Buyer 
 ₱0.00 
 Shipping Fee Charged by Logistic Provider 
 -₱36.00 
 Shipping Fee Rebate From Shopee 
 ₱25.00 
 Shipping Fee Support Program Savings 
 ₱11.00 
 Fees & Charges 
 -₱3.00 
 Commission Fee 
 ₱0.00 
 Support Program Fee 
 -₱2.00 
 Service Fee 
 ₱0.00 
 Transaction Fee 
 -₱1.00 
 Order Income 
 -₱3.00 
 Order Adjustment 
 Adjustment Complete Date 
 Adjustment Reason 
 Released Amount 
 18/01/2026 
 Return Refund Adjustment/Compensation 
 ₱26.86 
 Total Adjustment Amount 
 ₱26.86 
  
 Final Amount 
 ₱23.86 
 Buyer Payment 
 Merchandise Subtotal 
 ₱29.00 
 Shipping Fee 
 ₱11.00 
 Shopee Voucher 
 ₱0.00 
 Seller Voucher 
 ₱0.00 
 Total Buyer Payment 
 ₱40.00 
 Add a Note 
 Order History 
 Fund transfer has completed 
 The payment has been successfully transferred. 
 01/18/2026 08:30 
 Completed 
 01/18/2026 08:30 
 Buyer confirmed order received 
 Order has been received and payment is being processed. 
 01/18/2026 08:30 
 New Order 
 01/15/2026 22:20 
 69 
`;

const lines = text.split('\n').map(l => l.trim()).filter(l => l);

console.log('--- Debug Lines ---');
const idx = lines.findIndex(l => l.includes('The payment has been successfully transferred'));
console.log('Index of payment trigger:', idx);
if (idx !== -1) {
    console.log('Line[idx]:', lines[idx]);
    console.log('Line[idx+1]:', lines[idx+1]);
    console.log('Line[idx+2]:', lines[idx+2]);
}

const completedIdx = lines.findIndex(l => l.includes('Completed')); // First one
console.log('First Completed Index:', completedIdx);

// Find last Completed
let lastCompletedIdx = -1;
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('Completed')) {
        lastCompletedIdx = i;
        break;
    }
}
console.log('Last Completed Index:', lastCompletedIdx);
if (lastCompletedIdx !== -1) {
    console.log('Line[lastIdx]:', lines[lastCompletedIdx]);
    console.log('Line[lastIdx+1]:', lines[lastCompletedIdx+1]);
}

const dateRegex = /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/;
console.log('Regex test on Line[idx+1]:', dateRegex.test(lines[idx+1]));
