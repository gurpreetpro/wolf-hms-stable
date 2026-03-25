/**
 * Test script for the Phase 7 Billing Interceptor
 * Verifies that the Package Boundary Rules Engine works.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { addToInvoice } = require('../services/billingService');

describe('Billing Interceptor Boundary Rules', () => {
  let patient, pkg, patientPkg, user, hospital;

  beforeAll(async () => {
    // 0. Pre-cleanup any orphaned test records
    await prisma.package_usage_log.deleteMany();
    await prisma.patient_packages.deleteMany();
    await prisma.treatment_packages.deleteMany({ where: { code: "MAT-99" } });
    await prisma.patients.deleteMany({ where: { name: "John Doe" } });
    await prisma.users.deleteMany({ where: { email: "doctor@wolf.com" } });
    await prisma.hospitals.deleteMany({ where: { code: "TEST-01" } });

    // 1. Create dummy User and Hospital for foreign keys
    hospital = await prisma.hospitals.create({
        data: {
             name: "Interceptor Test Hospital",
             code: "TEST-01",
             email: "test@wolf.com"
        }
    });

    user = await prisma.users.create({
        data: {
             name: "Test Doctor",
             username: "test_doctor",
             email: "doctor@wolf.com",
             password: "hashed",
             role: "admin",
             hospital_id: hospital.id 
        }
    });

    // 1. Create a dummy patient
    patient = await prisma.patients.create({
      data: {
        id: "12345678-1234-1234-1234-123456789012", // Random UUID format
        name: "John Doe",
        gender: "Male",
        phone: "555-123-4567"
      }
    });

    // 2. Create the dummy treatment package with strict boundaries
    pkg = await prisma.treatment_packages.create({
       data: {
          code: "MAT-99",
          name: "Maternity Standard Test",
          category: "Maternity",
          base_price: 45000,
          stay_days: 3, 
          room_type: "General",
          inclusions: {
             "max_room_days": 3,
             "included_room_type": "General Ward",
             "pharmacy_cap_amount": 5000,
             "included_tests": ["CBC", "Hemoglobin"],
             "itemized_limits": {
                 "Paracetamol IV": 2
             }
          }
       }
    });

    // 3. Assign package to patient
    patientPkg = await prisma.patient_packages.create({
        data: {
            patient_id: patient.id,
            package_id: pkg.id,
            package_price: 45000,
            status: "active"
        }
    });
  });

  afterAll(async () => {
      // Cleanup
      await prisma.package_usage_log.deleteMany({ where: { patient_package_id: patientPkg.id } });
      await prisma.patient_packages.delete({ where: { id: patientPkg.id }});
      await prisma.treatment_packages.delete({ where: { id: pkg.id }});
      await prisma.patients.delete({ where: { id: patient.id }});
      await prisma.users.delete({ where: { id: user.id }});
      await prisma.hospitals.delete({ where: { id: hospital.id }});
      await prisma.$disconnect();
  });

  test('Test 1: Ordering CBC (Included Diagnostic)', async () => {
    const res = await addToInvoice(patient.id, null, 'CBC Lab Test', 1, 500, user.id, hospital.id);
    expect(res.covered).toBe(true);
  });

  test('Test 2: Ordering MRI (Not Included)', async () => {
    const res = await addToInvoice(patient.id, null, 'Brain MRI Scan', 1, 8000, user.id, hospital.id);
    expect(res).not.toHaveProperty('covered'); // Should return standard invoice ID
  });

  test('Test 3a: Paracetamol 1 & 2 (Included Pharmacy limit 2)', async () => {
    let res = await addToInvoice(patient.id, null, 'Paracetamol IV 500mg', 1, 100, user.id, hospital.id);
    expect(res.covered).toBe(true);
    res = await addToInvoice(patient.id, null, 'Paracetamol IV 500mg', 1, 100, user.id, hospital.id);
    expect(res.covered).toBe(true);
  });

  test('Test 3b: Paracetamol 3 (Over Limit)', async () => {
    const res = await addToInvoice(patient.id, null, 'Paracetamol IV 500mg', 1, 100, user.id, hospital.id);
    expect(res).not.toHaveProperty('covered'); // Limit of 2 exceeded
  });

  test('Test 4: Room Days Limits (3 days general)', async () => {
    const res1 = await addToInvoice(patient.id, null, 'General Ward Day', 3, 2000, user.id, hospital.id);
    expect(res1.covered).toBe(true);

    const res2 = await addToInvoice(patient.id, null, 'General Ward Day', 1, 2000, user.id, hospital.id); // 4th day
    expect(res2).not.toHaveProperty('covered'); // Over limit

    const res3 = await addToInvoice(patient.id, null, 'Private Suite Room', 1, 8000, user.id, hospital.id); // Wrong type
    expect(res3).not.toHaveProperty('covered'); // Not included room type
  });
});
