const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filename = 'Order.all.20251101_20251130 (3).xlsx';
const filePath = path.join(__dirname, '..', filename);

if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Read as JSON with header: 1 to get raw array of arrays
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Print first 5 rows to see headers and structure
console.log('Total Rows:', data.length);
console.log('Headers (Row 0):', JSON.stringify(data[0]));
console.log('Row 1:', JSON.stringify(data[1]));
console.log('Row 2:', JSON.stringify(data[2]));
