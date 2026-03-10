/**
 * Clinical Catalog for AI Fallback
 * Based on Indian Standards:
 * - ICMR Standard Treatment Workflows (STWs)
 * - National Health Mission (NHM) Essential Drug List
 * - National List of Essential Medicines (NLEM) India
 * 
 * This provides rule-based clinical suggestions when Gemini API is unavailable.
 */

// ============================================
// DIAGNOSIS CATALOG
// Maps symptoms to possible diagnoses with ICD-10 codes
// ============================================

const diagnosisCatalog = {
    // RESPIRATORY CONDITIONS
    'cough': {
        diagnoses: [
            { name: 'Acute Upper Respiratory Tract Infection (URTI)', icd10: 'J06.9', confidence: 'High', reasoning: 'Common cause of cough, often viral' },
            { name: 'Acute Bronchitis', icd10: 'J20.9', confidence: 'Medium', reasoning: 'If cough is productive with mild fever' },
            { name: 'Allergic Rhinitis', icd10: 'J30.4', confidence: 'Low', reasoning: 'If accompanied by sneezing and nasal symptoms' }
        ],
        redFlags: ['Cough > 2 weeks (rule out TB)', 'Blood in sputum', 'Significant weight loss', 'Night sweats'],
        recommendedTests: ['Chest X-ray if persistent', 'Sputum AFB if > 2 weeks', 'CBC']
    },

    'fever': {
        diagnoses: [
            { name: 'Viral Fever (Unspecified)', icd10: 'A99', confidence: 'High', reasoning: 'Most common cause of acute fever' },
            { name: 'Acute Pharyngitis', icd10: 'J02.9', confidence: 'Medium', reasoning: 'If sore throat present' },
            { name: 'Urinary Tract Infection', icd10: 'N39.0', confidence: 'Medium', reasoning: 'If burning urination or frequency' }
        ],
        redFlags: ['Fever > 5 days', 'Rash with fever', 'Altered consciousness', 'Severe headache with stiff neck'],
        recommendedTests: ['CBC', 'Malaria (RDT/Smear) in endemic areas', 'Urine Routine', 'Dengue NS1/IgM if >2 days']
    },

    'headache': {
        diagnoses: [
            { name: 'Tension-type Headache', icd10: 'G44.2', confidence: 'High', reasoning: 'Most common primary headache' },
            { name: 'Migraine without aura', icd10: 'G43.0', confidence: 'Medium', reasoning: 'If throbbing, unilateral, with nausea' },
            { name: 'Sinusitis', icd10: 'J32.9', confidence: 'Medium', reasoning: 'If frontal headache with nasal congestion' }
        ],
        redFlags: ['Sudden onset severe headache', 'Headache with fever and neck stiffness', 'Progressive worsening', 'Visual changes'],
        recommendedTests: ['BP measurement', 'Eye examination', 'CT Brain if red flags present']
    },

    'stomach pain': {
        diagnoses: [
            { name: 'Acute Gastritis', icd10: 'K29.1', confidence: 'High', reasoning: 'Epigastric pain, often related to food/NSAIDs' },
            { name: 'Functional Dyspepsia', icd10: 'K30', confidence: 'Medium', reasoning: 'Recurrent without alarm features' },
            { name: 'Gastroesophageal Reflux Disease (GERD)', icd10: 'K21.0', confidence: 'Medium', reasoning: 'If heartburn or regurgitation' }
        ],
        redFlags: ['Severe pain with rigidity', 'Vomiting blood', 'Black stools', 'Weight loss > 5%', 'Age > 45 with new symptoms'],
        recommendedTests: ['H. pylori test', 'Upper GI Endoscopy if alarm features', 'Ultrasound Abdomen']
    },

    'diarrhea': {
        diagnoses: [
            { name: 'Acute Gastroenteritis', icd10: 'A09', confidence: 'High', reasoning: 'Most common cause of acute diarrhea' },
            { name: 'Bacterial Dysentery', icd10: 'A03.9', confidence: 'Medium', reasoning: 'If bloody stools with mucus' },
            { name: 'Food Poisoning', icd10: 'A05.9', confidence: 'Medium', reasoning: 'If onset after eating, with vomiting' }
        ],
        redFlags: ['Bloody diarrhea', 'High fever', 'Dehydration signs', 'Duration > 3 days', 'Recent antibiotic use'],
        recommendedTests: ['Stool Routine', 'Stool Culture if bloody', 'CBC', 'Serum electrolytes']
    },

    'joint pain': {
        diagnoses: [
            { name: 'Osteoarthritis', icd10: 'M15.9', confidence: 'High', reasoning: 'Common in elderly, weight-bearing joints' },
            { name: 'Rheumatoid Arthritis', icd10: 'M06.9', confidence: 'Medium', reasoning: 'If symmetrical, small joints, morning stiffness' },
            { name: 'Viral Arthralgia', icd10: 'B34.9', confidence: 'Medium', reasoning: 'If acute onset with fever (Chikungunya endemic)' }
        ],
        redFlags: ['Joint swelling with fever', 'Single hot swollen joint (septic arthritis)', 'Trauma history'],
        recommendedTests: ['X-ray of affected joint', 'CBC, ESR, CRP', 'RA Factor, Anti-CCP if RA suspected', 'Uric acid if gout suspected']
    },

    'back pain': {
        diagnoses: [
            { name: 'Mechanical Low Back Pain', icd10: 'M54.5', confidence: 'High', reasoning: 'Most common, no neurological deficit' },
            { name: 'Lumbar Strain', icd10: 'S39.0', confidence: 'Medium', reasoning: 'If acute onset after lifting/activity' },
            { name: 'Intervertebral Disc Disorder', icd10: 'M51.1', confidence: 'Low', reasoning: 'If radicular symptoms present' }
        ],
        redFlags: ['Leg weakness', 'Bladder/bowel dysfunction', 'Fever', 'History of cancer', 'Age > 50 new onset'],
        recommendedTests: ['X-ray Lumbar spine', 'MRI if red flags', 'CBC, ESR if infection suspected']
    },

    'chest pain': {
        diagnoses: [
            { name: 'Musculoskeletal Chest Pain', icd10: 'R07.89', confidence: 'Medium', reasoning: 'If reproducible on palpation' },
            { name: 'Gastroesophageal Reflux', icd10: 'K21.0', confidence: 'Medium', reasoning: 'If burning, worse after meals' },
            { name: 'Anxiety-related Chest Pain', icd10: 'F41.9', confidence: 'Low', reasoning: 'If atypical features with anxiety' }
        ],
        redFlags: ['Central crushing pain', 'Radiation to arm/jaw', 'Sweating', 'Breathlessness', 'Known cardiac disease'],
        recommendedTests: ['ECG (mandatory)', 'Troponin if cardiac suspected', 'Chest X-ray', 'Echo if indicated']
    },

    'sore throat': {
        diagnoses: [
            { name: 'Acute Viral Pharyngitis', icd10: 'J02.9', confidence: 'High', reasoning: 'Most common, often with rhinorrhea' },
            { name: 'Acute Tonsillitis', icd10: 'J03.9', confidence: 'Medium', reasoning: 'If swollen tonsils with exudate' },
            { name: 'Streptococcal Pharyngitis', icd10: 'J02.0', confidence: 'Medium', reasoning: 'If high fever, no cough, tender nodes' }
        ],
        redFlags: ['Difficulty swallowing/breathing', 'Drooling', 'Trismus', 'Unilateral swelling (peritonsillar abscess)'],
        recommendedTests: ['Throat swab for culture', 'ASO titre if recurrent', 'CBC']
    },

    'skin rash': {
        diagnoses: [
            { name: 'Allergic Dermatitis', icd10: 'L23.9', confidence: 'High', reasoning: 'If itchy, contact history, eczematous' },
            { name: 'Urticaria', icd10: 'L50.9', confidence: 'Medium', reasoning: 'If wheals, transient, itchy' },
            { name: 'Fungal Skin Infection (Dermatophytosis)', icd10: 'B35.9', confidence: 'Medium', reasoning: 'If ring-shaped, scaly margins' }
        ],
        redFlags: ['Rash with fever (consider dengue, measles)', 'Mucosal involvement', 'Blistering', 'Rapidly spreading'],
        recommendedTests: ['KOH mount if fungal', 'Skin biopsy if unclear', 'CBC, viral serology if febrile']
    },

    'breathing difficulty': {
        diagnoses: [
            { name: 'Acute Exacerbation of Asthma', icd10: 'J45.901', confidence: 'High', reasoning: 'If known asthmatic, wheezing' },
            { name: 'Acute Bronchitis', icd10: 'J20.9', confidence: 'Medium', reasoning: 'If cough, fever, no previous asthma' },
            { name: 'COPD Exacerbation', icd10: 'J44.1', confidence: 'Medium', reasoning: 'If smoking history, chronic symptoms' }
        ],
        redFlags: ['Severe distress', 'Unable to speak sentences', 'Cyanosis', 'Silent chest', 'SpO2 < 92%'],
        recommendedTests: ['SpO2 monitoring', 'Peak Flow/Spirometry', 'Chest X-ray', 'ABG if severe']
    },

    'diabetes symptoms': {
        diagnoses: [
            { name: 'Type 2 Diabetes Mellitus', icd10: 'E11.9', confidence: 'High', reasoning: 'If polyuria, polydipsia, weight loss with high glucose' },
            { name: 'Pre-diabetes', icd10: 'R73.03', confidence: 'Medium', reasoning: 'If borderline fasting glucose' },
            { name: 'Diabetic Ketoacidosis', icd10: 'E10.10', confidence: 'Low', reasoning: 'If vomiting, abdominal pain, fruity breath' }
        ],
        redFlags: ['Altered consciousness', 'Vomiting', 'Severe dehydration', 'Fruity breath odor'],
        recommendedTests: ['Fasting Blood Glucose', 'HbA1c', 'Urine for ketones', 'Lipid Profile', 'Serum Creatinine']
    },

    'hypertension symptoms': {
        diagnoses: [
            { name: 'Essential Hypertension', icd10: 'I10', confidence: 'High', reasoning: 'Most common cause; BP ≥140/90 on 2 occasions' },
            { name: 'Hypertensive Urgency', icd10: 'I16.0', confidence: 'Medium', reasoning: 'If BP severely elevated without organ damage' },
            { name: 'White Coat Hypertension', icd10: 'R03.0', confidence: 'Low', reasoning: 'If elevated only in clinic settings' }
        ],
        redFlags: ['Severe headache', 'Visual disturbance', 'Chest pain', 'Neurological symptoms', 'BP > 180/120'],
        recommendedTests: ['Multiple BP readings', 'ECG', 'Serum Creatinine', 'Urine Routine', 'Fundoscopy']
    },

    'anxiety': {
        diagnoses: [
            { name: 'Generalized Anxiety Disorder', icd10: 'F41.1', confidence: 'High', reasoning: 'If persistent worry, restlessness > 6 months' },
            { name: 'Panic Disorder', icd10: 'F41.0', confidence: 'Medium', reasoning: 'If recurrent unexpected panic attacks' },
            { name: 'Adjustment Disorder with Anxiety', icd10: 'F43.22', confidence: 'Medium', reasoning: 'If triggered by identifiable stressor' }
        ],
        redFlags: ['Suicidal ideation', 'Substance use', 'Severe functional impairment', 'Psychotic features'],
        recommendedTests: ['Thyroid function (TSH)', 'CBC', 'ECG if palpitations', 'Mental state examination']
    },

    'depression': {
        diagnoses: [
            { name: 'Major Depressive Episode', icd10: 'F32.9', confidence: 'High', reasoning: 'If low mood, anhedonia > 2 weeks with other symptoms' },
            { name: 'Adjustment Disorder with Depressed Mood', icd10: 'F43.21', confidence: 'Medium', reasoning: 'If clear precipitating life event' },
            { name: 'Dysthymic Disorder', icd10: 'F34.1', confidence: 'Low', reasoning: 'If chronic low-grade depression > 2 years' }
        ],
        redFlags: ['Suicidal ideation/plan', 'Psychotic features', 'Manic episodes', 'Substance abuse'],
        recommendedTests: ['PHQ-9 scoring', 'Thyroid function', 'CBC', 'Vitamin B12/D levels']
    }
};

// ============================================
// PRESCRIPTION CATALOG
// Based on NLEM India and NHM Essential Drug Lists
// ============================================

const prescriptionCatalog = {
    // RESPIRATORY
    'Acute Upper Respiratory Tract Infection': {
        medications: [
            { name: 'Paracetamol', dose: '500mg', frequency: 'TID', duration: '3-5 days', route: 'Oral', notes: 'For fever and pain' },
            { name: 'Chlorpheniramine', dose: '4mg', frequency: 'BD', duration: '3-5 days', route: 'Oral', notes: 'For rhinorrhea, causes drowsiness' },
            { name: 'Steam Inhalation', dose: 'As needed', frequency: 'TID', duration: '5-7 days', route: 'Inhalation', notes: 'Supportive care' }
        ],
        warnings: ['Avoid antibiotics unless bacterial infection confirmed', 'Ensure adequate hydration'],
        alternatives: ['Cetirizine 10mg OD (non-sedating alternative)']
    },

    'Acute Bronchitis': {
        medications: [
            { name: 'Amoxicillin', dose: '500mg', frequency: 'TID', duration: '5 days', route: 'Oral', notes: 'If bacterial infection suspected' },
            { name: 'Paracetamol', dose: '500-650mg', frequency: 'TID', duration: '3-5 days', route: 'Oral', notes: 'For fever' },
            { name: 'Salbutamol Inhaler', dose: '2 puffs', frequency: 'QID PRN', duration: '7 days', route: 'Inhalation', notes: 'If wheezing present' }
        ],
        warnings: ['Complete full course of antibiotics', 'Avoid in penicillin allergy'],
        alternatives: ['Azithromycin 500mg OD x 3 days if penicillin allergy']
    },

    'Viral Fever': {
        medications: [
            { name: 'Paracetamol', dose: '500-650mg', frequency: 'QID PRN', duration: '3-5 days', route: 'Oral', notes: 'Maximum 4g/day; avoid NSAIDs in dengue' },
            { name: 'ORS (Oral Rehydration Salt)', dose: '1 sachet in 1L water', frequency: 'Ad lib', duration: 'Until recovery', route: 'Oral', notes: 'Maintain hydration' }
        ],
        warnings: ['Avoid Aspirin and NSAIDs if dengue suspected', 'Monitor platelet count in endemic areas'],
        alternatives: ['IV fluids if unable to take orally']
    },

    'Acute Gastritis': {
        medications: [
            { name: 'Pantoprazole', dose: '40mg', frequency: 'OD', duration: '2-4 weeks', route: 'Oral', notes: 'Take before breakfast' },
            { name: 'Antacid Gel (Aluminium Hydroxide + Magnesium Hydroxide)', dose: '10-15ml', frequency: 'TID', duration: '2 weeks', route: 'Oral', notes: 'After meals and at bedtime' }
        ],
        warnings: ['Avoid NSAIDs, spicy food, alcohol', 'Test for H. pylori if persistent'],
        alternatives: ['Ranitidine 150mg BD', 'Omeprazole 20mg OD']
    },

    'Acute Gastroenteritis': {
        medications: [
            { name: 'ORS (WHO formula)', dose: '200-400ml after each loose stool', frequency: 'Ad lib', duration: 'Until diarrhea stops', route: 'Oral', notes: 'Main treatment; replace fluid losses' },
            { name: 'Zinc Sulphate', dose: '20mg', frequency: 'OD', duration: '14 days', route: 'Oral', notes: 'Reduces severity and duration (children: 10mg)' },
            { name: 'Ondansetron', dose: '4mg', frequency: 'TID PRN', duration: '1-3 days', route: 'Oral', notes: 'If severe vomiting preventing oral intake' }
        ],
        warnings: ['Avoid anti-diarrheal agents (Loperamide) in dysentery', 'Antibiotics only if bloody diarrhea or cholera suspected'],
        alternatives: ['IV fluids (Ringer Lactate) if severe dehydration', 'Ciprofloxacin 500mg BD x 3 days if bacterial dysentery']
    },

    'Osteoarthritis': {
        medications: [
            { name: 'Paracetamol', dose: '500-1000mg', frequency: 'TID', duration: 'Long-term', route: 'Oral', notes: 'First-line analgesic' },
            { name: 'Diclofenac Gel', dose: 'Apply thin layer', frequency: 'TID', duration: 'As needed', route: 'Topical', notes: 'Safer than oral NSAIDs in elderly' },
            { name: 'Diclofenac', dose: '50mg', frequency: 'BD', duration: '5-7 days', route: 'Oral', notes: 'Short-term for acute flare; take with food' }
        ],
        warnings: ['Avoid long-term NSAIDs in elderly/renal impairment', 'Use gastroprotection with NSAIDs'],
        alternatives: ['Tramadol 50mg BD if NSAIDs contraindicated', 'Physiotherapy']
    },

    'Mechanical Low Back Pain': {
        medications: [
            { name: 'Paracetamol', dose: '500-1000mg', frequency: 'TID', duration: '5-7 days', route: 'Oral', notes: 'First-line' },
            { name: 'Ibuprofen', dose: '400mg', frequency: 'TID', duration: '5-7 days', route: 'Oral', notes: 'Take with food' },
            { name: 'Thiocolchicoside', dose: '4mg', frequency: 'BD', duration: '5 days', route: 'Oral', notes: 'Muscle relaxant; causes drowsiness' }
        ],
        warnings: ['Avoid bed rest > 1-2 days', 'Red flags require imaging/referral'],
        alternatives: ['Diclofenac 75mg IM for severe acute pain', 'Hot fomentation']
    },

    'Tension-type Headache': {
        medications: [
            { name: 'Paracetamol', dose: '500-1000mg', frequency: 'PRN', duration: 'As needed', route: 'Oral', notes: 'Limit to <15 days/month to avoid MOH' },
            { name: 'Ibuprofen', dose: '400mg', frequency: 'PRN', duration: 'As needed', route: 'Oral', notes: 'Alternative to paracetamol' }
        ],
        warnings: ['Avoid medication overuse (>15 days/month)', 'Address stress triggers'],
        alternatives: ['Amitriptyline 10-25mg HS for prophylaxis if frequent']
    },

    'Migraine': {
        medications: [
            { name: 'Paracetamol + Caffeine', dose: '500mg/65mg', frequency: 'At onset', duration: 'Single dose', route: 'Oral', notes: 'Mild migraine' },
            { name: 'Naproxen', dose: '500mg', frequency: 'At onset, may repeat BD', duration: 'Attack only', route: 'Oral', notes: 'Moderate migraine' },
            { name: 'Sumatriptan', dose: '50mg', frequency: 'At onset, repeat after 2h if needed', duration: 'Attack only', route: 'Oral', notes: 'For moderate-severe migraine; max 200mg/day' }
        ],
        warnings: ['Contraindicated: CAD, uncontrolled HTN, hemiplegic migraine', 'Limit triptans to <10 days/month'],
        alternatives: ['Propranolol 40mg BD for prophylaxis', 'Flunarizine 10mg HS for prophylaxis']
    },

    'Essential Hypertension': {
        medications: [
            { name: 'Amlodipine', dose: '5mg', frequency: 'OD', duration: 'Long-term', route: 'Oral', notes: 'First-line; can increase to 10mg' },
            { name: 'Telmisartan', dose: '40mg', frequency: 'OD', duration: 'Long-term', route: 'Oral', notes: 'Especially if diabetic; can increase to 80mg' }
        ],
        warnings: ['Monitor BP regularly', 'Check kidney function with ARBs', 'Lifestyle modification essential'],
        alternatives: ['Enalapril 5mg BD', 'Hydrochlorothiazide 12.5-25mg OD']
    },

    'Type 2 Diabetes Mellitus': {
        medications: [
            { name: 'Metformin', dose: '500mg', frequency: 'BD', duration: 'Long-term', route: 'Oral', notes: 'First-line; increase to 1000mg BD as tolerated' },
            { name: 'Glimepiride', dose: '1mg', frequency: 'OD', duration: 'Long-term', route: 'Oral', notes: 'Add if not controlled; can increase to 2-4mg' }
        ],
        warnings: ['Avoid metformin if eGFR <30', 'Risk of hypoglycemia with sulfonylureas', 'Regular HbA1c monitoring'],
        alternatives: ['Glipizide 5mg OD', 'Voglibose 0.2mg TID with meals']
    },

    'Allergic Dermatitis': {
        medications: [
            { name: 'Cetirizine', dose: '10mg', frequency: 'OD', duration: '7-14 days', route: 'Oral', notes: 'Non-sedating antihistamine' },
            { name: 'Calamine Lotion', dose: 'Apply thin layer', frequency: 'TID', duration: '7 days', route: 'Topical', notes: 'Soothing; for itching' },
            { name: 'Hydrocortisone Cream 1%', dose: 'Apply thin layer', frequency: 'BD', duration: '7 days', route: 'Topical', notes: 'Low potency steroid for mild cases' }
        ],
        warnings: ['Avoid steroids on face unless advised', 'Identify and avoid allergen'],
        alternatives: ['Hydroxyzine 25mg HS if sedation needed', 'Betamethasone cream for resistant cases']
    },

    'Urinary Tract Infection': {
        medications: [
            { name: 'Nitrofurantoin', dose: '100mg', frequency: 'BD', duration: '5-7 days', route: 'Oral', notes: 'First-line for uncomplicated UTI' },
            { name: 'Ciprofloxacin', dose: '500mg', frequency: 'BD', duration: '3-7 days', route: 'Oral', notes: 'Alternative; avoid in pregnancy' }
        ],
        warnings: ['Increase fluid intake', 'Complete full course', 'Urine culture if recurrent'],
        alternatives: ['Cefixime 200mg BD x 5 days', 'Trimethoprim 200mg BD x 3 days']
    },

    'Generalized Anxiety Disorder': {
        medications: [
            { name: 'Escitalopram', dose: '5-10mg', frequency: 'OD', duration: '3-6 months minimum', route: 'Oral', notes: 'SSRI; full effect in 4-6 weeks' },
            { name: 'Propranolol', dose: '10-20mg', frequency: 'TID PRN', duration: 'Short-term', route: 'Oral', notes: 'For somatic symptoms; palpitations, tremor' }
        ],
        warnings: ['Monitor for initial worsening', 'Taper gradually; do not stop abruptly', 'Avoid benzodiazepines long-term'],
        alternatives: ['Sertraline 50mg OD', 'Clonazepam 0.25mg BD (short-term only)']
    },

    'Major Depressive Episode': {
        medications: [
            { name: 'Escitalopram', dose: '10mg', frequency: 'OD', duration: '6-12 months minimum', route: 'Oral', notes: 'First-line SSRI; increase to 20mg if needed' },
            { name: 'Amitriptyline', dose: '25mg', frequency: 'HS', duration: 'Long-term', route: 'Oral', notes: 'TCA; useful if insomnia/chronic pain; sedating' }
        ],
        warnings: ['Screen for suicidal ideation', 'Response takes 4-6 weeks', 'Taper when stopping'],
        alternatives: ['Fluoxetine 20mg OD', 'Sertraline 50mg OD']
    }
};

// ============================================
// LOOKUP FUNCTIONS
// ============================================

/**
 * Find diagnoses based on symptom keywords
 * @param {string} symptoms - Patient's symptoms/complaint
 * @returns {object} - Diagnoses, red flags, and recommended tests
 */
const findDiagnoses = (symptoms) => {
    const lowerSymptoms = symptoms.toLowerCase();
    let bestMatch = null;
    let maxScore = 0;

    // Score each condition based on keyword matches
    for (const [keyword, data] of Object.entries(diagnosisCatalog)) {
        const words = keyword.split(' ');
        let score = 0;
        for (const word of words) {
            if (lowerSymptoms.includes(word)) {
                score++;
            }
        }
        if (lowerSymptoms.includes(keyword)) {
            score += 2; // Bonus for full phrase match
        }
        if (score > maxScore) {
            maxScore = score;
            bestMatch = data;
        }
    }

    // If no match found, return generic
    if (!bestMatch) {
        return {
            diagnoses: [
                { name: 'Needs clinical evaluation', icd10: 'R69', confidence: 'Low', reasoning: 'Symptoms require detailed examination' }
            ],
            redFlags: ['Any warning signs as per clinical judgment'],
            recommendedTests: ['CBC', 'Based on clinical findings'],
            fallback: true
        };
    }

    return { ...bestMatch, fallback: true };
};

/**
 * Find prescription based on diagnosis
 * @param {string} diagnosis - Clinical diagnosis
 * @returns {object} - Medications, warnings, alternatives
 */
const findPrescription = (diagnosis) => {
    const lowerDiagnosis = diagnosis.toLowerCase();
    let bestMatch = null;
    let maxScore = 0;

    for (const [condition, data] of Object.entries(prescriptionCatalog)) {
        const lowerCondition = condition.toLowerCase();
        if (lowerDiagnosis.includes(lowerCondition) || lowerCondition.includes(lowerDiagnosis.split(' ')[0])) {
            const score = condition.split(' ').filter(w => lowerDiagnosis.includes(w.toLowerCase())).length;
            if (score > maxScore) {
                maxScore = score;
                bestMatch = data;
            }
        }
    }

    // If no match found, return supportive care
    if (!bestMatch) {
        return {
            medications: [
                { name: 'Paracetamol', dose: '500mg', frequency: 'TID PRN', duration: '3-5 days', route: 'Oral', notes: 'Symptomatic relief' }
            ],
            warnings: ['Prescribe as per clinical judgment', 'Review diagnosis if not improving'],
            alternatives: [],
            fallback: true
        };
    }

    return { ...bestMatch, fallback: true };
};

module.exports = {
    diagnosisCatalog,
    prescriptionCatalog,
    findDiagnoses,
    findPrescription
};
