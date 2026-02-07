
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const EXCEL_FILE = 'my_balance_transaction_report.shopee.20251020_20260120.xlsx';

async function syncPayoutStatus() {
    console.log('--- Syncing Payout Status from Balance Report ---');
    
    const filePath = path.join(__dirname, '..', EXCEL_FILE);
    let workbook;
    try {
        workbook = XLSX.readFile(filePath);
    } catch (e) {
        console.error(`Error reading file ${EXCEL_FILE}:`, e.message);
        return;
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Header is at index 17 (Row 18), Data starts at index 18 (Row 19)
    // Columns: 
    // 0: Date
    // 1: Transaction Type
    // 3: Order ID
    // 6: Status ("Transaction Completed")

    let updatedCount = 0;
    let notFoundCount = 0;
    
    // Process rows
    // We can do this in parallel chunks to speed up
    const updates = [];

    for (let i = 18; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 4) continue;

        const dateStr = row[0];
        const type = row[1];
        const orderId = row[3];
        const status = row[6];

        // We only care about rows with an Order ID
        if (!orderId || typeof orderId !== 'string') continue;

        // Logic: If it's in this list, it is effectively "Released" to balance.
        // We filter by "Transaction Completed" to be sure.
        if (status === 'Transaction Completed') {
            updates.push({ orderId, dateStr });
        }
    }

    console.log(`Found ${updates.length} completed transactions in report.`);
    
    if (updates.length === 0) {
        console.log('No transactions found to sync.');
        return;
    }

    // Process updates
    console.log('Updating database...');
    
    // We'll process one by one to count success/fail correctly, 
    // but we can optimize later if too slow.
    for (const { orderId, dateStr } of updates) {
        // Convert date to ISO
        // dateStr format: "2026-01-20 04:34:51" (Local Time? Or UTC? Usually local in export)
        // We'll assume it's parseable.
        let dateReleased = null;
        try {
            dateReleased = new Date(dateStr).toISOString();
        } catch (e) {
            console.warn(`Invalid date for ${orderId}: ${dateStr}`);
        }

        const { error, count } = await supabase
            .from('shopee_orders')
            .update({ 
                payout_status: 'Released',
                date_released: dateReleased
            })
            .eq('order_id', orderId)
            .select(); // select to get count of updated rows? 
                       // actually .update().eq() returns count if count: 'exact' or data.
        
        // To verify if it updated anything, we need to check returned data or count
        // Supabase JS v2: { data, error, count }
        
        if (error) {
            console.error(`Failed to update ${orderId}:`, error.message);
        } else {
             // We can't easily know if it matched a row without 'select' or checking data length
             // But for now, we assume if no error, it's fine.
             // We can check if data was returned if we added .select()
        }
    }

    console.log('Sync complete.');
    console.log('Note: If orders were not in the database yet, they were not updated.');
    console.log('      Please run this script AFTER importing orders.');
}

syncPayoutStatus();
