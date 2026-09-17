/**
 * Test script for the Billing Interceptor
 * Verifies that the Package Boundary Rules Engine works deterministically with mock DB.
 */

const { addToInvoice } = require('../services/billingService');

describe('Billing Interceptor Boundary Rules', () => {
    let mockDb;
    let packageUsageLog;
    let invoiceItems;
    const patientId = '12345678-1234-1234-1234-123456789012';
    const userId = 1;
    const hospitalId = 1;

    const inclusions = {
        max_room_days: 3,
        included_room_type: 'General Ward',
        pharmacy_cap_amount: 5000,
        included_tests: ['CBC', 'Hemoglobin'],
        itemized_limits: {
            'Paracetamol IV': 2
        }
    };

    beforeEach(() => {
        packageUsageLog = [];
        invoiceItems = [];

        mockDb = {
            query: jest.fn(async (sql, params = []) => {
                const queryStr = sql.toLowerCase();

                // 1. PMJAY check (not used if admission_id is null)
                if (queryStr.includes('pmjay_packages')) {
                    return { rows: [] };
                }

                // 2. Active package query
                if (queryStr.includes('from patient_packages pp')) {
                    return {
                        rows: [{
                            id: 1,
                            package_id: 10,
                            inclusions,
                            stay_days: 3,
                            room_type: 'General'
                        }]
                    };
                }

                // 3. Room days usage
                if (queryStr.includes("item_type = 'room'")) {
                    const roomLogs = packageUsageLog.filter(l => l.item_type === 'Room');
                    const usedDays = roomLogs.reduce((acc, l) => acc + l.quantity, 0);
                    return { rows: [{ used_days: usedDays }] };
                }

                // 4. Pharmacy overall cap usage
                if (queryStr.includes("item_type = 'pharmacy'") && queryStr.includes('total_pharmacy')) {
                    const pharmLogs = packageUsageLog.filter(l => l.item_type === 'Pharmacy');
                    const totalSpend = pharmLogs.reduce((acc, l) => acc + (l.unit_price * l.quantity), 0);
                    return { rows: [{ total_pharmacy: totalSpend }] };
                }

                // 5. Itemized limit usage
                if (queryStr.includes('item_name ilike')) {
                    const searchPattern = (params[1] || '').replace(/%/g, '').toLowerCase();
                    const itemLogs = packageUsageLog.filter(l => l.item_name.toLowerCase().includes(searchPattern));
                    const sumQty = itemLogs.reduce((acc, l) => acc + l.quantity, 0);
                    return { rows: [{ sum_qty: sumQty }] };
                }

                // 6. Insert into package usage log
                if (queryStr.includes('insert into package_usage_log')) {
                    packageUsageLog.push({
                        patient_package_id: params[0],
                        item_type: params[1],
                        item_name: params[2],
                        quantity: params[3],
                        unit_price: params[4]
                    });
                    return { rows: [] };
                }

                // 7. Insert into package extras (overages)
                if (queryStr.includes('insert into package_extras')) {
                    return { rows: [] };
                }

                // 8. Find pending invoice
                if (queryStr.includes('from invoices where')) {
                    return { rows: [{ id: 101 }] };
                }

                // 9. Create invoice if needed
                if (queryStr.includes('insert into invoices')) {
                    return { rows: [{ id: 101 }] };
                }

                // 10. Add invoice item
                if (queryStr.includes('insert into invoice_items')) {
                    invoiceItems.push({
                        invoice_id: params[0],
                        description: params[1],
                        quantity: params[2],
                        unit_price: params[3],
                        total_price: params[4]
                    });
                    return { rows: [] };
                }

                // 11. Update invoice total
                if (queryStr.includes('update invoices set total_amount')) {
                    return { rows: [] };
                }

                return { rows: [] };
            })
        };
    });

    test('Test 1: Ordering CBC (Included Diagnostic)', async () => {
        const res = await addToInvoice(patientId, null, 'CBC Lab Test', 1, 500, userId, hospitalId, mockDb);
        expect(res.covered).toBe(true);
        expect(res.message).toBe('Covered Diagnostic Test');
        expect(packageUsageLog.length).toBe(1);
        expect(packageUsageLog[0].item_name).toBe('CBC Lab Test');
    });

    test('Test 2: Ordering MRI (Not Included)', async () => {
        const res = await addToInvoice(patientId, null, 'Brain MRI Scan', 1, 8000, userId, hospitalId, mockDb);
        expect(res).toBe(101); // Standard invoice ID returned
        expect(res).not.toHaveProperty('covered');
        expect(invoiceItems.length).toBe(1);
        expect(invoiceItems[0].description).toBe('Brain MRI Scan');
    });

    test('Test 3a: Paracetamol 1 & 2 (Included Pharmacy limit 2)', async () => {
        let res = await addToInvoice(patientId, null, 'Paracetamol IV 500mg', 1, 100, userId, hospitalId, mockDb);
        expect(res.covered).toBe(true);

        res = await addToInvoice(patientId, null, 'Paracetamol IV 500mg', 1, 100, userId, hospitalId, mockDb);
        expect(res.covered).toBe(true);
        expect(packageUsageLog.length).toBe(2);
    });

    test('Test 3b: Paracetamol 3 (Over Limit)', async () => {
        // Pre-populate 2 uses
        packageUsageLog.push(
            { patient_package_id: 1, item_type: 'Pharmacy', item_name: 'Paracetamol IV 500mg', quantity: 1, unit_price: 100 },
            { patient_package_id: 1, item_type: 'Pharmacy', item_name: 'Paracetamol IV 500mg', quantity: 1, unit_price: 100 }
        );

        const res = await addToInvoice(patientId, null, 'Paracetamol IV 500mg', 1, 100, userId, hospitalId, mockDb);
        expect(res).toBe(101); // Over limit -> falls through to standard invoice
        expect(res).not.toHaveProperty('covered');
        expect(invoiceItems.length).toBe(1);
    });

    test('Test 4: Room Days Limits (3 days general)', async () => {
        // 3 days General Ward -> covered
        const res1 = await addToInvoice(patientId, null, 'General Ward Day', 3, 2000, userId, hospitalId, mockDb);
        expect(res1.covered).toBe(true);

        // 4th day -> over limit
        const res2 = await addToInvoice(patientId, null, 'General Ward Day', 1, 2000, userId, hospitalId, mockDb);
        expect(res2).toBe(101); // Over limit
        expect(res2).not.toHaveProperty('covered');

        // Wrong room type (Private Suite) -> not included
        const res3 = await addToInvoice(patientId, null, 'Private Suite Room', 1, 8000, userId, hospitalId, mockDb);
        expect(res3).toBe(101);
        expect(res3).not.toHaveProperty('covered');
    });
});
