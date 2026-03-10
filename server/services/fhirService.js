/**
 * FHIR Service
 * Transforms Wolf HMS data to FHIR R4 format
 * Phase 3: FHIR/HL7 Interoperability (Gold Standard HMS)
 * 
 * FHIR R4 Specification: https://hl7.org/fhir/R4/
 */

const pool = require('../config/db');

/**
 * FHIR Resource Types
 */
const RESOURCE_TYPES = {
    PATIENT: 'Patient',
    ENCOUNTER: 'Encounter',
    OBSERVATION: 'Observation',
    MEDICATION_REQUEST: 'MedicationRequest',
    DIAGNOSTIC_REPORT: 'DiagnosticReport',
    PRACTITIONER: 'Practitioner',
    ORGANIZATION: 'Organization',
    ALLERGY_INTOLERANCE: 'AllergyIntolerance',
    CONDITION: 'Condition',
    PROCEDURE: 'Procedure'
};

/**
 * Transform Wolf HMS patient to FHIR Patient resource
 * https://hl7.org/fhir/R4/patient.html
 */
const toFhirPatient = (patient) => {
    return {
        resourceType: RESOURCE_TYPES.PATIENT,
        id: patient.id.toString(),
        meta: {
            versionId: '1',
            lastUpdated: patient.updated_at || patient.created_at
        },
        identifier: [
            {
                system: 'https://wolfhms.com/patient-id',
                value: patient.patient_id || patient.id.toString()
            },
            ...(patient.aadhar_number ? [{
                system: 'https://uidai.gov.in/aadhaar',
                value: patient.aadhar_number
            }] : []),
            ...(patient.abha_id ? [{
                system: 'https://abdm.gov.in/abha',
                value: patient.abha_id
            }] : [])
        ],
        active: patient.status !== 'inactive',
        name: [{
            use: 'official',
            family: patient.name?.split(' ').pop() || '',
            given: patient.name?.split(' ').slice(0, -1) || [patient.name],
            text: patient.name
        }],
        telecom: [
            ...(patient.phone ? [{
                system: 'phone',
                value: patient.phone,
                use: 'mobile'
            }] : []),
            ...(patient.email ? [{
                system: 'email',
                value: patient.email
            }] : [])
        ],
        gender: patient.gender?.toLowerCase() || 'unknown',
        birthDate: patient.date_of_birth || patient.dob,
        address: patient.address ? [{
            use: 'home',
            text: patient.address,
            city: patient.city,
            state: patient.state,
            postalCode: patient.pincode
        }] : [],
        maritalStatus: patient.marital_status ? {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
                code: mapMaritalStatus(patient.marital_status)
            }]
        } : undefined,
        contact: patient.emergency_contact ? [{
            relationship: [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
                    code: 'C',
                    display: 'Emergency Contact'
                }]
            }],
            name: { text: patient.emergency_contact_name },
            telecom: [{
                system: 'phone',
                value: patient.emergency_contact
            }]
        }] : []
    };
};

/**
 * Transform Wolf HMS admission to FHIR Encounter resource
 * https://hl7.org/fhir/R4/encounter.html
 */
const toFhirEncounter = (admission) => {
    return {
        resourceType: RESOURCE_TYPES.ENCOUNTER,
        id: admission.id.toString(),
        meta: {
            versionId: '1',
            lastUpdated: admission.updated_at || admission.created_at
        },
        identifier: [{
            system: 'https://wolfhms.com/admission-id',
            value: admission.admission_id || admission.id.toString()
        }],
        status: mapEncounterStatus(admission.status),
        class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: admission.admission_type === 'Emergency' ? 'EMER' : 'IMP',
            display: admission.admission_type || 'Inpatient'
        },
        subject: {
            reference: `Patient/${admission.patient_id}`,
            display: admission.patient_name
        },
        participant: admission.doctor_id ? [{
            type: [{
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                    code: 'ATND',
                    display: 'Attending'
                }]
            }],
            individual: {
                reference: `Practitioner/${admission.doctor_id}`,
                display: admission.doctor_name
            }
        }] : [],
        period: {
            start: admission.admission_date || admission.created_at,
            end: admission.discharge_date
        },
        reasonCode: admission.diagnosis ? [{
            text: admission.diagnosis
        }] : [],
        hospitalization: {
            admitSource: {
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/admit-source',
                    code: admission.admission_source || 'other'
                }]
            },
            dischargeDisposition: admission.discharge_type ? {
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/discharge-disposition',
                    code: mapDischargeDisposition(admission.discharge_type)
                }]
            } : undefined
        },
        location: admission.ward_name ? [{
            location: {
                display: `${admission.ward_name} - Bed ${admission.bed_number || 'N/A'}`
            },
            status: 'active'
        }] : []
    };
};

/**
 * Transform Wolf HMS lab result to FHIR Observation resource
 * https://hl7.org/fhir/R4/observation.html
 */
const toFhirObservation = (labResult, type = 'laboratory') => {
    return {
        resourceType: RESOURCE_TYPES.OBSERVATION,
        id: labResult.id.toString(),
        meta: {
            versionId: '1',
            lastUpdated: labResult.updated_at || labResult.created_at
        },
        identifier: [{
            system: 'https://wolfhms.com/lab-result-id',
            value: labResult.id.toString()
        }],
        status: mapObservationStatus(labResult.status),
        category: [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: type,
                display: type === 'laboratory' ? 'Laboratory' : 'Vital Signs'
            }]
        }],
        code: {
            coding: labResult.loinc_code ? [{
                system: 'http://loinc.org',
                code: labResult.loinc_code,
                display: labResult.test_name
            }] : [],
            text: labResult.test_name
        },
        subject: {
            reference: `Patient/${labResult.patient_id}`,
            display: labResult.patient_name
        },
        effectiveDateTime: labResult.sample_collection_date || labResult.created_at,
        issued: labResult.result_date || labResult.updated_at,
        performer: labResult.technician_id ? [{
            reference: `Practitioner/${labResult.technician_id}`,
            display: labResult.technician_name
        }] : [],
        valueQuantity: labResult.value && labResult.unit ? {
            value: parseFloat(labResult.value),
            unit: labResult.unit,
            system: 'http://unitsofmeasure.org'
        } : undefined,
        valueString: !labResult.unit ? labResult.value : undefined,
        interpretation: labResult.interpretation ? [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                code: mapInterpretation(labResult.interpretation)
            }]
        }] : [],
        referenceRange: labResult.normal_range ? [{
            text: labResult.normal_range
        }] : []
    };
};

/**
 * Transform Wolf HMS prescription to FHIR MedicationRequest resource
 * https://hl7.org/fhir/R4/medicationrequest.html
 */
const toFhirMedicationRequest = (prescription) => {
    return {
        resourceType: RESOURCE_TYPES.MEDICATION_REQUEST,
        id: prescription.id.toString(),
        meta: {
            versionId: '1',
            lastUpdated: prescription.updated_at || prescription.created_at
        },
        identifier: [{
            system: 'https://wolfhms.com/prescription-id',
            value: prescription.prescription_id || prescription.id.toString()
        }],
        status: mapMedicationStatus(prescription.status),
        intent: 'order',
        medicationCodeableConcept: {
            text: prescription.medicine_name || prescription.drug_name
        },
        subject: {
            reference: `Patient/${prescription.patient_id}`,
            display: prescription.patient_name
        },
        encounter: prescription.admission_id ? {
            reference: `Encounter/${prescription.admission_id}`
        } : undefined,
        authoredOn: prescription.prescribed_date || prescription.created_at,
        requester: {
            reference: `Practitioner/${prescription.doctor_id}`,
            display: prescription.doctor_name
        },
        dosageInstruction: [{
            text: prescription.dosage || prescription.instructions,
            timing: {
                code: {
                    text: prescription.frequency
                }
            },
            doseAndRate: prescription.dose ? [{
                doseQuantity: {
                    value: parseFloat(prescription.dose),
                    unit: prescription.unit || 'mg'
                }
            }] : []
        }],
        dispenseRequest: {
            quantity: {
                value: prescription.quantity || 1
            },
            expectedSupplyDuration: prescription.duration ? {
                value: parseInt(prescription.duration),
                unit: 'days',
                system: 'http://unitsofmeasure.org',
                code: 'd'
            } : undefined
        }
    };
};

// Helper functions
const mapMaritalStatus = (status) => {
    const map = { 'single': 'S', 'married': 'M', 'divorced': 'D', 'widowed': 'W' };
    return map[status?.toLowerCase()] || 'UNK';
};

const mapEncounterStatus = (status) => {
    const map = { 
        'active': 'in-progress', 'admitted': 'in-progress',
        'discharged': 'finished', 'cancelled': 'cancelled' 
    };
    return map[status?.toLowerCase()] || 'in-progress';
};

const mapObservationStatus = (status) => {
    const map = { 
        'pending': 'registered', 'processing': 'preliminary',
        'completed': 'final', 'verified': 'final' 
    };
    return map[status?.toLowerCase()] || 'final';
};

const mapMedicationStatus = (status) => {
    const map = { 
        'active': 'active', 'completed': 'completed',
        'cancelled': 'cancelled', 'stopped': 'stopped' 
    };
    return map[status?.toLowerCase()] || 'active';
};

const mapDischargeDisposition = (type) => {
    const map = { 
        'home': 'home', 'transferred': 'other-hcf',
        'expired': 'exp', 'lama': 'left' 
    };
    return map[type?.toLowerCase()] || 'oth';
};

const mapInterpretation = (interp) => {
    const map = { 
        'normal': 'N', 'high': 'H', 'low': 'L',
        'critical': 'AA', 'abnormal': 'A' 
    };
    return map[interp?.toLowerCase()] || 'N';
};

/**
 * Transform Wolf HMS allergy to FHIR AllergyIntolerance resource
 * https://hl7.org/fhir/R4/allergyintolerance.html
 */
const toFhirAllergyIntolerance = (allergy) => {
    return {
        resourceType: RESOURCE_TYPES.ALLERGY_INTOLERANCE,
        id: allergy.id.toString(),
        meta: { versionId: '1', lastUpdated: allergy.updated_at || allergy.created_at },
        identifier: [{ system: 'https://wolfhms.com/allergy-id', value: allergy.id.toString() }],
        clinicalStatus: {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
                code: allergy.is_active !== false ? 'active' : 'inactive'
            }]
        },
        verificationStatus: {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
                code: allergy.verified ? 'confirmed' : 'unconfirmed'
            }]
        },
        type: allergy.type === 'intolerance' ? 'intolerance' : 'allergy',
        category: [mapAllergyCategory(allergy.category)],
        criticality: mapAllergyCriticality(allergy.severity),
        code: { text: allergy.allergen || allergy.name },
        patient: { reference: `Patient/${allergy.patient_id}`, display: allergy.patient_name },
        onsetDateTime: allergy.onset_date,
        recordedDate: allergy.created_at,
        recorder: allergy.recorded_by ? { reference: `Practitioner/${allergy.recorded_by}` } : undefined,
        reaction: allergy.reaction ? [{
            manifestation: [{ text: allergy.reaction }],
            severity: allergy.severity?.toLowerCase() === 'severe' ? 'severe' : allergy.severity?.toLowerCase() === 'moderate' ? 'moderate' : 'mild'
        }] : []
    };
};

/**
 * Transform Wolf HMS diagnosis to FHIR Condition resource
 * https://hl7.org/fhir/R4/condition.html
 */
const toFhirCondition = (diagnosis) => {
    return {
        resourceType: RESOURCE_TYPES.CONDITION,
        id: diagnosis.id.toString(),
        meta: { versionId: '1', lastUpdated: diagnosis.updated_at || diagnosis.created_at },
        identifier: [{ system: 'https://wolfhms.com/diagnosis-id', value: diagnosis.id.toString() }],
        clinicalStatus: {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: mapConditionStatus(diagnosis.status)
            }]
        },
        verificationStatus: {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                code: diagnosis.is_provisional ? 'provisional' : 'confirmed'
            }]
        },
        category: [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                code: 'encounter-diagnosis',
                display: 'Encounter Diagnosis'
            }]
        }],
        code: {
            coding: diagnosis.icd_code ? [{
                system: 'http://hl7.org/fhir/sid/icd-10',
                code: diagnosis.icd_code,
                display: diagnosis.description || diagnosis.name
            }] : [],
            text: diagnosis.description || diagnosis.name
        },
        subject: { reference: `Patient/${diagnosis.patient_id}`, display: diagnosis.patient_name },
        encounter: diagnosis.admission_id ? { reference: `Encounter/${diagnosis.admission_id}` } : undefined,
        onsetDateTime: diagnosis.onset_date || diagnosis.created_at,
        recordedDate: diagnosis.created_at,
        recorder: diagnosis.doctor_id ? { reference: `Practitioner/${diagnosis.doctor_id}`, display: diagnosis.doctor_name } : undefined
    };
};

/**
 * Transform Wolf HMS procedure to FHIR Procedure resource
 * https://hl7.org/fhir/R4/procedure.html
 */
const toFhirProcedure = (procedure) => {
    return {
        resourceType: RESOURCE_TYPES.PROCEDURE,
        id: procedure.id.toString(),
        meta: { versionId: '1', lastUpdated: procedure.updated_at || procedure.created_at },
        identifier: [{ system: 'https://wolfhms.com/procedure-id', value: procedure.id.toString() }],
        status: procedure.status === 'completed' ? 'completed' : procedure.status === 'cancelled' ? 'not-done' : 'in-progress',
        code: { text: procedure.name || procedure.procedure_name },
        subject: { reference: `Patient/${procedure.patient_id}`, display: procedure.patient_name },
        encounter: procedure.admission_id ? { reference: `Encounter/${procedure.admission_id}` } : undefined,
        performedDateTime: procedure.procedure_date || procedure.created_at,
        performer: procedure.surgeon_id ? [{
            actor: { reference: `Practitioner/${procedure.surgeon_id}`, display: procedure.surgeon_name }
        }] : [],
        note: procedure.notes ? [{ text: procedure.notes }] : []
    };
};

const mapAllergyCategory = (cat) => {
    const map = { 'food': 'food', 'medication': 'medication', 'drug': 'medication', 'environment': 'environment', 'biologic': 'biologic' };
    return map[cat?.toLowerCase()] || 'medication';
};

const mapAllergyCriticality = (severity) => {
    const map = { 'severe': 'high', 'moderate': 'low', 'mild': 'low' };
    return map[severity?.toLowerCase()] || 'unable-to-assess';
};

const mapConditionStatus = (status) => {
    const map = { 'active': 'active', 'resolved': 'resolved', 'inactive': 'inactive', 'remission': 'remission' };
    return map[status?.toLowerCase()] || 'active';
};

module.exports = {
    RESOURCE_TYPES,
    toFhirPatient,
    toFhirEncounter,
    toFhirObservation,
    toFhirMedicationRequest,
    toFhirAllergyIntolerance,
    toFhirCondition,
    toFhirProcedure
};
