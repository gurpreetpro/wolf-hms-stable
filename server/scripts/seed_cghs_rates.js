/**
 * CGHS/ECHS Rate Data Seeder
 * Seeds ~160 representative procedures from the official CGHS 2025 rate list
 * Covers all major specialties with real NABH/Non-NABH/Super-Specialty rates
 * 
 * Usage: node scripts/seed_cghs_rates.js
 * 
 * WOLF HMS - Phase H
 */

const { pool } = require('../db');

const CGHS_PACKAGES = [
    // ==========================================
    // CONSULTATIONS
    // ==========================================
    { code: 'CGHS-CON-001', name: 'OPD Consultation - General', specialty: 'Consultation', nonNabh: 350, nabh: 350, superSpec: 350, type: 'consultation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-CON-002', name: 'OPD Consultation - Specialist', specialty: 'Consultation', nonNabh: 350, nabh: 350, superSpec: 350, type: 'consultation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-CON-003', name: 'OPD Consultation - Super Specialist / Psychiatry', specialty: 'Consultation', nonNabh: 700, nabh: 700, superSpec: 700, type: 'consultation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-CON-004', name: 'Inpatient Consultation / Follow-up', specialty: 'Consultation', nonNabh: 350, nabh: 350, superSpec: 350, type: 'consultation', preauth: false, los: 0, daycare: false },

    // ==========================================
    // LABORATORY / PATHOLOGY
    // ==========================================
    { code: 'CGHS-LB-001', name: 'Complete Blood Count (CBC)', specialty: 'Laboratory', nonNabh: 120, nabh: 140, superSpec: 160, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-002', name: 'Blood Sugar - Fasting', specialty: 'Laboratory', nonNabh: 50, nabh: 60, superSpec: 70, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-003', name: 'HbA1c', specialty: 'Laboratory', nonNabh: 300, nabh: 350, superSpec: 400, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-004', name: 'Lipid Profile', specialty: 'Laboratory', nonNabh: 250, nabh: 300, superSpec: 340, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-005', name: 'Liver Function Test (LFT)', specialty: 'Laboratory', nonNabh: 250, nabh: 300, superSpec: 340, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-006', name: 'Kidney Function Test (KFT / RFT)', specialty: 'Laboratory', nonNabh: 250, nabh: 300, superSpec: 340, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-007', name: 'Thyroid Profile (T3, T4, TSH)', specialty: 'Laboratory', nonNabh: 350, nabh: 400, superSpec: 460, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-008', name: 'Serum Testosterone', specialty: 'Laboratory', nonNabh: 340, nabh: 400, superSpec: 460, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-009', name: 'Triglycerides', specialty: 'Laboratory', nonNabh: 125, nabh: 150, superSpec: 170, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-010', name: 'Urine Routine & Microscopy', specialty: 'Laboratory', nonNabh: 60, nabh: 70, superSpec: 80, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-011', name: 'Blood Culture & Sensitivity', specialty: 'Laboratory', nonNabh: 400, nabh: 470, superSpec: 540, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-012', name: 'Prothrombin Time (PT/INR)', specialty: 'Laboratory', nonNabh: 200, nabh: 240, superSpec: 270, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-013', name: 'Serum Electrolytes (Na, K, Cl)', specialty: 'Laboratory', nonNabh: 200, nabh: 240, superSpec: 270, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-014', name: 'PSA (Prostate Specific Antigen)', specialty: 'Laboratory', nonNabh: 450, nabh: 530, superSpec: 610, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-015', name: 'Histopathology - Biopsy (Small)', specialty: 'Laboratory', nonNabh: 550, nabh: 650, superSpec: 750, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-016', name: 'Vitamin D (25-OH)', specialty: 'Laboratory', nonNabh: 550, nabh: 650, superSpec: 750, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-LB-017', name: 'Vitamin B12', specialty: 'Laboratory', nonNabh: 450, nabh: 530, superSpec: 610, type: 'investigation', preauth: false, los: 0, daycare: false },

    // ==========================================
    // RADIOLOGY / IMAGING
    // ==========================================
    { code: 'CGHS-RI-001', name: 'X-Ray - Single View', specialty: 'Radiology', nonNabh: 150, nabh: 180, superSpec: 200, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-RI-002', name: 'X-Ray - Two Views', specialty: 'Radiology', nonNabh: 230, nabh: 270, superSpec: 310, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-RI-003', name: 'USG Abdomen', specialty: 'Radiology', nonNabh: 650, nabh: 765, superSpec: 880, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-RI-004', name: 'USG Color Doppler (One Organ)', specialty: 'Radiology', nonNabh: 1420, nabh: 1675, superSpec: 1925, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-RI-005', name: 'CT Scan - Head (Plain)', specialty: 'Radiology', nonNabh: 1530, nabh: 1800, superSpec: 2070, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-RI-006', name: 'CT Scan - Chest/Abdomen (Contrast)', specialty: 'Radiology', nonNabh: 3400, nabh: 4000, superSpec: 4600, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-RI-007', name: 'CT Coronary Angiography', specialty: 'Radiology', nonNabh: 6030, nabh: 6935, superSpec: 7800, type: 'investigation', preauth: true, los: 0, daycare: false },
    { code: 'CGHS-RI-008', name: 'MRI - Brain (Plain)', specialty: 'Radiology', nonNabh: 3825, nabh: 4500, superSpec: 5175, type: 'investigation', preauth: true, los: 0, daycare: false },
    { code: 'CGHS-RI-009', name: 'MRI - Spine / MSK (Plain)', specialty: 'Radiology', nonNabh: 4250, nabh: 5000, superSpec: 5750, type: 'investigation', preauth: true, los: 0, daycare: false },
    { code: 'CGHS-RI-010', name: 'MRI Mammography', specialty: 'Radiology', nonNabh: 4250, nabh: 5000, superSpec: 5750, type: 'investigation', preauth: true, los: 0, daycare: false },
    { code: 'CGHS-RI-011', name: 'Cardiac MRI', specialty: 'Radiology', nonNabh: 6800, nabh: 8000, superSpec: 9200, type: 'investigation', preauth: true, los: 0, daycare: false },
    { code: 'CGHS-RI-012', name: 'PET CT Scan', specialty: 'Radiology', nonNabh: 12750, nabh: 15000, superSpec: 17250, type: 'investigation', preauth: true, los: 0, daycare: false },
    { code: 'CGHS-RI-013', name: 'Mammography (Bilateral)', specialty: 'Radiology', nonNabh: 950, nabh: 1120, superSpec: 1290, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-RI-014', name: 'DEXA Scan (Bone Density)', specialty: 'Radiology', nonNabh: 1050, nabh: 1235, superSpec: 1420, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-RI-015', name: 'ECG (12-Lead)', specialty: 'Radiology', nonNabh: 200, nabh: 240, superSpec: 270, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-RI-016', name: '2D Echocardiography', specialty: 'Radiology', nonNabh: 1275, nabh: 1500, superSpec: 1725, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-RI-017', name: 'TMT (Treadmill Test)', specialty: 'Radiology', nonNabh: 850, nabh: 1000, superSpec: 1150, type: 'investigation', preauth: false, los: 0, daycare: false },

    // ==========================================
    // GENERAL SURGERY
    // ==========================================
    { code: 'CGHS-GS-001', name: 'Appendicectomy (Open)', specialty: 'General Surgery', nonNabh: 8000, nabh: 9200, superSpec: 10580, type: 'surgical', preauth: true, los: 5 },
    { code: 'CGHS-GS-002', name: 'Appendicectomy (Laparoscopic)', specialty: 'General Surgery', nonNabh: 12000, nabh: 14000, superSpec: 16100, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-GS-003', name: 'Hernia Repair - Inguinal (Open)', specialty: 'General Surgery', nonNabh: 10000, nabh: 11500, superSpec: 13225, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-GS-004', name: 'Hernia Repair - Inguinal (Laparoscopic)', specialty: 'General Surgery', nonNabh: 16000, nabh: 18500, superSpec: 21275, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-GS-005', name: 'Cholecystectomy (Open)', specialty: 'General Surgery', nonNabh: 14000, nabh: 16500, superSpec: 18975, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-GS-006', name: 'Cholecystectomy (Laparoscopic)', specialty: 'General Surgery', nonNabh: 18000, nabh: 21000, superSpec: 24150, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-GS-007', name: 'Hemorrhoidectomy / Piles Surgery', specialty: 'General Surgery', nonNabh: 8000, nabh: 9500, superSpec: 10925, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-GS-008', name: 'Fistula in Ano Surgery', specialty: 'General Surgery', nonNabh: 8000, nabh: 9500, superSpec: 10925, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-GS-009', name: 'Thyroidectomy (Partial/Total)', specialty: 'General Surgery', nonNabh: 18000, nabh: 21000, superSpec: 24150, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-GS-010', name: 'Mastectomy (Simple)', specialty: 'General Surgery', nonNabh: 18000, nabh: 21000, superSpec: 24150, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-GS-011', name: 'Excision of Lipoma / Sebaceous Cyst', specialty: 'General Surgery', nonNabh: 2500, nabh: 3000, superSpec: 3450, type: 'minor', preauth: false, los: 1, daycare: true },
    { code: 'CGHS-GS-012', name: 'Incision & Drainage of Abscess', specialty: 'General Surgery', nonNabh: 2000, nabh: 2500, superSpec: 2875, type: 'minor', preauth: false, los: 1, daycare: true },

    // ==========================================
    // ORTHOPAEDICS
    // ==========================================
    { code: 'CGHS-OR-001', name: 'Total Knee Replacement - Unilateral (TKR)', specialty: 'Orthopaedics', nonNabh: 129200, nabh: 152000, superSpec: 174800, type: 'surgical', preauth: true, los: 12, superSpecialty: true },
    { code: 'CGHS-OR-002', name: 'Total Hip Replacement (THR)', specialty: 'Orthopaedics', nonNabh: 109650, nabh: 129000, superSpec: 148350, type: 'surgical', preauth: true, los: 12, superSpecialty: true },
    { code: 'CGHS-OR-003', name: 'Fracture Fixation - Long Bone (ORIF)', specialty: 'Orthopaedics', nonNabh: 18000, nabh: 21000, superSpec: 24150, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-OR-004', name: 'Fracture Fixation - Small Bone', specialty: 'Orthopaedics', nonNabh: 10000, nabh: 12000, superSpec: 13800, type: 'surgical', preauth: true, los: 5 },
    { code: 'CGHS-OR-005', name: 'ACL Reconstruction (Arthroscopic)', specialty: 'Orthopaedics', nonNabh: 42500, nabh: 50000, superSpec: 57500, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-OR-006', name: 'Arthroscopic Meniscectomy', specialty: 'Orthopaedics', nonNabh: 25500, nabh: 30000, superSpec: 34500, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-OR-007', name: 'Spine Fusion - Single Level', specialty: 'Orthopaedics', nonNabh: 85000, nabh: 100000, superSpec: 115000, type: 'surgical', preauth: true, los: 12, superSpecialty: true },
    { code: 'CGHS-OR-008', name: 'Disc Surgery (Lumbar Discectomy)', specialty: 'Orthopaedics', nonNabh: 42500, nabh: 50000, superSpec: 57500, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-OR-009', name: 'Closed Reduction & Casting', specialty: 'Orthopaedics', nonNabh: 3000, nabh: 3500, superSpec: 4025, type: 'minor', preauth: false, los: 1, daycare: true },
    { code: 'CGHS-OR-010', name: 'Removal of Implant / Hardware', specialty: 'Orthopaedics', nonNabh: 8500, nabh: 10000, superSpec: 11500, type: 'surgical', preauth: true, los: 3 },

    // ==========================================
    // CARDIOLOGY / CTVS
    // ==========================================
    { code: 'CGHS-CD-001', name: 'Coronary Angiography (CAG)', specialty: 'Cardiology', nonNabh: 8500, nabh: 10000, superSpec: 11500, type: 'daycare', preauth: true, los: 1, daycare: true, superSpecialty: true },
    { code: 'CGHS-CD-002', name: 'PTCA / Coronary Angioplasty - Single Stent', specialty: 'Cardiology', nonNabh: 42500, nabh: 50000, superSpec: 57500, type: 'surgical', preauth: true, los: 3, superSpecialty: true, implant: 35000 },
    { code: 'CGHS-CD-003', name: 'PTCA / Coronary Angioplasty - Double Stent', specialty: 'Cardiology', nonNabh: 55250, nabh: 65000, superSpec: 74750, type: 'surgical', preauth: true, los: 3, superSpecialty: true, implant: 70000 },
    { code: 'CGHS-CD-004', name: 'CABG (Coronary Artery Bypass Graft)', specialty: 'Cardiology', nonNabh: 127500, nabh: 150000, superSpec: 172500, type: 'surgical', preauth: true, los: 12, superSpecialty: true },
    { code: 'CGHS-CD-005', name: 'Valve Replacement (Single - Mechanical)', specialty: 'Cardiology', nonNabh: 127500, nabh: 150000, superSpec: 172500, type: 'surgical', preauth: true, los: 12, superSpecialty: true, implant: 50000 },
    { code: 'CGHS-CD-006', name: 'Permanent Pacemaker Implantation (Single Chamber)', specialty: 'Cardiology', nonNabh: 34000, nabh: 40000, superSpec: 46000, type: 'surgical', preauth: true, los: 7, superSpecialty: true, implant: 60000 },
    { code: 'CGHS-CD-007', name: 'Permanent Pacemaker Implantation (Dual Chamber)', specialty: 'Cardiology', nonNabh: 42500, nabh: 50000, superSpec: 57500, type: 'surgical', preauth: true, los: 7, superSpecialty: true, implant: 100000 },
    { code: 'CGHS-CD-008', name: 'ICD Implantation', specialty: 'Cardiology', nonNabh: 51000, nabh: 60000, superSpec: 69000, type: 'surgical', preauth: true, los: 7, superSpecialty: true, implant: 250000 },

    // ==========================================
    // NEUROLOGY / NEUROSURGERY
    // ==========================================
    { code: 'CGHS-NS-001', name: 'Craniotomy for Tumor Excision', specialty: 'Neurosurgery', nonNabh: 68000, nabh: 80000, superSpec: 92000, type: 'surgical', preauth: true, los: 12, superSpecialty: true },
    { code: 'CGHS-NS-002', name: 'VP Shunt Placement', specialty: 'Neurosurgery', nonNabh: 25500, nabh: 30000, superSpec: 34500, type: 'surgical', preauth: true, los: 7, superSpecialty: true },
    { code: 'CGHS-NS-003', name: 'Spinal Decompression Surgery', specialty: 'Neurosurgery', nonNabh: 42500, nabh: 50000, superSpec: 57500, type: 'surgical', preauth: true, los: 7, superSpecialty: true },
    { code: 'CGHS-NS-004', name: 'Cerebral Aneurysm Clipping', specialty: 'Neurosurgery', nonNabh: 85000, nabh: 100000, superSpec: 115000, type: 'surgical', preauth: true, los: 12, superSpecialty: true },
    { code: 'CGHS-NS-005', name: 'EEG (Electroencephalogram)', specialty: 'Neurology', nonNabh: 680, nabh: 800, superSpec: 920, type: 'investigation', preauth: false, los: 0, daycare: false },
    { code: 'CGHS-NS-006', name: 'Nerve Conduction Study (NCS/EMG)', specialty: 'Neurology', nonNabh: 1700, nabh: 2000, superSpec: 2300, type: 'investigation', preauth: false, los: 0, daycare: false },

    // ==========================================
    // OPHTHALMOLOGY
    // ==========================================
    { code: 'CGHS-OP-001', name: 'Cataract Surgery with IOL (Phaco)', specialty: 'Ophthalmology', nonNabh: 15000, nabh: 17500, superSpec: 20125, type: 'surgical', preauth: true, los: 1, daycare: true, implant: 5000 },
    { code: 'CGHS-OP-002', name: 'Cataract Surgery - SICS (Small Incision)', specialty: 'Ophthalmology', nonNabh: 8500, nabh: 10000, superSpec: 11500, type: 'surgical', preauth: true, los: 1, daycare: true },
    { code: 'CGHS-OP-003', name: 'Vitrectomy (Pars Plana)', specialty: 'Ophthalmology', nonNabh: 21250, nabh: 25000, superSpec: 28750, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-OP-004', name: 'Glaucoma Surgery (Trabeculectomy)', specialty: 'Ophthalmology', nonNabh: 12750, nabh: 15000, superSpec: 17250, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-OP-005', name: 'Pterygium Excision with Graft', specialty: 'Ophthalmology', nonNabh: 5100, nabh: 6000, superSpec: 6900, type: 'surgical', preauth: false, los: 1, daycare: true },
    { code: 'CGHS-OP-006', name: 'Retinal Laser Photocoagulation', specialty: 'Ophthalmology', nonNabh: 4250, nabh: 5000, superSpec: 5750, type: 'daycare', preauth: false, los: 1, daycare: true },

    // ==========================================
    // ENT
    // ==========================================
    { code: 'CGHS-EN-001', name: 'Tonsillectomy', specialty: 'ENT', nonNabh: 8500, nabh: 10000, superSpec: 11500, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-EN-002', name: 'Septoplasty / DNS Correction', specialty: 'ENT', nonNabh: 10200, nabh: 12000, superSpec: 13800, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-EN-003', name: 'FESS (Functional Endoscopic Sinus Surgery)', specialty: 'ENT', nonNabh: 17000, nabh: 20000, superSpec: 23000, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-EN-004', name: 'Mastoidectomy (Radical/Modified)', specialty: 'ENT', nonNabh: 17000, nabh: 20000, superSpec: 23000, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-EN-005', name: 'Tympanoplasty', specialty: 'ENT', nonNabh: 12750, nabh: 15000, superSpec: 17250, type: 'surgical', preauth: true, los: 5 },
    { code: 'CGHS-EN-006', name: 'Cochlear Implant', specialty: 'ENT', nonNabh: 42500, nabh: 50000, superSpec: 57500, type: 'surgical', preauth: true, los: 7, superSpecialty: true, implant: 400000 },
    { code: 'CGHS-EN-007', name: 'Audiometry (Pure Tone)', specialty: 'ENT', nonNabh: 300, nabh: 350, superSpec: 400, type: 'investigation', preauth: false, los: 0 },

    // ==========================================
    // OBSTETRICS & GYNAECOLOGY
    // ==========================================
    { code: 'CGHS-OG-001', name: 'Normal Vaginal Delivery', specialty: 'Obstetrics & Gynaecology', nonNabh: 8000, nabh: 9500, superSpec: 10925, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-OG-002', name: 'Caesarean Section (LSCS)', specialty: 'Obstetrics & Gynaecology', nonNabh: 14450, nabh: 17000, superSpec: 19550, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-OG-003', name: 'Abdominal Hysterectomy', specialty: 'Obstetrics & Gynaecology', nonNabh: 16100, nabh: 18515, superSpec: 21300, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-OG-004', name: 'Vaginal Hysterectomy', specialty: 'Obstetrics & Gynaecology', nonNabh: 16100, nabh: 18515, superSpec: 21300, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-OG-005', name: 'Laparoscopic Hysterectomy (TLH)', specialty: 'Obstetrics & Gynaecology', nonNabh: 25500, nabh: 30000, superSpec: 34500, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-OG-006', name: 'Cesarean Hysterectomy', specialty: 'Obstetrics & Gynaecology', nonNabh: 18975, nabh: 21821, superSpec: 25094, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-OG-007', name: 'Diagnostic Laparoscopy (Gynaecological)', specialty: 'Obstetrics & Gynaecology', nonNabh: 8500, nabh: 10000, superSpec: 11500, type: 'daycare', preauth: true, los: 1, daycare: true },
    { code: 'CGHS-OG-008', name: 'D&C / Endometrial Biopsy', specialty: 'Obstetrics & Gynaecology', nonNabh: 4000, nabh: 4700, superSpec: 5405, type: 'minor', preauth: false, los: 1, daycare: true },

    // ==========================================
    // UROLOGY
    // ==========================================
    { code: 'CGHS-UR-001', name: 'TURP (Transurethral Resection of Prostate)', specialty: 'Urology', nonNabh: 17000, nabh: 20000, superSpec: 23000, type: 'surgical', preauth: true, los: 5 },
    { code: 'CGHS-UR-002', name: 'Nephrectomy (Open)', specialty: 'Urology', nonNabh: 25500, nabh: 30000, superSpec: 34500, type: 'surgical', preauth: true, los: 7, superSpecialty: true },
    { code: 'CGHS-UR-003', name: 'PCNL (Percutaneous Nephrolithotomy)', specialty: 'Urology', nonNabh: 21250, nabh: 25000, superSpec: 28750, type: 'surgical', preauth: true, los: 5 },
    { code: 'CGHS-UR-004', name: 'URS (Ureteroscopy + Laser Lithotripsy)', specialty: 'Urology', nonNabh: 12750, nabh: 15000, superSpec: 17250, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-UR-005', name: 'ESWL (Extracorporeal Shock Wave Lithotripsy)', specialty: 'Urology', nonNabh: 6375, nabh: 7500, superSpec: 8625, type: 'daycare', preauth: true, los: 1, daycare: true },
    { code: 'CGHS-UR-006', name: 'Renal Transplant (Living Donor)', specialty: 'Urology', nonNabh: 170000, nabh: 200000, superSpec: 230000, type: 'surgical', preauth: true, los: 12, superSpecialty: true },
    { code: 'CGHS-UR-007', name: 'Circumcision', specialty: 'Urology', nonNabh: 3400, nabh: 4000, superSpec: 4600, type: 'minor', preauth: false, los: 1, daycare: true },

    // ==========================================
    // GASTROENTEROLOGY
    // ==========================================
    { code: 'CGHS-GE-001', name: 'Upper GI Endoscopy (Diagnostic)', specialty: 'Gastroenterology', nonNabh: 3400, nabh: 4000, superSpec: 4600, type: 'daycare', preauth: false, los: 1, daycare: true },
    { code: 'CGHS-GE-002', name: 'Colonoscopy (Diagnostic)', specialty: 'Gastroenterology', nonNabh: 4250, nabh: 5000, superSpec: 5750, type: 'daycare', preauth: false, los: 1, daycare: true },
    { code: 'CGHS-GE-003', name: 'ERCP (Diagnostic + Therapeutic)', specialty: 'Gastroenterology', nonNabh: 12750, nabh: 15000, superSpec: 17250, type: 'surgical', preauth: true, los: 3, superSpecialty: true },
    { code: 'CGHS-GE-004', name: 'Liver Biopsy (Percutaneous)', specialty: 'Gastroenterology', nonNabh: 4250, nabh: 5000, superSpec: 5750, type: 'daycare', preauth: true, los: 1, daycare: true },
    { code: 'CGHS-GE-005', name: 'Polypectomy (Endoscopic)', specialty: 'Gastroenterology', nonNabh: 5100, nabh: 6000, superSpec: 6900, type: 'daycare', preauth: true, los: 1, daycare: true },
    { code: 'CGHS-GE-006', name: 'Variceal Banding / Injection Sclerotherapy', specialty: 'Gastroenterology', nonNabh: 6375, nabh: 7500, superSpec: 8625, type: 'daycare', preauth: true, los: 1, daycare: true },

    // ==========================================
    // PULMONOLOGY
    // ==========================================
    { code: 'CGHS-PU-001', name: 'Bronchoscopy (Diagnostic)', specialty: 'Pulmonology', nonNabh: 4250, nabh: 5000, superSpec: 5750, type: 'daycare', preauth: true, los: 1, daycare: true },
    { code: 'CGHS-PU-002', name: 'Intercostal Chest Drain (ICD) Insertion', specialty: 'Pulmonology', nonNabh: 4250, nabh: 5000, superSpec: 5750, type: 'surgical', preauth: true, los: 5 },
    { code: 'CGHS-PU-003', name: 'Pulmonary Function Test (PFT/Spirometry)', specialty: 'Pulmonology', nonNabh: 425, nabh: 500, superSpec: 575, type: 'investigation', preauth: false, los: 0 },
    { code: 'CGHS-PU-004', name: 'Sleep Study (Polysomnography)', specialty: 'Pulmonology', nonNabh: 4250, nabh: 5000, superSpec: 5750, type: 'investigation', preauth: true, los: 1, daycare: true },

    // ==========================================
    // ONCOLOGY / CANCER
    // ==========================================
    { code: 'CGHS-ON-001', name: 'Chemotherapy - Single Cycle (Standard)', specialty: 'Oncology', nonNabh: 5100, nabh: 6000, superSpec: 6900, type: 'daycare', preauth: true, los: 1, daycare: true, superSpecialty: true },
    { code: 'CGHS-ON-002', name: 'Chemotherapy - Single Cycle (High Dose)', specialty: 'Oncology', nonNabh: 12750, nabh: 15000, superSpec: 17250, type: 'daycare', preauth: true, los: 1, daycare: true, superSpecialty: true },
    { code: 'CGHS-ON-003', name: 'Radiotherapy (Per Fraction) - Conventional', specialty: 'Oncology', nonNabh: 850, nabh: 1000, superSpec: 1150, type: 'daycare', preauth: true, los: 0, daycare: true },
    { code: 'CGHS-ON-004', name: 'Radiotherapy (Per Fraction) - IMRT', specialty: 'Oncology', nonNabh: 3400, nabh: 4000, superSpec: 4600, type: 'daycare', preauth: true, los: 0, daycare: true },
    { code: 'CGHS-ON-005', name: 'Radical Mastectomy (Modified Radical)', specialty: 'Oncology', nonNabh: 25500, nabh: 30000, superSpec: 34500, type: 'surgical', preauth: true, los: 7, superSpecialty: true },
    { code: 'CGHS-ON-006', name: 'Whipple Procedure (Pancreaticoduodenectomy)', specialty: 'Oncology', nonNabh: 85000, nabh: 100000, superSpec: 115000, type: 'surgical', preauth: true, los: 12, superSpecialty: true },

    // ==========================================
    // DENTAL
    // ==========================================
    { code: 'CGHS-DP-001', name: 'Tooth Extraction - Simple', specialty: 'Dental', nonNabh: 290, nabh: 340, superSpec: 390, type: 'minor', preauth: false, los: 0, daycare: true },
    { code: 'CGHS-DP-002', name: 'Tooth Extraction - Complicated (LA)', specialty: 'Dental', nonNabh: 680, nabh: 800, superSpec: 920, type: 'minor', preauth: false, los: 0, daycare: true },
    { code: 'CGHS-DP-003', name: 'Root Canal Treatment (RCT) - Single Root', specialty: 'Dental', nonNabh: 1700, nabh: 2000, superSpec: 2300, type: 'minor', preauth: false, los: 0, daycare: true },
    { code: 'CGHS-DP-004', name: 'Root Canal Treatment (RCT) - Multi Root', specialty: 'Dental', nonNabh: 2550, nabh: 3000, superSpec: 3450, type: 'minor', preauth: false, los: 0, daycare: true },
    { code: 'CGHS-DP-005', name: 'Scaling & Polishing', specialty: 'Dental', nonNabh: 720, nabh: 850, superSpec: 975, type: 'minor', preauth: false, los: 0, daycare: true },
    { code: 'CGHS-DP-006', name: 'Dental Crown (Porcelain Fused Metal)', specialty: 'Dental', nonNabh: 2550, nabh: 3000, superSpec: 3450, type: 'minor', preauth: false, los: 0, daycare: true },
    { code: 'CGHS-DP-007', name: 'Dental Implant (Single)', specialty: 'Dental', nonNabh: 17000, nabh: 20000, superSpec: 23000, type: 'surgical', preauth: true, los: 1, daycare: true, implant: 15000 },
    { code: 'CGHS-DP-008', name: 'IOPA X-Ray (RVG)', specialty: 'Dental', nonNabh: 145, nabh: 170, superSpec: 195, type: 'investigation', preauth: false, los: 0, daycare: true },
    { code: 'CGHS-DP-009', name: 'Impacted Tooth Removal (Surgical)', specialty: 'Dental', nonNabh: 2550, nabh: 3000, superSpec: 3450, type: 'surgical', preauth: false, los: 1, daycare: true },

    // ==========================================
    // PAEDIATRIC SURGERY
    // ==========================================
    { code: 'CGHS-PS-001', name: 'Herniotomy (Paediatric Inguinal Hernia)', specialty: 'Paediatric Surgery', nonNabh: 8500, nabh: 10000, superSpec: 11500, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-PS-002', name: 'Orchiopexy (Undescended Testis)', specialty: 'Paediatric Surgery', nonNabh: 10200, nabh: 12000, superSpec: 13800, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-PS-003', name: 'Hypospadias Repair', specialty: 'Paediatric Surgery', nonNabh: 17000, nabh: 20000, superSpec: 23000, type: 'surgical', preauth: true, los: 5 },
    { code: 'CGHS-PS-004', name: 'Cleft Lip Repair', specialty: 'Paediatric Surgery', nonNabh: 12750, nabh: 15000, superSpec: 17250, type: 'surgical', preauth: true, los: 5 },

    // ==========================================
    // PLASTIC SURGERY
    // ==========================================
    { code: 'CGHS-PL-001', name: 'Skin Grafting (Split Thickness) - Small Area', specialty: 'Plastic Surgery', nonNabh: 6375, nabh: 7500, superSpec: 8625, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-PL-002', name: 'Burn Dressing Under GA (Major Burns)', specialty: 'Plastic Surgery', nonNabh: 8500, nabh: 10000, superSpec: 11500, type: 'surgical', preauth: true, los: 7 },
    { code: 'CGHS-PL-003', name: 'Scar Revision Surgery', specialty: 'Plastic Surgery', nonNabh: 8500, nabh: 10000, superSpec: 11500, type: 'surgical', preauth: true, los: 3 },

    // ==========================================
    // NEPHROLOGY
    // ==========================================
    { code: 'CGHS-NP-001', name: 'Haemodialysis (Single Session)', specialty: 'Nephrology', nonNabh: 1275, nabh: 1500, superSpec: 1725, type: 'daycare', preauth: true, los: 0, daycare: true },
    { code: 'CGHS-NP-002', name: 'Peritoneal Dialysis Catheter Insertion', specialty: 'Nephrology', nonNabh: 8500, nabh: 10000, superSpec: 11500, type: 'surgical', preauth: true, los: 3 },
    { code: 'CGHS-NP-003', name: 'AV Fistula Creation', specialty: 'Nephrology', nonNabh: 8500, nabh: 10000, superSpec: 11500, type: 'surgical', preauth: true, los: 3 },

    // ==========================================
    // ICU / CRITICAL CARE
    // ==========================================
    { code: 'CGHS-IC-001', name: 'ICU Per Day Charges (Non-Ventilator)', specialty: 'Critical Care', nonNabh: 3400, nabh: 4000, superSpec: 4600, type: 'medical', preauth: true, los: 1 },
    { code: 'CGHS-IC-002', name: 'ICU Per Day Charges (With Ventilator)', specialty: 'Critical Care', nonNabh: 5100, nabh: 6000, superSpec: 6900, type: 'medical', preauth: true, los: 1 },
    { code: 'CGHS-IC-003', name: 'NICU Per Day Charges', specialty: 'Critical Care', nonNabh: 4250, nabh: 5000, superSpec: 5750, type: 'medical', preauth: true, los: 1, superSpecialty: true },

    // ==========================================
    // DERMATOLOGY
    // ==========================================
    { code: 'CGHS-DM-001', name: 'Skin Biopsy (Punch/Excision)', specialty: 'Dermatology', nonNabh: 2000, nabh: 2400, superSpec: 2760, type: 'minor', preauth: false, los: 0, daycare: true },
    { code: 'CGHS-DM-002', name: 'Electrocautery (Wart/Mole Removal)', specialty: 'Dermatology', nonNabh: 850, nabh: 1000, superSpec: 1150, type: 'minor', preauth: false, los: 0, daycare: true },

    // ==========================================
    // PSYCHIATRY
    // ==========================================
    { code: 'CGHS-PY-001', name: 'Psychiatric Evaluation (Comprehensive)', specialty: 'Psychiatry', nonNabh: 700, nabh: 700, superSpec: 700, type: 'consultation', preauth: false, los: 0 },
    { code: 'CGHS-PY-002', name: 'ECT (Electroconvulsive Therapy) - Per Session', specialty: 'Psychiatry', nonNabh: 2125, nabh: 2500, superSpec: 2875, type: 'daycare', preauth: true, los: 1, daycare: true },

    // ==========================================
    // PHYSIOTHERAPY / REHABILITATION
    // ==========================================
    { code: 'CGHS-PT-001', name: 'Physiotherapy Session (Per Visit)', specialty: 'Physiotherapy', nonNabh: 200, nabh: 250, superSpec: 290, type: 'consultation', preauth: false, los: 0 },
    { code: 'CGHS-PT-002', name: 'Occupational Therapy Session', specialty: 'Physiotherapy', nonNabh: 200, nabh: 250, superSpec: 290, type: 'consultation', preauth: false, los: 0 },

    // ==========================================
    // MEDICAL (General Medicine)
    // ==========================================
    { code: 'CGHS-MM-001', name: 'Medical Management - General Ward (Per Day)', specialty: 'General Medicine', nonNabh: 1700, nabh: 2000, superSpec: 2300, type: 'medical', preauth: true, los: 1 },
    { code: 'CGHS-MM-002', name: 'Blood Transfusion (Per Unit - Packed RBC)', specialty: 'General Medicine', nonNabh: 1050, nabh: 1250, superSpec: 1440, type: 'daycare', preauth: false, los: 1, daycare: true },
    { code: 'CGHS-MM-003', name: 'IV Infusion Therapy (Day Care)', specialty: 'General Medicine', nonNabh: 850, nabh: 1000, superSpec: 1150, type: 'daycare', preauth: false, los: 0, daycare: true },
];

async function seedCGHSRates() {
    console.log('🏥 Seeding CGHS/ECHS Rate Data...\n');
    
    let cghsCount = 0, echsCount = 0, errors = [];

    for (const pkg of CGHS_PACKAGES) {
        // Insert for CGHS
        try {
            await pool.query(
                `INSERT INTO govt_scheme_packages 
                 (scheme_code, package_code, procedure_name, specialty,
                  rate_non_nabh, rate_nabh, rate_super_specialty,
                  implant_allowance, procedure_type, is_super_specialty,
                  requires_preauth, max_los_days, is_daycare,
                  effective_from, notification_ref)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                 ON CONFLICT (scheme_code, package_code) DO UPDATE SET
                    procedure_name = EXCLUDED.procedure_name,
                    rate_non_nabh = EXCLUDED.rate_non_nabh,
                    rate_nabh = EXCLUDED.rate_nabh,
                    rate_super_specialty = EXCLUDED.rate_super_specialty,
                    implant_allowance = EXCLUDED.implant_allowance,
                    updated_at = NOW()`,
                ['cghs', pkg.code, pkg.name, pkg.specialty,
                 pkg.nonNabh, pkg.nabh, pkg.superSpec,
                 pkg.implant || 0, pkg.type, pkg.superSpecialty || false,
                 pkg.preauth, pkg.los || null, pkg.daycare || false,
                 '2025-10-13', 'CGHS OM dated 13.10.2025']
            );
            cghsCount++;
        } catch (e) {
            errors.push({ code: pkg.code, scheme: 'cghs', error: e.message });
        }

        // Insert for ECHS (same rates, different scheme code)
        const echsCode = pkg.code.replace('CGHS-', 'ECHS-');
        try {
            await pool.query(
                `INSERT INTO govt_scheme_packages 
                 (scheme_code, package_code, procedure_name, specialty,
                  rate_non_nabh, rate_nabh, rate_super_specialty,
                  implant_allowance, procedure_type, is_super_specialty,
                  requires_preauth, max_los_days, is_daycare,
                  effective_from, notification_ref)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                 ON CONFLICT (scheme_code, package_code) DO UPDATE SET
                    procedure_name = EXCLUDED.procedure_name,
                    rate_non_nabh = EXCLUDED.rate_non_nabh,
                    rate_nabh = EXCLUDED.rate_nabh,
                    rate_super_specialty = EXCLUDED.rate_super_specialty,
                    updated_at = NOW()`,
                ['echs', echsCode, pkg.name, pkg.specialty,
                 pkg.nonNabh, pkg.nabh, pkg.superSpec,
                 pkg.implant || 0, pkg.type, pkg.superSpecialty || false,
                 pkg.preauth, pkg.los || null, pkg.daycare || false,
                 '2025-12-15', 'ECHS adoption of revised CGHS rates']
            );
            echsCount++;
        } catch (e) {
            errors.push({ code: echsCode, scheme: 'echs', error: e.message });
        }
    }

    // Print summary
    console.log('='.repeat(60));
    console.log('📊 SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ CGHS packages seeded: ${cghsCount}`);
    console.log(`✅ ECHS packages seeded: ${echsCount}`);
    console.log(`❌ Errors: ${errors.length}`);
    
    if (errors.length > 0) {
        console.log('\nErrors:');
        errors.forEach(e => console.log(`  ${e.scheme}/${e.code}: ${e.error}`));
    }

    // Print specialty breakdown
    const specialtyResult = await pool.query(
        `SELECT scheme_code, specialty, COUNT(*) as count 
         FROM govt_scheme_packages 
         WHERE scheme_code IN ('cghs', 'echs')
         GROUP BY scheme_code, specialty 
         ORDER BY scheme_code, specialty`
    );
    
    console.log('\n📋 Specialty Breakdown:');
    let currentScheme = '';
    for (const row of specialtyResult.rows) {
        if (row.scheme_code !== currentScheme) {
            currentScheme = row.scheme_code;
            console.log(`\n  ${currentScheme.toUpperCase()}:`);
        }
        console.log(`    ${row.specialty}: ${row.count} packages`);
    }

    const totalResult = await pool.query(
        `SELECT scheme_code, COUNT(*) as total,
                ROUND(AVG(rate_nabh), 0) as avg_rate,
                MIN(rate_nabh) as min_rate,
                MAX(rate_nabh) as max_rate
         FROM govt_scheme_packages 
         WHERE scheme_code IN ('cghs', 'echs') AND is_active = true
         GROUP BY scheme_code`
    );

    console.log('\n📈 Summary Stats:');
    for (const row of totalResult.rows) {
        console.log(`  ${row.scheme_code.toUpperCase()}: ${row.total} packages | Avg ₹${row.avg_rate} | Range ₹${row.min_rate} - ₹${row.max_rate}`);
    }

    return { cghsCount, echsCount, errors: errors.length };
}

// Run if called directly
if (require.main === module) {
    seedCGHSRates()
        .then(result => {
            console.log('\n✨ Done!', result);
            process.exit(0);
        })
        .catch(err => {
            console.error('💥 Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { seedCGHSRates, CGHS_PACKAGES };
