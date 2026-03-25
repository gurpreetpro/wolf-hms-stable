const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('--- Phase 1 Verification Test ---');
  try {
    // 1. Test Hub-and-Spoke structure (branch_type on hospitals)
    const mockHub = await prisma.hospitals.create({
      data: {
        code: 'TEST-HUB-001',
        name: 'Enterprise Hub DB Test',
        branch_type: 'HUB',
        subdomain: 'test-hub'
      }
    });
    console.log('✅ Hub-and-Spoke: Successfully created a HUB hospital.');

    // 2. Test ERP Sync Models
    const erpMapping = await prisma.erp_ledger_mappings.create({
      data: {
        hospital_id: mockHub.id,
        internal_charge: 'Pharmacy Sale',
        tally_ledger: 'Sales Accounts - Pharmacy'
      }
    });
    console.log('✅ ERP Sync: Successfully wrote to erp_ledger_mappings.');

    // 3. Test multi-level approvals
    const approvalMatrix = await prisma.approval_matrices.create({
        data: {
            department_id: 1,
            min_amount: 5000,
            max_amount: 50000,
            required_role: 'admin',
            delegated_to_user_id: null
        }
    });
    console.log('✅ Procurement: Successfully wrote to approval_matrices.');
    
    // 4. Test B2B Corporate Billing
    const b2bInvoice = await prisma.b2b_invoices.create({
        data: {
            hospital_id: mockHub.id,
            corporate_id: 999,
            total_amount: 150000.00,
            status: 'GENERATED'
        }
    });
    console.log('✅ B2B Billing: Successfully wrote to b2b_invoices.');

    // Clean up test data
    console.log('Cleaning up test data...');
    await prisma.b2b_invoices.delete({ where: { id: b2bInvoice.id } });
    await prisma.approval_matrices.delete({ where: { id: approvalMatrix.id } });
    await prisma.erp_ledger_mappings.delete({ where: { id: erpMapping.id } });
    await prisma.hospitals.delete({ where: { id: mockHub.id } });
    console.log('🧹 Cleanup complete. Phase 1 Verification PASSED.');

  } catch (error) {
    console.error('❌ Phase 1 Verification FAILED:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
