const XLSX = require('xlsx');

function inspect() {
    console.log('Reading Shopee.xlsx...');
    const workbook = XLSX.readFile('Shopee.xlsx');
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    const targetId = '2512235DXWUAAW'; // Known 2-item order
    const targetId2 = '260109HX3UEXTC'; // The other one

    console.log(`\nInspecting Fees for Order: ${targetId}`);

    // Find all rows
    // Note: My import script handles merged cells, this simple find might not unless I iterate.

    let lastId = null;
    data.slice(1).forEach((row, idx) => {
        let oid = row[2];
        if (!oid && lastId && row[5]) oid = lastId; // simple fill down
        if (oid) lastId = oid;

        if (oid === targetId || oid === targetId2) {
            console.log(`\nRow ${idx + 2} (Order ${oid}):`);
            console.log(`  Product: ${row[5]}`);
            console.log(`  Qty: ${row[7]}`);
            console.log(`  Buyer Pay: ${row[23]}`);

            // Fees
            console.log(`  [9] Shipping Paid: ${row[9]}`);
            console.log(`  [10] Shipping Charged: ${row[10]}`);
            console.log(`  [11] Shipping Rebate: ${row[11]}`);
            console.log(`  [12] Support Fee: ${row[12]}`);
            console.log(`  [13] Service/Tiktok: ${row[13]}`);
            console.log(`  [14] Transaction Fee: ${row[14]}`);
            console.log(`  [15] Tax: ${row[15]}`);
        }
    });

}

inspect();
