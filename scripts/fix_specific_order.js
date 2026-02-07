require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixOrder() {
    // Manually fix order 251229KJDVAGU2 based on user feedback and typical fees
    // If estimated was 110 (117 - 7 service), and user says it's "far off", 
    // likely missing commission/transaction.

    // Let's assume standard fees for now or just set a placeholder if I can't deduce exact numbers without the file.
    // However, I can try to set commission/transaction to valid columns now that they exist.

    // Actually, I can't know the EXACT fee without the file.
    // BUT, the user's primary complaint is "update mo na dto" (update it here).

    // I will try to infer fees from similar orders or just set them to 0 and notify user I can't guess.
    // Wait, the user already provided the file "Order.all...". I can read it!

    // I will read the Excel file LOCALLY using the script, find that specific order, and update it.

    const XLSX = require('xlsx');
    const path = require('path');
    const filename = 'Order.all.20251101_20251130 (3).xlsx';
    const filePath = path.join(__dirname, '..', filename);
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Find headers
    const headers = data[0];
    const getIdx = (name) => headers.findIndex(h => h && h.trim() === name);

    const idx = {
        orderId: getIdx('Order ID'),
        serviceFee: getIdx('Service Fee'),
        commissionFee: getIdx('Commission Fee'),
        transactionFee: getIdx('Transaction Fee'),
        grandTotal: getIdx('Grand Total'),
        buyerPaid: getIdx("Products' Price Paid by Buyer (PHP)"),
    };

    // Find row
    const row = data.find(r => r[idx.orderId] === '251229KJDVAGU2');

    if (!row) {
        console.log('Order not found in Excel file.');
        return;
    }

    const parseFee = (val) => parseFloat(String(val).replace(/[^-0-9.]/g, '')) || 0;

    const serviceFee = parseFee(row[idx.serviceFee]);
    const commissionFee = parseFee(row[idx.commissionFee]);
    const transactionFee = parseFee(row[idx.transactionFee]);
    const totalPayment = parseFee(row[idx.grandTotal]); // Or calculating from items

    // Recalculate Income
    // Let's try to match existing logic: (Total Payment - Fees)
    // Note: Total Payment in DB is per item sum.
    const estimatedIncome = totalPayment - serviceFee - commissionFee - transactionFee;

    console.log(`Found Order: ${row[idx.orderId]}`);
    console.log(`Service: ${serviceFee}, Comm: ${commissionFee}, Trans: ${transactionFee}`);
    console.log(`New Est Income: ${estimatedIncome}`);

    const { error } = await supabase
        .from('shopee_orders')
        .update({
            commission_fee: commissionFee,
            transaction_fee: transactionFee,
            service_fee: serviceFee, // Ensure this is correct
            estimated_income: estimatedIncome
        })
        .eq('order_id', '251229KJDVAGU2');

    if (error) console.error('Update failed:', error);
    else console.log('Order updated successfully.');
}

fixOrder();
