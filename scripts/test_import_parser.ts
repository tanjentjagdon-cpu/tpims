import { parseShopeeOrderText } from '../src/lib/shopee-parser';

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

try {
    const parsed = parseShopeeOrderText(text);
    console.log('--- PARSE RESULTS ---');
    console.log(JSON.stringify(parsed, null, 2));
} catch (e) {
    console.error('PARSE FAILED:', e);
}
