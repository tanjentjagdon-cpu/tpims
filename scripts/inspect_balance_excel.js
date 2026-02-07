
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../my_balance_transaction_report.shopee.20251020_20260120.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON to see structure
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log('--- Inspecting Rows 0-30 ---');
    for (let i = 0; i <= 30 && i < data.length; i++) {
        // Only print if row is not empty
        if (data[i] && data[i].length > 0) {
            console.log(`Row ${i}:`, JSON.stringify(data[i]));
        }
    }

} catch (e) {
    console.error('Error reading excel:', e);
}
