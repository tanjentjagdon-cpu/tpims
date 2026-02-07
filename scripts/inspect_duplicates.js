const XLSX = require('xlsx');

function inspectDuplicates() {
    console.log('Reading Shopee.xlsx to find duplicates...');
    try {
        const workbook = XLSX.readFile('Shopee.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const headers = data[0];
        const rows = data.slice(1);

        // Map Order ID (Col 2, index 1) to rows
        const orderMap = new Map();
        rows.forEach((row, index) => {
            const orderId = row[1]; // Order Number
            if (!orderId) return;

            if (!orderMap.has(orderId)) {
                orderMap.set(orderId, []);
            }
            orderMap.get(orderId).push(row);
        });

        // Find an order with > 1 rows
        let multiItemOrder = null;
        for (const [orderId, orderRows] of orderMap) {
            if (orderRows.length > 1) {
                multiItemOrder = { orderId, rows: orderRows };
                break;
            }
        }

        if (multiItemOrder) {
            console.log(`\nFound Multi-Item Order: ${multiItemOrder.orderId}`);
            console.log(`Row Count: ${multiItemOrder.rows.length}`);
            console.log('\n--- HEADERS vs ROW VALUES ---');

            // Print comparison of rows
            headers.forEach((h, colIndex) => {
                const values = multiItemOrder.rows.map(r => r[colIndex]);
                const distinctValues = [...new Set(values)];
                const isConstant = distinctValues.length === 1;

                console.log(`[${colIndex}] ${h}: ${isConstant ? 'CONSTANT' : 'VARIES'} -> ${JSON.stringify(distinctValues)}`);
            });
        } else {
            console.log('No multi-item orders found in the first batch?');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

inspectDuplicates();
