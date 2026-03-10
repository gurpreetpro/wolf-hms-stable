export const LAB_TEST_DEFINITIONS = {
    // Hematology
    'CBC': [
        { key: 'hemoglobin', label: 'Hemoglobin (g/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 12.5', note: 'Normal: 12-16 g/dL' },
        { key: 'wbc', label: 'WBC Count (/µL)', type: 'number', placeholder: 'e.g., 7500', note: 'Normal: 4,500-11,000' },
        { key: 'platelets', label: 'Platelets (/µL)', type: 'number', placeholder: 'e.g., 250000', note: 'Normal: 150,000-400,000' },
        { key: 'rbc', label: 'RBC Count (million/µL)', type: 'number', step: '0.1', placeholder: 'e.g., 4.5', note: 'Normal: 4.5-5.5' }
    ],
    'Complete Blood Count': [
        { key: 'hemoglobin', label: 'Hemoglobin (g/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 12.5', note: 'Normal: 12-16 g/dL' },
        { key: 'wbc', label: 'WBC Count (/µL)', type: 'number', placeholder: 'e.g., 7500', note: 'Normal: 4,500-11,000' },
        { key: 'platelets', label: 'Platelets (/µL)', type: 'number', placeholder: 'e.g., 250000', note: 'Normal: 150,000-400,000' },
        { key: 'rbc', label: 'RBC Count (million/µL)', type: 'number', step: '0.1', placeholder: 'e.g., 4.5', note: 'Normal: 4.5-5.5' }
    ],
    'Platelet Count': [
        { key: 'platelets', label: 'Platelet Count (/µL)', type: 'number', placeholder: 'e.g., 250000', note: 'Normal: 150,000-400,000' }
    ],
    'Hemoglobin': [
        { key: 'hemoglobin', label: 'Hemoglobin (g/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 12.5', note: 'Normal: 12-16 g/dL (Men), 11.5-15 g/dL (Women)' }
    ],
    'WBC Count': [
        { key: 'wbc', label: 'WBC Count (/µL)', type: 'number', placeholder: 'e.g., 7500', note: 'Normal: 4,500-11,000' },
        { key: 'neutrophils', label: 'Neutrophils (%)', type: 'number', placeholder: 'e.g., 60', note: 'Normal: 40-70%' },
        { key: 'lymphocytes', label: 'Lymphocytes (%)', type: 'number', placeholder: 'e.g., 30', note: 'Normal: 20-40%' }
    ],
    'ESR': [
        { key: 'esr', label: 'ESR (mm/hr)', type: 'number', placeholder: 'e.g., 10', note: 'Normal: 0-20 mm/hr' }
    ],
    'RBC Count': [
        { key: 'rbc', label: 'RBC Count (million/µL)', type: 'number', step: '0.1', placeholder: 'e.g., 4.5', note: 'Normal: 4.5-5.5 (Men), 4.0-5.0 (Women)' }
    ],

    // Lipid Profile
    'Lipid Profile': [
        { key: 'cholesterol_total', label: 'Total Cholesterol (mg/dL)', type: 'number', placeholder: 'e.g., 180', note: 'Desirable: <200' },
        { key: 'hdl', label: 'HDL Cholesterol (mg/dL)', type: 'number', placeholder: 'e.g., 50', note: 'Low Risk: >40' },
        { key: 'ldl', label: 'LDL Cholesterol (mg/dL)', type: 'number', placeholder: 'e.g., 100', note: 'Optimal: <100' },
        { key: 'triglycerides', label: 'Triglycerides (mg/dL)', type: 'number', placeholder: 'e.g., 120', note: 'Normal: <150' },
        { key: 'vldl', label: 'VLDL (mg/dL)', type: 'number', placeholder: 'e.g., 25', note: 'Normal: 5-40' }
    ],
    'Cholesterol': [
        { key: 'cholesterol_total', label: 'Total Cholesterol (mg/dL)', type: 'number', placeholder: 'e.g., 180', note: 'Desirable: <200' }
    ],
    'HDL Cholesterol': [
        { key: 'hdl', label: 'HDL Cholesterol (mg/dL)', type: 'number', placeholder: 'e.g., 50', note: 'Low Risk: >40' }
    ],
    'LDL Cholesterol': [
        { key: 'ldl', label: 'LDL Cholesterol (mg/dL)', type: 'number', placeholder: 'e.g., 100', note: 'Optimal: <100' }
    ],
    'Triglycerides': [
        { key: 'triglycerides', label: 'Triglycerides (mg/dL)', type: 'number', placeholder: 'e.g., 120', note: 'Normal: <150' }
    ],

    // Liver Function
    'Liver Function Test': [
        { key: 'alt', label: 'ALT (SGPT) (U/L)', type: 'number', placeholder: 'e.g., 25', note: 'Normal: 7-56' },
        { key: 'ast', label: 'AST (SGOT) (U/L)', type: 'number', placeholder: 'e.g., 30', note: 'Normal: 10-40' },
        { key: 'alp', label: 'ALP (U/L)', type: 'number', placeholder: 'e.g., 80', note: 'Normal: 44-147' },
        { key: 'bilirubin_total', label: 'Total Bilirubin (mg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 0.8', note: 'Normal: 0.1-1.2' },
        { key: 'albumin', label: 'Albumin (g/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 4.0', note: 'Normal: 3.5-5.0' }
    ],
    'LFT': [
        { key: 'alt', label: 'ALT (SGPT) (U/L)', type: 'number', placeholder: 'e.g., 25', note: 'Normal: 7-56' },
        { key: 'ast', label: 'AST (SGOT) (U/L)', type: 'number', placeholder: 'e.g., 30', note: 'Normal: 10-40' },
        { key: 'alp', label: 'ALP (U/L)', type: 'number', placeholder: 'e.g., 80', note: 'Normal: 44-147' },
        { key: 'bilirubin_total', label: 'Total Bilirubin (mg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 0.8', note: 'Normal: 0.1-1.2' }
    ],
    'SGPT': [
        { key: 'alt', label: 'SGPT/ALT (U/L)', type: 'number', placeholder: 'e.g., 25', note: 'Normal: 7-56 U/L' }
    ],
    'SGOT': [
        { key: 'ast', label: 'SGOT/AST (U/L)', type: 'number', placeholder: 'e.g., 30', note: 'Normal: 10-40 U/L' }
    ],
    'Bilirubin': [
        { key: 'bilirubin_total', label: 'Total Bilirubin (mg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 0.8', note: 'Normal: 0.1-1.2' },
        { key: 'bilirubin_direct', label: 'Direct Bilirubin (mg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 0.2', note: 'Normal: 0-0.3' }
    ],

    // Kidney Function
    'Kidney Function Test': [
        { key: 'creatinine', label: 'Creatinine (mg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 1.0', note: 'Normal: 0.7-1.3' },
        { key: 'urea', label: 'Blood Urea (mg/dL)', type: 'number', placeholder: 'e.g., 30', note: 'Normal: 15-45' },
        { key: 'bun', label: 'BUN (mg/dL)', type: 'number', placeholder: 'e.g., 15', note: 'Normal: 7-20' },
        { key: 'uric_acid', label: 'Uric Acid (mg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 5.5', note: 'Normal: 3.5-7.2' }
    ],
    'KFT': [
        { key: 'creatinine', label: 'Creatinine (mg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 1.0', note: 'Normal: 0.7-1.3' },
        { key: 'urea', label: 'Blood Urea (mg/dL)', type: 'number', placeholder: 'e.g., 30', note: 'Normal: 15-45' },
        { key: 'uric_acid', label: 'Uric Acid (mg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 5.5', note: 'Normal: 3.5-7.2' }
    ],
    'Creatinine': [
        { key: 'creatinine', label: 'Creatinine (mg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 1.0', note: 'Normal: 0.7-1.3' }
    ],
    'Urea': [
        { key: 'urea', label: 'Blood Urea (mg/dL)', type: 'number', placeholder: 'e.g., 30', note: 'Normal: 15-45' }
    ],
    'Uric Acid': [
        { key: 'uric_acid', label: 'Uric Acid (mg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 5.5', note: 'Normal: 3.5-7.2 (Men), 2.5-6.2 (Women)' }
    ],

    // Blood Sugar
    'Blood Sugar Fasting': [
        { key: 'sugar_fasting', label: 'Fasting Blood Sugar (mg/dL)', type: 'number', placeholder: 'e.g., 90', note: 'Normal: 70-100' }
    ],
    'Blood Sugar PP': [
        { key: 'sugar_pp', label: 'Post Prandial Blood Sugar (mg/dL)', type: 'number', placeholder: 'e.g., 140', note: 'Normal: <140' }
    ],
    'Blood Sugar Random': [
        { key: 'sugar_random', label: 'Random Blood Sugar (mg/dL)', type: 'number', placeholder: 'e.g., 120', note: 'Normal: <200' }
    ],
    'HbA1c': [
        { key: 'hba1c', label: 'HbA1c (%)', type: 'number', step: '0.1', placeholder: 'e.g., 5.5', note: 'Normal: <5.7%, Diabetic: >6.5%' }
    ],
    'Glucose Tolerance Test': [
        { key: 'sugar_fasting', label: 'Fasting (mg/dL)', type: 'number', placeholder: 'e.g., 90', note: 'Normal: <100' },
        { key: 'sugar_1hr', label: '1 Hour (mg/dL)', type: 'number', placeholder: 'e.g., 180', note: 'Normal: <180' },
        { key: 'sugar_2hr', label: '2 Hour (mg/dL)', type: 'number', placeholder: 'e.g., 140', note: 'Normal: <140' }
    ],

    // Thyroid
    'Thyroid Profile': [
        { key: 'tsh', label: 'TSH (mIU/L)', type: 'number', step: '0.01', placeholder: 'e.g., 2.5', note: 'Normal: 0.4-4.0' },
        { key: 't3', label: 'T3 (ng/dL)', type: 'number', placeholder: 'e.g., 120', note: 'Normal: 80-200' },
        { key: 't4', label: 'T4 (µg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 7.0', note: 'Normal: 5.0-12.0' }
    ],
    'TSH': [
        { key: 'tsh', label: 'TSH (mIU/L)', type: 'number', step: '0.01', placeholder: 'e.g., 2.5', note: 'Normal: 0.4-4.0' }
    ],
    'T3': [
        { key: 't3', label: 'T3 (ng/dL)', type: 'number', placeholder: 'e.g., 120', note: 'Normal: 80-200' }
    ],
    'T4': [
        { key: 't4', label: 'T4 (µg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 7.0', note: 'Normal: 5.0-12.0' }
    ],

    // Urine
    'Urine Routine': [
        { key: 'urine_color', label: 'Color', type: 'text', placeholder: 'e.g., Yellow', note: 'Normal: Pale to Dark Yellow' },
        { key: 'urine_ph', label: 'pH', type: 'number', step: '0.1', placeholder: 'e.g., 6.0', note: 'Normal: 4.5-8.0' },
        { key: 'urine_protein', label: 'Protein', type: 'text', placeholder: 'e.g., Negative', note: 'Normal: Negative' },
        { key: 'urine_glucose', label: 'Glucose', type: 'text', placeholder: 'e.g., Negative', note: 'Normal: Negative' },
        { key: 'urine_rbc', label: 'RBC', type: 'text', placeholder: 'e.g., 0-2/HPF', note: 'Normal: 0-2/HPF' },
        { key: 'urine_wbc', label: 'WBC', type: 'text', placeholder: 'e.g., 0-5/HPF', note: 'Normal: 0-5/HPF' }
    ],
    'Urine Culture': [
        { key: 'organism', label: 'Organism Isolated', type: 'text', placeholder: 'e.g., No growth', note: 'Normal: No growth' },
        { key: 'colony_count', label: 'Colony Count (CFU/mL)', type: 'text', placeholder: 'e.g., <10,000', note: 'Significant: >100,000' },
        { key: 'sensitivity', label: 'Sensitivity Pattern', type: 'text', placeholder: 'e.g., Sensitive to Amoxicillin', note: 'Antibiotic sensitivity' }
    ],

    // Electrolytes
    'Electrolytes': [
        { key: 'sodium', label: 'Sodium (mEq/L)', type: 'number', placeholder: 'e.g., 140', note: 'Normal: 136-145' },
        { key: 'potassium', label: 'Potassium (mEq/L)', type: 'number', step: '0.1', placeholder: 'e.g., 4.0', note: 'Normal: 3.5-5.0' },
        { key: 'chloride', label: 'Chloride (mEq/L)', type: 'number', placeholder: 'e.g., 100', note: 'Normal: 98-106' }
    ],
    'Sodium': [
        { key: 'sodium', label: 'Sodium (mEq/L)', type: 'number', placeholder: 'e.g., 140', note: 'Normal: 136-145' }
    ],
    'Potassium': [
        { key: 'potassium', label: 'Potassium (mEq/L)', type: 'number', step: '0.1', placeholder: 'e.g., 4.0', note: 'Normal: 3.5-5.0' }
    ],
    'Calcium': [
        { key: 'calcium', label: 'Calcium (mg/dL)', type: 'number', step: '0.1', placeholder: 'e.g., 9.5', note: 'Normal: 8.5-10.5' }
    ],

    // Vitamins
    'Vitamin D': [
        { key: 'vitamin_d', label: 'Vitamin D (ng/mL)', type: 'number', placeholder: 'e.g., 30', note: 'Sufficient: 30-100, Deficient: <20' }
    ],
    'Vitamin B12': [
        { key: 'vitamin_b12', label: 'Vitamin B12 (pg/mL)', type: 'number', placeholder: 'e.g., 400', note: 'Normal: 200-900' }
    ],
    'Iron Profile': [
        { key: 'serum_iron', label: 'Serum Iron (µg/dL)', type: 'number', placeholder: 'e.g., 100', note: 'Normal: 60-170' },
        { key: 'tibc', label: 'TIBC (µg/dL)', type: 'number', placeholder: 'e.g., 300', note: 'Normal: 250-370' },
        { key: 'ferritin', label: 'Ferritin (ng/mL)', type: 'number', placeholder: 'e.g., 100', note: 'Normal: 12-150 (Women), 12-300 (Men)' }
    ],

    // Wellness Packages
    'General': [
        { key: 'result_value', label: 'Result Value', type: 'text', placeholder: 'Enter main result', note: 'Main numeric or qualitative result' },
        { key: 'units', label: 'Units', type: 'text', placeholder: 'e.g., mg/dL', note: 'Optional' },
        { key: 'reference_range', label: 'Reference Range', type: 'text', placeholder: 'e.g., 10-20', note: 'Optional' }
    ],
    'Basic Health Checkup': [
        // SGOT (AST)
        { key: 'ast', label: 'SGOT (AST)', type: 'number', placeholder: 'e.g., 30', note: 'Normal: 10-40 U/L' },
        // SGPT (ALT)
        { key: 'alt', label: 'SGPT (ALT)', type: 'number', placeholder: 'e.g., 25', note: 'Normal: 7-56 U/L' },
        // Serum Creatinine
        { key: 'creatinine', label: 'Serum Creatinine', type: 'number', step: '0.1', placeholder: 'e.g., 1.0', note: 'Normal: 0.7-1.3 mg/dL' },
        // Fasting Blood Sugar
        { key: 'glucose_fasting', label: 'Fasting Blood Sugar', type: 'number', placeholder: 'e.g., 90', note: 'Normal: 70-100 mg/dL' },
        // Lipid Profile
        { key: 'cholesterol_total', label: 'Total Cholesterol', type: 'number', placeholder: 'e.g., 180', note: 'Desirable: <200 mg/dL' },
        { key: 'hdl', label: 'HDL Cholesterol', type: 'number', placeholder: 'e.g., 50', note: 'Low Risk: >40 mg/dL' },
        { key: 'ldl', label: 'LDL Cholesterol', type: 'number', placeholder: 'e.g., 100', note: 'Optimal: <100 mg/dL' },
        { key: 'triglycerides', label: 'Triglycerides', type: 'number', placeholder: 'e.g., 120', note: 'Normal: <150 mg/dL' }
    ],
    'Comprehensive Wellness': [
        // CBC
        { key: 'hemoglobin', label: 'Hemoglobin', type: 'number', step: '0.1', placeholder: 'e.g., 14.0', note: 'Normal: 12-16 g/dL' },
        { key: 'wbc', label: 'WBC Count', type: 'number', placeholder: 'e.g., 7500', note: 'Normal: 4,500-11,000 /µL' },
        // Fasting Blood Sugar
        { key: 'glucose_fasting', label: 'Fasting Blood Sugar', type: 'number', placeholder: 'e.g., 90', note: 'Normal: 70-100 mg/dL' },
        // HbA1c
        { key: 'hba1c', label: 'HbA1c', type: 'number', step: '0.1', placeholder: 'e.g., 5.5', note: 'Normal: <5.7%' },
        // Lipid Profile
        { key: 'cholesterol_total', label: 'Total Cholesterol', type: 'number', placeholder: 'e.g., 180', note: 'Desirable: <200 mg/dL' },
        { key: 'hdl', label: 'HDL Cholesterol', type: 'number', placeholder: 'e.g., 50', note: 'Low Risk: >40 mg/dL' },
        { key: 'ldl', label: 'LDL Cholesterol', type: 'number', placeholder: 'e.g., 100', note: 'Optimal: <100 mg/dL' },
        { key: 'triglycerides', label: 'Triglycerides', type: 'number', placeholder: 'e.g., 120', note: 'Normal: <150 mg/dL' },
        // LFT
        { key: 'ast', label: 'SGOT (AST)', type: 'number', placeholder: 'e.g., 30', note: 'Normal: 10-40 U/L' },
        { key: 'alt', label: 'SGPT (ALT)', type: 'number', placeholder: 'e.g., 25', note: 'Normal: 7-56 U/L' },
        { key: 'bilirubin_total', label: 'Total Bilirubin', type: 'number', step: '0.1', placeholder: 'e.g., 0.8', note: 'Normal: 0.1-1.2 mg/dL' },
        // KFT
        { key: 'creatinine', label: 'Serum Creatinine', type: 'number', step: '0.1', placeholder: 'e.g., 1.0', note: 'Normal: 0.7-1.3 mg/dL' },
        { key: 'urea', label: 'Blood Urea', type: 'number', placeholder: 'e.g., 30', note: 'Normal: 15-45 mg/dL' },
        // Thyroid Profile
        { key: 'tsh', label: 'TSH', type: 'number', step: '0.01', placeholder: 'e.g., 2.5', note: 'Normal: 0.4-4.0 mIU/L' },
        { key: 't3', label: 'T3', type: 'number', placeholder: 'e.g., 120', note: 'Normal: 80-200 ng/dL' },
        { key: 't4', label: 'T4', type: 'number', step: '0.1', placeholder: 'e.g., 7.0', note: 'Normal: 5.0-12.0 µg/dL' },
        // Vitamins
        { key: 'vitamin_d', label: 'Vitamin D', type: 'number', placeholder: 'e.g., 30', note: 'Sufficient: 30-100 ng/mL' },
        { key: 'vitamin_b12', label: 'Vitamin B12', type: 'number', placeholder: 'e.g., 400', note: 'Normal: 200-900 pg/mL' },
        { key: 'calcium', label: 'Calcium', type: 'number', step: '0.1', placeholder: 'e.g., 9.5', note: 'Normal: 8.5-10.5 mg/dL' }
    ],
    'Diabetic Care Package': [
        // Blood Sugar
        { key: 'glucose_fasting', label: 'Fasting Blood Sugar', type: 'number', placeholder: 'e.g., 90', note: 'Normal: 70-100 mg/dL' },
        { key: 'glucose_pp', label: 'Post Prandial Blood Sugar', type: 'number', placeholder: 'e.g., 140', note: 'Normal: <140 mg/dL' },
        { key: 'hba1c', label: 'HbA1c', type: 'number', step: '0.1', placeholder: 'e.g., 6.0', note: 'Normal: <5.7%, Diabetic: >6.5%' },
        // Lipid Profile
        { key: 'cholesterol_total', label: 'Total Cholesterol', type: 'number', placeholder: 'e.g., 180', note: 'Desirable: <200 mg/dL' },
        { key: 'hdl', label: 'HDL Cholesterol', type: 'number', placeholder: 'e.g., 50', note: 'Low Risk: >40 mg/dL' },
        { key: 'ldl', label: 'LDL Cholesterol', type: 'number', placeholder: 'e.g., 100', note: 'Optimal: <100 mg/dL' },
        { key: 'triglycerides', label: 'Triglycerides', type: 'number', placeholder: 'e.g., 120', note: 'Normal: <150 mg/dL' },
        // Kidney
        { key: 'creatinine', label: 'Serum Creatinine', type: 'number', step: '0.1', placeholder: 'e.g., 1.0', note: 'Normal: 0.7-1.3 mg/dL' },
        // Urine
        { key: 'urine_microalbumin', label: 'Urine Microalbumin', type: 'number', placeholder: 'e.g., 15', note: 'Normal: <30 mg/L' }
    ],
    "Women's Wellness": [
        // CBC
        { key: 'hemoglobin', label: 'Hemoglobin', type: 'number', step: '0.1', placeholder: 'e.g., 12.5', note: 'Normal: 11.5-15 g/dL' },
        { key: 'wbc', label: 'WBC Count', type: 'number', placeholder: 'e.g., 7000', note: 'Normal: 4,500-11,000 /µL' },
        // Thyroid Profile
        { key: 'tsh', label: 'TSH', type: 'number', step: '0.01', placeholder: 'e.g., 2.0', note: 'Normal: 0.4-4.0 mIU/L' },
        { key: 't3', label: 'T3', type: 'number', placeholder: 'e.g., 120', note: 'Normal: 80-200 ng/dL' },
        { key: 't4', label: 'T4', type: 'number', step: '0.1', placeholder: 'e.g., 7.0', note: 'Normal: 5.0-12.0 µg/dL' },
        // Minerals
        { key: 'calcium', label: 'Calcium', type: 'number', step: '0.1', placeholder: 'e.g., 9.5', note: 'Normal: 8.5-10.5 mg/dL' },
        { key: 'vitamin_d', label: 'Vitamin D', type: 'number', placeholder: 'e.g., 30', note: 'Sufficient: 30-100 ng/mL' },
        // Iron Studies
        { key: 'serum_iron', label: 'Serum Iron', type: 'number', placeholder: 'e.g., 100', note: 'Normal: 60-170 µg/dL' },
        { key: 'ferritin', label: 'Ferritin', type: 'number', placeholder: 'e.g., 50', note: 'Normal: 12-150 ng/mL' },
        // Hormones
        { key: 'fsh', label: 'FSH', type: 'number', step: '0.1', placeholder: 'e.g., 6.0', note: 'Varies by cycle phase' },
        { key: 'lh', label: 'LH', type: 'number', step: '0.1', placeholder: 'e.g., 10.0', note: 'Varies by cycle phase' }
    ]
};

// Helper function to find the best matching test definition
export const getTestDefinition = (testName) => {
    if (!testName) return LAB_TEST_DEFINITIONS['General'];
    
    // Exact match
    if (LAB_TEST_DEFINITIONS[testName]) {
        return LAB_TEST_DEFINITIONS[testName];
    }
    
    // Case-insensitive match
    const lowerTestName = testName.toLowerCase();
    for (const key of Object.keys(LAB_TEST_DEFINITIONS)) {
        if (key.toLowerCase() === lowerTestName) {
            return LAB_TEST_DEFINITIONS[key];
        }
    }
    
    // Partial match (test name contains key or key contains test name)
    for (const key of Object.keys(LAB_TEST_DEFINITIONS)) {
        if (lowerTestName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerTestName)) {
            return LAB_TEST_DEFINITIONS[key];
        }
    }
    
    // Default fallback
    return LAB_TEST_DEFINITIONS['General'];
};
