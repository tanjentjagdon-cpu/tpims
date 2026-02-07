
import { parseShopeeOrderText } from '../src/lib/shopee-parser';

const text = `
Shopee Seller Center.html icheck mo lang paps ganyan kac yung cinocopy paste ko e 
 
 Home 
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
 Parcel is out for delivery to buyer 
 10/31/2025 08:22 
 Delivery driver has been assigned 
 10/31/2025 07:11 
 Parcel has arrived at the delivery hub : Palanca Hub 
 10/31/2025 06:14 
 Parcel has arrived and to be received by the delivery hub 
 10/31/2025 04:23 
 Parcel has departed from sorting facility 
 10/31/2025 03:14 
 Parcel is loaded into truck, to leave sorting center soon 
 10/31/2025 03:00 
 Parcel has arrived at sorting facility : SOC 6 
 10/31/2025 01:21 
 Parcel is in transit from to next location 
 10/31/2025 01:07 
 Parcel has departed from sorting facility 
 10/30/2025 19:42 
 Parcel is loaded into truck, to leave first mile hub soon 
 10/30/2025 19:41 
 Parcel has arrived at sorting facility : MFM Laguna 
 10/30/2025 19:13 
 Parcel is in transit from to next location 
 10/30/2025 18:47 
 Parcel has departed from sorting facility 
 10/30/2025 16:35 
 Parcel is loaded into truck, to leave first mile hub soon 
 10/30/2025 16:34 
 Parcel has arrived at sorting facility : Dasmarinas Hub 
 10/30/2025 16:01 
 Parcel has been picked up by our logistics partner 
 10/30/2025 15:34 
 Courier assigned for your order, kindly wait for pick up. 
 10/30/2025 14:50 
 You have successfully arranged shipment. Please ensure that parcel is ready prior drop-off/courier pick up 
 10/30/2025 14:27 
 Collapse 
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
 Merchandise Subtotal 
 ₱117.00 
 Shipping Fee 
 ₱0.00 
 Shopee Voucher 
 ₱0.00 
 Seller Voucher 
 ₱0.00 
 Total Buyer Payment 
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
 4
`;

const result = parseShopeeOrderText(text);
console.log('Parsed Username:', result.buyer_username);
console.log('Parsed Order ID:', result.order_id);
console.log('Parsed Status:', result.status);
