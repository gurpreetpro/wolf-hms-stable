const { X12Generator, X12Interchange, X12FunctionalGroup, X12Transaction, X12Segment } = require('node-x12');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class EdiService {
    
    /**
     * Generate 837 Professional Claim for an Invoice
     * @param {number} invoiceId 
     * @param {number} hospitalId 
     */
    async generate837Claim(invoiceId, hospitalId) {
        // 1. Fetch Data
        const invoice = await prisma.invoices.findUnique({
            where: { id: invoiceId },
            include: {
                patients: true,
                invoice_items: true,
                hospitals: true,
                insurance_claims: {
                    include: {
                        patient_insurance: true
                    }
                }
            }
        });

        if (!invoice) throw new Error('Invoice not found');
        if (!invoice.insurance_claims || invoice.insurance_claims.length === 0) {
            throw new Error('No insurance claim linked to this invoice');
        }

        const claim = invoice.insurance_claims[0];
        const patient = invoice.patients;
        const hospital = invoice.hospitals;

        // 2. Build EDI Object using node-x12
        
        // ISA - Interchange Control Header
        const interchange = new X12Interchange({
            elementDelimiter: '*',
            segmentTerminator: '~',
            senderQualifier: 'ZZ',
            senderId: 'WOLFHMS        ', // Mock Sender
            receiverQualifier: 'ZZ',
            receiverId: 'PAYER12345     ', // Mock Receiver
            date: new Date(),
            time: new Date(),
            controlNumber: '000000001',
            usageIndicator: 'P', // Production
        });

        // GS - Functional Group
        const group = new X12FunctionalGroup({
            functionalIdentifierCode: 'HC', // Health Care Claim (837)
            senderId: 'WOLFHMS',
            receiverId: 'PAYER12345',
            date: new Date(),
            time: new Date(),
            controlNumber: 1,
            version: '005010X222A1'
        });

        interchange.functionalGroups.push(group);

        // ST - Transaction Set
        const transaction = new X12Transaction({
            transactionSetIdentifierCode: '837',
            transactionSetControlNumber: '0001',
            implementationConventionReference: '005010X222A1'
        });

        group.transactions.push(transaction);

        // --- 837 Logic (The "Loop" Structure) ---
        // This is a simplified 837P structure for demonstration
        // Level 1: Header
        transaction.segments.push(new X12Segment('BHT', ['0019', '00', 'REF123456', new Date().toISOString().slice(0, 10).replace(/-/g, ''), new Date().toTimeString().slice(0, 5).replace(/:/g, ''), 'CH']));

        // Loop 1000A: Submitter
        transaction.segments.push(new X12Segment('NM1', ['41', '2', 'WOLF HMS', '', '', '', '', '46', 'WOLFHMS']));
        transaction.segments.push(new X12Segment('PER', ['IC', 'BILLING DEPT', 'TE', '5551234567']));

        // Loop 1000B: Receiver
        transaction.segments.push(new X12Segment('NM1', ['40', '2', 'PAYER INC', '', '', '', '', '46', 'PAYER12345']));

        // Loop 2000A: Billing Provider
        transaction.segments.push(new X12Segment('HL', ['1', '', '20', '1']));
        transaction.segments.push(new X12Segment('NM1', ['85', '2', hospital.name, '', '', '', '', 'XX', '1234567890'])); // NPI
        transaction.segments.push(new X12Segment('N3', [hospital.address || 'HOSPITAL ADDRESS']));
        transaction.segments.push(new X12Segment('N4', [hospital.city || 'CITY', hospital.state || 'STATE', '00000']));

        // Loop 2000B: Subscriber (Patient)
        transaction.segments.push(new X12Segment('HL', ['2', '1', '22', '0']));
        transaction.segments.push(new X12Segment('SBR', ['P', '18', '', '', '', '', '', '', 'MB']));
        transaction.segments.push(new X12Segment('NM1', ['IL', '1', patient.name.split(' ')[1] || 'LAST', patient.name.split(' ')[0] || 'FIRST', '', '', '', 'MI', claim.tpa_claim_id || 'MEMBERID']));
        transaction.segments.push(new X12Segment('DMG', ['D8', patient.dob.toISOString().slice(0, 10).replace(/-/g, ''), patient.gender === 'Male' ? 'M' : 'F']));

        // Loop 2300: Claim Info
        transaction.segments.push(new X12Segment('CLM', [invoice.invoice_number || 'INV001', invoice.total_amount.toString(), '', '', '11:B:1', 'Y', 'A', 'Y', 'Y']));
        
        // Loop 2400: Service Lines
        let lineCount = 1;
        for (const item of invoice.invoice_items) {
            transaction.segments.push(new X12Segment('LX', [lineCount.toString()]));
            transaction.segments.push(new X12Segment('SV1', [`HC:${item.item_type === 'procedure' ? '99213' : '99999'}`, item.total_price.toString(), 'UN', item.quantity.toString(), '', '']));
            transaction.segments.push(new X12Segment('DTP', ['472', 'D8', invoice.generated_at.toISOString().slice(0, 10).replace(/-/g, '')]));
            lineCount++;
        }

        // 3. Generate String
        const options = {
          elementDelimiter: '*',
          segmentTerminator: '~',
          endOfLine: '\n' 
        };
        const ediString = interchange.toString(options);

        // 4. Save to DB
        const transmission = await prisma.edi_transmissions.create({
            data: {
                batch_id: `BATCH-${Date.now()}`,
                type: '837',
                status: 'Generated',
                file_content: ediString,
                file_name: `CLAIM_837_${invoice.id}.x12`,
                record_count: 1,
                hospital_id: hospitalId
            }
        });

        console.log(`[EDI] Generated 837 Batch ${transmission.batch_id}`);
        return transmission;
    }
}

module.exports = new EdiService();
