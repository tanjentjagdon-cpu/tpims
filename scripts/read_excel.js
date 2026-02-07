const XLSX = require('xlsx');

function readExcel() {
    console.log('Reading Shopee.xlsx...');
    try {
        const workbook = XLSX.readFile('Shopee.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Get headers and first 5 rows
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const rawHeaders = data[0];
        const rows = data.slice(1);
        const totalRows = rows.length;

        console.log('\n--- EXCEL REPORT ---');
        console.log(`Total Records: ${totalRows}`);

        console.log('\n--- DATA MAPPING (Sample Row 1) ---');
        const sampleRow = rows[0];
        rawHeaders.forEach((h, i) => {
            console.log(`[Col ${i}] ${h || '(Empty)'}: ${sampleRow[i] || ''}`);
        });

    } catch (error) {
        console.error('Error reading excel:', error.message);
    }
}

readExcel();
