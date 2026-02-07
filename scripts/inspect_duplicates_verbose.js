const XLSX = require('xlsx');

function verboseInspect() {
    console.log('Reading Shopee.xlsx with corrected indices...');
    try {
        const workbook = XLSX.readFile('Shopee.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const headers = data[0];
        const rows = data.slice(1);

        console.log('--- COLUMN MAPPING ---');
        headers.forEach((h, i) => {
            if (h) console.log(`Index ${i}: ${h}`);
        });

        const orderIdIndex = 2; // Assuming Order Number is at index 2 based on previous findings (DATE at 1)
        console.log(`\nUsing Order ID Index: ${orderIdIndex} (${headers[orderIdIndex]})`);

        const orderMap = new Map();
        rows.forEach((row, i) => {
            const orderId = row[orderIdIndex];
            if (!orderId) return;
            if (!orderMap.has(orderId)) orderMap.set(orderId, []);
            orderMap.get(orderId).push(row);
        });

        // Find first multi-item order
        let targetOrder = null;
        for (const [id, r] of orderMap) {
            if (r.length > 1) {
                targetOrder = { id, rows: r };
                break;
            }
        }

        if (targetOrder) {
            console.log(`\n=== MULTI-ITEM ORDER FOUND: ${targetOrder.id} ===`);
            console.log(`Number of Rows: ${targetOrder.rows.length}`);

            // Print Rows
            console.log('\n--- ROWS ---');
            targetOrder.rows.forEach((row, idx) => {
                console.log(`\n[ROW ${idx + 1}]`);
                // Print relevant columns based on headers found
                // date=1, order=2, product=5, price=6, qty=7, total=8, buyerPay=23 (offset by +1 if Col 0 is empty?)
                // Let's print by Name lookup if possible, but indices are safer for now.
                // If headers[1] is Date, then strict indices:

                const cols = [1, 2, 5, 6, 7, 8, 23];
                cols.forEach(ci => {
                    console.log(`  [${ci}] ${headers[ci]}: ${row[ci]}`);
                });
            });

            const sumBuyerPayment = targetOrder.rows.reduce((acc, r) => acc + (parseFloat(r[23]) || 0), 0);

            console.log('\n--- SUMMARY ---');
            console.log(`Sum of Col 23 (Buyer Payment): ${sumBuyerPayment}`);
            console.log(`Value of Col 23 (Row 1): ${targetOrder.rows[0][23]}`);

            if (sumBuyerPayment > parseFloat(targetOrder.rows[0][23]) * 1.5) {
                console.log("CONCLUSION: 'Total Buyer Payment' is REPEATED per row. Summing it would be WRONG.");
            } else {
                console.log("CONCLUSION: 'Total Buyer Payment' is SPLIT per row. Summing it is CORRECT.");
            }

        } else {
            console.log('No multi-item orders found.');
        }

    } catch (e) {
        console.error(e);
    }
}

verboseInspect();
