const XLSX = require('xlsx');
const path = require('path');
const filename = 'Order.all.20251101_20251130 (3).xlsx';
const filePath = path.join(__dirname, '..', filename);

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rows[0];
    const orderIdIdx = headers.findIndex(h => h === 'Order ID');

    // Find the row
    const row = rows.find(r => r[orderIdIdx] === '251229KJDVAGU2');

    if (!row) {
        console.log('Order not found');
    } else {
        console.log('--- Financial Columns for 251229KJDVAGU2 ---');
        headers.forEach((h, i) => {
            // Print only potential financial columns
            if (
                h.includes('Price') || h.includes('Total') || h.includes('Fee') ||
                h.includes('Discount') || h.includes('Voucher') || h.includes('Rebate') ||
                h.includes('Cost') || h.includes('Amount') || h.includes('Offset')
            ) {
                console.log(`${h}: ${row[i]}`);
            }
        });
    }

} catch (e) {
    console.error(e);
}
