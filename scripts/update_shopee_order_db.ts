
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { parseShopeeOrderText } from '../src/lib/shopee-parser';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

async function updateOrder() {
    const result = parseShopeeOrderText(text);
    console.log('Parsed Result:', JSON.stringify(result, null, 2));

    const { error } = await supabase
        .from('shopee_orders')
        .update({
            merchandise_subtotal: result.totals.merchandise_subtotal,
            total_payment: result.totals.total_payment,
            date_paid: result.date_paid,
            date_completed: result.date_completed,
            estimated_income: result.totals.estimated_income, // Ensure this is correct
            shipping_fee_paid_by_buyer: result.fees.shipping_fee_paid_by_buyer,
            transaction_fee: result.fees.transaction_fee,
            service_fee: result.fees.service_fee,
            // commission_fee: result.fees.commission_fee, // Column missing in DB
            support_program_fee: result.fees.support_program_fee,
            tax: result.fees.tax,
            estimated_shipping_fee: result.fees.estimated_shipping_fee,
            shipping_fee_rebate: result.fees.shipping_fee_rebate,
            order_date: result.order_date
        })
        .eq('order_id', result.order_id);

    if (error) {
        console.error('Error updating order:', error);
    } else {
        console.log(`Successfully updated order ${result.order_id}`);
    }
}

updateOrder();
