const XLSX = require('xlsx');
const path = require('path');

const filename = 'Order.all.20251101_20251130 (3).xlsx';
const filePath = path.join(__dirname, '..', filename);

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Columns:');
data[0].forEach((col, idx) => console.log(`${idx}: ${col}`));
