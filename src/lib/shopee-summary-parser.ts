export interface ShopeeSummary {
    total_transactions: number;
    breakdown: {
        order_income: number;
        seller_balance_payment: number;
        withdrawals: number;
        adjustment: number;
        order_deduction: number;
        others: number;
    };
    raw_breakdown: Record<string, number>;
}

export function parseShopeeSummaryText(text: string): ShopeeSummary {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    const result: ShopeeSummary = {
        total_transactions: 0,
        breakdown: {
            order_income: 0,
            seller_balance_payment: 0,
            withdrawals: 0,
            adjustment: 0,
            order_deduction: 0,
            others: 0
        },
        raw_breakdown: {}
    };

    // Helper to check if a line is a number
    const isNumber = (s: string) => /^\d+$/.test(s.replace(/,/g, ''));
    const parseNum = (s: string) => parseInt(s.replace(/,/g, ''), 10);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // "Transactions Made" followed by number
        if (line.toLowerCase().includes('transactions made')) {
            if (i + 1 < lines.length && isNumber(lines[i+1])) {
                result.total_transactions = parseNum(lines[i+1]);
                i++; // Skip number
                continue;
            }
        }

        // "<Number> Transactions" (e.g. "1321 Transactions")
        const transactionsMatch = line.match(/^([\d,]+)\s+Transactions/i);
        if (transactionsMatch) {
            result.total_transactions = parseNum(transactionsMatch[1]);
            continue;
        }

        // Categories: Label followed by number
        // Check if current line ends with ':' or looks like a label
        // And next line is a number
        if (i + 1 < lines.length && isNumber(lines[i+1])) {
            const label = line.replace(':', '').trim();
            const value = parseNum(lines[i+1]);
            
            result.raw_breakdown[label] = value;

            const labelLower = label.toLowerCase();
            if (labelLower.includes('order income')) {
                result.breakdown.order_income = value;
            } else if (labelLower.includes('seller balance payment')) {
                result.breakdown.seller_balance_payment = value;
            } else if (labelLower.includes('withdrawal')) {
                result.breakdown.withdrawals = value;
            } else if (labelLower.includes('adjustment')) {
                result.breakdown.adjustment = value;
            } else if (labelLower.includes('order deduction')) {
                result.breakdown.order_deduction = value;
            } else {
                result.breakdown.others += value;
            }
            
            i++; // Skip number
        }
    }

    return result;
}
