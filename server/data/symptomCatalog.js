/**
 * Clinical Symptom Catalog
 * Maps symptoms/keywords to departments and priority levels
 * Used as fallback when Gemini API is unavailable
 */

const SYMPTOM_CATALOG = {
    // EMERGENCY - Critical/Life-Threatening
    emergency: {
        department: 'Emergency',
        priority: 'Critical',
        keywords: [
            'chest pain', 'heart attack', 'stroke', 'unconscious', 'unresponsive',
            'severe bleeding', 'hemorrhage', 'not breathing', 'choking', 'seizure',
            'convulsion', 'poisoning', 'overdose', 'severe burn', 'electric shock',
            'drowning', 'anaphylaxis', 'severe allergic', 'trauma', 'accident',
            'head injury', 'spinal injury', 'gunshot', 'stabbing', 'suicide attempt',
            'cardiac arrest', 'collapse', 'fainting', 'loss of consciousness'
        ]
    },

    // CARDIOLOGY - Heart Related
    cardiology: {
        department: 'Cardiology',
        priority: 'High',
        keywords: [
            'heart', 'palpitation', 'irregular heartbeat', 'arrhythmia', 'blood pressure',
            'hypertension', 'hypotension', 'angina', 'coronary', 'valve',
            'murmur', 'tachycardia', 'bradycardia', 'shortness of breath',
            'swelling legs', 'edema', 'cholesterol', 'atherosclerosis'
        ]
    },

    // ORTHOPEDICS - Bones, Joints, Muscles
    orthopedics: {
        department: 'Orthopedics',
        priority: 'Medium',
        keywords: [
            'fracture', 'broken bone', 'dislocation', 'sprain', 'strain',
            'knee', 'shoulder', 'ankle', 'hip', 'elbow', 'wrist',
            'back pain', 'spine', 'disc', 'sciatica', 'scoliosis',
            'arthritis', 'joint pain', 'joint swelling', 'stiff joint',
            'bone pain', 'muscle tear', 'ligament', 'tendon', 'cartilage',
            'osteoporosis', 'rheumatoid', 'sports injury', 'cast', 'splint',
            'neck pain', 'cervical', 'lumbar', 'frozen shoulder', 'rotator cuff'
        ]
    },

    // NEUROLOGY - Brain and Nerves
    neurology: {
        department: 'Neurology',
        priority: 'High',
        keywords: [
            'headache', 'migraine', 'vertigo', 'dizziness', 'numbness',
            'tingling', 'paralysis', 'weakness', 'tremor', 'shaking',
            'memory loss', 'confusion', 'epilepsy', 'multiple sclerosis',
            'parkinson', 'alzheimer', 'dementia', 'nerve pain', 'neuropathy',
            'brain', 'neuro', 'balance problem', 'coordination', 'slurred speech'
        ]
    },

    // GASTROENTEROLOGY - Digestive System
    gastroenterology: {
        department: 'Gastroenterology',
        priority: 'Medium',
        keywords: [
            'stomach', 'abdomen', 'abdominal pain', 'nausea', 'vomiting',
            'diarrhea', 'constipation', 'bloating', 'gas', 'acidity',
            'heartburn', 'acid reflux', 'gerd', 'ulcer', 'gastritis',
            'liver', 'hepatitis', 'jaundice', 'gallbladder', 'gallstone',
            'pancreatitis', 'ibs', 'crohn', 'colitis', 'hemorrhoids', 'piles',
            'blood in stool', 'indigestion', 'dyspepsia', 'appendix'
        ]
    },

    // PULMONOLOGY - Lungs and Respiratory
    pulmonology: {
        department: 'Pulmonology',
        priority: 'Medium',
        keywords: [
            'cough', 'chronic cough', 'wheezing', 'asthma', 'bronchitis',
            'pneumonia', 'lung', 'breathing difficulty', 'breathlessness',
            'copd', 'emphysema', 'tuberculosis', 'tb', 'chest congestion',
            'sputum', 'phlegm', 'sleep apnea', 'snoring', 'oxygen', 'respiratory'
        ]
    },

    // DERMATOLOGY - Skin
    dermatology: {
        department: 'Dermatology',
        priority: 'Low',
        keywords: [
            'skin', 'rash', 'itching', 'eczema', 'psoriasis', 'acne',
            'pimple', 'boil', 'abscess', 'fungal', 'ringworm', 'scabies',
            'allergy skin', 'hives', 'urticaria', 'vitiligo', 'pigmentation',
            'hair loss', 'dandruff', 'nail', 'wart', 'mole', 'skin tag',
            'burn', 'sunburn', 'blister', 'wound', 'scar', 'keloid'
        ]
    },

    // ENT - Ear Nose Throat
    ent: {
        department: 'ENT',
        priority: 'Low',
        keywords: [
            'ear', 'hearing', 'ear pain', 'ear discharge', 'tinnitus', 'ringing',
            'nose', 'nasal', 'sinus', 'sinusitis', 'blocked nose', 'runny nose',
            'smell', 'nosebleed', 'throat', 'sore throat', 'tonsil', 'adenoid',
            'voice', 'hoarse', 'swallowing difficulty', 'snoring', 'sleep apnea',
            'vertigo', 'balance', 'hearing loss', 'deaf'
        ]
    },

    // OPHTHALMOLOGY - Eyes
    ophthalmology: {
        department: 'Ophthalmology',
        priority: 'Medium',
        keywords: [
            'eye', 'vision', 'blur', 'blurry vision', 'blind', 'blindness',
            'cataract', 'glaucoma', 'retina', 'macular', 'double vision',
            'eye pain', 'red eye', 'conjunctivitis', 'pink eye', 'eye discharge',
            'watery eye', 'dry eye', 'squint', 'itchy eye', 'floaters',
            'glasses', 'spectacles', 'contact lens', 'laser eye'
        ]
    },

    // GYNECOLOGY - Women's Health
    gynecology: {
        department: 'Gynecology',
        priority: 'Medium',
        keywords: [
            'pregnancy', 'pregnant', 'menstrual', 'period', 'irregular period',
            'heavy bleeding', 'spotting', 'pcos', 'polycystic', 'ovary', 'ovarian',
            'uterus', 'fibroids', 'endometriosis', 'menopause', 'hot flashes',
            'breast', 'mammogram', 'pap smear', 'cervical', 'vaginal',
            'infertility', 'ivf', 'contraception', 'birth control'
        ]
    },

    // UROLOGY - Urinary System & Male Health
    urology: {
        department: 'Urology',
        priority: 'Medium',
        keywords: [
            'urinary', 'urine', 'burning urination', 'frequent urination',
            'blood in urine', 'kidney', 'kidney stone', 'renal', 'bladder',
            'prostate', 'erectile', 'impotence', 'uti', 'urinary infection',
            'incontinence', 'bedwetting', 'testicular', 'scrotum', 'foreskin'
        ]
    },

    // PEDIATRICS - Children
    pediatrics: {
        department: 'Pediatrics',
        priority: 'Medium',
        keywords: [
            'child', 'infant', 'baby', 'newborn', 'toddler', 'pediatric',
            'vaccination', 'immunization', 'growth', 'development',
            'teething', 'diaper rash', 'colic', 'jaundice newborn',
            'feeding problem', 'milestone', 'autism', 'adhd'
        ]
    },

    // PSYCHIATRY - Mental Health
    psychiatry: {
        department: 'Psychiatry',
        priority: 'Medium',
        keywords: [
            'depression', 'anxiety', 'panic', 'stress', 'insomnia',
            'sleep problem', 'bipolar', 'schizophrenia', 'psychosis',
            'hallucination', 'suicidal', 'self harm', 'addiction', 'substance abuse',
            'ocd', 'ptsd', 'eating disorder', 'anorexia', 'bulimia', 'mental'
        ]
    },

    // ENDOCRINOLOGY - Hormones & Metabolism
    endocrinology: {
        department: 'Endocrinology',
        priority: 'Medium',
        keywords: [
            'diabetes', 'sugar', 'blood sugar', 'insulin', 'thyroid',
            'hypothyroid', 'hyperthyroid', 'goiter', 'hormone', 'hormonal',
            'obesity', 'weight gain', 'weight loss', 'metabolism',
            'pituitary', 'adrenal', 'calcium', 'osteoporosis'
        ]
    },

    // NEPHROLOGY - Kidneys
    nephrology: {
        department: 'Nephrology',
        priority: 'Medium',
        keywords: [
            'kidney', 'renal', 'dialysis', 'creatinine', 'kidney failure',
            'chronic kidney', 'ckd', 'nephrotic', 'proteinuria', 'kidney transplant'
        ]
    },

    // ONCOLOGY - Cancer
    oncology: {
        department: 'Oncology',
        priority: 'High',
        keywords: [
            'cancer', 'tumor', 'tumour', 'malignant', 'benign', 'lump',
            'chemotherapy', 'radiation', 'biopsy', 'metastasis', 'leukemia',
            'lymphoma', 'carcinoma', 'sarcoma', 'melanoma'
        ]
    },

    // GENERAL MEDICINE - Common Ailments
    generalMedicine: {
        department: 'General Medicine',
        priority: 'Low',
        keywords: [
            'fever', 'cold', 'flu', 'viral', 'infection', 'weakness',
            'fatigue', 'tiredness', 'body ache', 'general checkup',
            'routine checkup', 'health checkup', 'vaccination adult',
            'malaria', 'dengue', 'typhoid', 'covid', 'coronavirus'
        ]
    },

    // DENTISTRY - Teeth
    dentistry: {
        department: 'Dentistry',
        priority: 'Low',
        keywords: [
            'tooth', 'teeth', 'dental', 'cavity', 'toothache', 'gum',
            'bleeding gums', 'root canal', 'extraction', 'braces',
            'wisdom tooth', 'denture', 'implant dental', 'bad breath'
        ]
    }
};

/**
 * Find matching department based on complaint text
 * @param {string} complaint - Patient's chief complaint
 * @returns {object} - { department, priority, reason }
 */
const findDepartment = (complaint) => {
    const lowerComplaint = complaint.toLowerCase();

    // Check each department's keywords
    for (const [key, config] of Object.entries(SYMPTOM_CATALOG)) {
        for (const keyword of config.keywords) {
            if (lowerComplaint.includes(keyword)) {
                return {
                    department: config.department,
                    priority: config.priority,
                    reason: `Matched symptom: "${keyword}"`
                };
            }
        }
    }

    // Default fallback
    return {
        department: 'General Medicine',
        priority: 'Medium',
        reason: 'No specific symptom matched, defaulting to General Medicine'
    };
};

module.exports = { SYMPTOM_CATALOG, findDepartment };
