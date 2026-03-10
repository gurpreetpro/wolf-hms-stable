import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Button, Row, Col, ListGroup, Badge, InputGroup, Alert, Card } from 'react-bootstrap';
import { Pill, Search, Plus, Clock, AlertTriangle, Shield, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ==========================================
// CLINICAL DECISION SUPPORT DATA
// ==========================================

// Common Drug-Drug Interactions (High-Severity, based on WHO Essential Medicines)
const DRUG_INTERACTIONS = [
    { drugs: ['warfarin', 'aspirin'], severity: 'high', message: 'Increased bleeding risk when combining anticoagulants' },
    { drugs: ['warfarin', 'ibuprofen'], severity: 'high', message: 'NSAIDs increase bleeding risk with warfarin' },
    { drugs: ['warfarin', 'clopidogrel'], severity: 'high', message: 'Dual antiplatelet/anticoagulant - high bleeding risk' },
    { drugs: ['metformin', 'contrast'], severity: 'high', message: 'Hold metformin 48h before/after contrast to prevent lactic acidosis' },
    { drugs: ['digoxin', 'amiodarone'], severity: 'high', message: 'Amiodarone increases digoxin levels - reduce digoxin dose by 50%' },
    { drugs: ['atorvastatin', 'clarithromycin'], severity: 'high', message: 'Increased risk of myopathy/rhabdomyolysis' },
    { drugs: ['simvastatin', 'amlodipine'], severity: 'moderate', message: 'Limit simvastatin to 20mg when combined with amlodipine' },
    { drugs: ['clopidogrel', 'omeprazole'], severity: 'moderate', message: 'Omeprazole reduces clopidogrel efficacy - use pantoprazole instead' },
    { drugs: ['methotrexate', 'nsaid'], severity: 'high', message: 'NSAIDs increase methotrexate toxicity' },
    { drugs: ['lithium', 'nsaid'], severity: 'high', message: 'NSAIDs increase lithium levels - monitor closely' },
    { drugs: ['ace inhibitor', 'potassium'], severity: 'moderate', message: 'Risk of hyperkalemia - monitor potassium levels' },
    { drugs: ['ace inhibitor', 'spironolactone'], severity: 'moderate', message: 'Risk of hyperkalemia - monitor potassium levels' },
    { drugs: ['ciprofloxacin', 'theophylline'], severity: 'high', message: 'Increased theophylline toxicity risk' },
    { drugs: ['fluconazole', 'warfarin'], severity: 'high', message: 'Fluconazole increases warfarin effect - monitor INR closely' },
    { drugs: ['isoniazid', 'rifampicin'], severity: 'moderate', message: 'Both hepatotoxic - monitor LFTs weekly' },
    { drugs: ['insulin', 'beta blocker'], severity: 'moderate', message: 'Beta blockers may mask hypoglycemia symptoms' },
    { drugs: ['ssri', 'tramadol'], severity: 'high', message: 'Serotonin syndrome risk - avoid combination' },
    { drugs: ['ssri', 'maoi'], severity: 'high', message: 'Severe serotonin syndrome - CONTRAINDICATED' },
];

// Drug class mappings for interaction checking
const DRUG_CLASSES = {
    'nsaid': ['ibuprofen', 'diclofenac', 'naproxen', 'piroxicam', 'indomethacin', 'ketorolac', 'aceclofenac'],
    'ace inhibitor': ['enalapril', 'ramipril', 'lisinopril', 'captopril', 'perindopril'],
    'ssri': ['fluoxetine', 'sertraline', 'paroxetine', 'escitalopram', 'citalopram'],
    'statin': ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin'],
    'anticoagulant': ['warfarin', 'heparin', 'enoxaparin', 'rivaroxaban', 'apixaban'],
    'antiplatelet': ['aspirin', 'clopidogrel', 'ticagrelor', 'prasugrel'],
};

// Common allergen drug classes
const ALLERGY_CROSS_REACTIVITY = {
    'penicillin': ['amoxicillin', 'ampicillin', 'piperacillin', 'amoxiclav', 'augmentin'],
    'sulfa': ['sulfamethoxazole', 'sulfasalazine', 'cotrimoxazole', 'bactrim'],
    'cephalosporin': ['cefixime', 'ceftriaxone', 'cefuroxime', 'cephalexin', 'cefpodoxime'],
    'nsaid': ['aspirin', 'ibuprofen', 'diclofenac', 'naproxen', 'piroxicam'],
};

// Helper to extract dosage from medicine name
const extractDosage = (name) => {
    if (!name) return '';
    const match = name.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu|u|%))/i);
    return match ? match[1] : '';
};

// Helper to normalize drug name for comparison
const normalizeDrugName = (name) => {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/\d+mg|\d+g|\d+ml|\d+mcg/gi, '')
        .replace(/tablet|capsule|injection|syrup|suspension/gi, '')
        .trim();
};

// Common frequency options
const FREQ_OPTIONS = [
    { value: 'OD', label: 'Once Daily (OD)' },
    { value: 'BID', label: 'Twice Daily (BID)' },
    { value: 'TID', label: 'Three Times Daily (TID)' },
    { value: 'QID', label: 'Four Times Daily (QID)' },
    { value: 'Q4H', label: 'Every 4 Hours (Q4H)' },
    { value: 'Q6H', label: 'Every 6 Hours (Q6H)' },
    { value: 'Q8H', label: 'Every 8 Hours (Q8H)' },
    { value: 'Q12H', label: 'Every 12 Hours (Q12H)' },
    { value: 'PRN', label: 'As Needed (PRN)' },
    { value: 'STAT', label: 'Immediately (STAT)' },
    { value: 'HS', label: 'At Bedtime (HS)' },
    { value: 'AC', label: 'Before Meals (AC)' },
    { value: 'PC', label: 'After Meals (PC)' }
];

// Common routes
const ROUTE_OPTIONS = ['PO', 'IV', 'IM', 'SC', 'SL', 'TOP', 'INH', 'PR', 'ID', 'IO'];

// Duration options
const DURATION_OPTIONS = [
    '1 day', '2 days', '3 days', '5 days', '7 days', '10 days', '14 days', '21 days', '30 days', 'Until discharge', 'Continuous'
];

const IPDMedicationModal = ({ show, onHide, admissionId, patientId, patientName, onMedicationAdded, patientAllergies = [], currentMedications = [] }) => {
    const [drugSearch, setDrugSearch] = useState('');
    const [allDrugs, setAllDrugs] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedDrug, setSelectedDrug] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [overrideWarnings, setOverrideWarnings] = useState(false);
    
    // Prescription form
    const [form, setForm] = useState({
        dosage: '',
        frequency: 'OD',
        route: 'PO',
        duration: '7 days',
        instructions: '',
        isPRN: false,
        prnReason: ''
    });

    // ==========================================
    // CLINICAL DECISION SUPPORT LOGIC
    // ==========================================
    
    // Check for drug interactions
    const checkDrugInteractions = useMemo(() => {
        if (!selectedDrug) return [];
        
        const selectedNormalized = normalizeDrugName(selectedDrug.name);
        const selectedGeneric = normalizeDrugName(selectedDrug.generic_name);
        const alerts = [];
        
        // Get drug class if applicable
        const getClassForDrug = (drugName) => {
            const normalized = normalizeDrugName(drugName);
            for (const [className, drugs] of Object.entries(DRUG_CLASSES)) {
                if (drugs.some(d => normalized.includes(d))) {
                    return className;
                }
            }
            return null;
        };
        
        const selectedClass = getClassForDrug(selectedDrug.name) || getClassForDrug(selectedDrug.generic_name);
        
        // Check against current medications
        currentMedications.forEach(med => {
            const medNormalized = normalizeDrugName(med.drug_name || med.description || '');
            const medClass = getClassForDrug(med.drug_name || med.description || '');
            
            // Check direct drug-drug interactions
            DRUG_INTERACTIONS.forEach(interaction => {
                const drug1 = interaction.drugs[0];
                const drug2 = interaction.drugs[1];
                
                const selectedMatches = selectedNormalized.includes(drug1) || selectedGeneric.includes(drug1) || selectedClass === drug1;
                const medMatches = medNormalized.includes(drug2) || medClass === drug2;
                
                const selectedMatches2 = selectedNormalized.includes(drug2) || selectedGeneric.includes(drug2) || selectedClass === drug2;
                const medMatches2 = medNormalized.includes(drug1) || medClass === drug1;
                
                if ((selectedMatches && medMatches) || (selectedMatches2 && medMatches2)) {
                    alerts.push({
                        type: 'interaction',
                        severity: interaction.severity,
                        message: interaction.message,
                        interactingDrug: med.drug_name || med.description
                    });
                }
            });
        });
        
        return alerts;
    }, [selectedDrug, currentMedications]);
    
    // Check for allergies
    const allergyAlerts = useMemo(() => {
        if (!selectedDrug || !patientAllergies.length) return [];
        
        const selectedNormalized = normalizeDrugName(selectedDrug.name);
        const selectedGeneric = normalizeDrugName(selectedDrug.generic_name);
        const alerts = [];
        
        patientAllergies.forEach(allergy => {
            const allergyNormalized = normalizeDrugName(allergy);
            
            // Direct match
            if (selectedNormalized.includes(allergyNormalized) || selectedGeneric.includes(allergyNormalized)) {
                alerts.push({
                    type: 'allergy',
                    severity: 'high',
                    message: `Patient is ALLERGIC to ${allergy}`,
                    allergen: allergy
                });
                return;
            }
            
            // Cross-reactivity check
            for (const [allergenClass, drugs] of Object.entries(ALLERGY_CROSS_REACTIVITY)) {
                if (allergyNormalized.includes(allergenClass) || drugs.some(d => allergyNormalized.includes(d))) {
                    // Patient allergic to this class - check if selected drug is in same class
                    if (drugs.some(d => selectedNormalized.includes(d) || selectedGeneric.includes(d))) {
                        alerts.push({
                            type: 'allergy',
                            severity: 'high',
                            message: `Cross-reactivity warning: ${allergy} allergy - ${selectedDrug.name} may cause reaction`,
                            allergen: allergy
                        });
                    }
                }
            }
        });
        
        return alerts;
    }, [selectedDrug, patientAllergies]);
    
    // Check for duplicate orders
    const duplicateAlert = useMemo(() => {
        if (!selectedDrug) return null;
        
        const selectedNormalized = normalizeDrugName(selectedDrug.name);
        const selectedGeneric = normalizeDrugName(selectedDrug.generic_name);
        
        const duplicate = currentMedications.find(med => {
            const medNormalized = normalizeDrugName(med.drug_name || med.description || '');
            return medNormalized.includes(selectedNormalized) || 
                   medNormalized.includes(selectedGeneric) ||
                   selectedNormalized.includes(medNormalized);
        });
        
        if (duplicate) {
            return {
                type: 'duplicate',
                severity: 'moderate',
                message: `Similar medication already prescribed: ${duplicate.drug_name || duplicate.description}`,
                existingMed: duplicate
            };
        }
        return null;
    }, [selectedDrug, currentMedications]);
    
    // Combine all CDS alerts
    const allAlerts = useMemo(() => {
        const alerts = [...allergyAlerts, ...checkDrugInteractions];
        if (duplicateAlert) alerts.push(duplicateAlert);
        return alerts.sort((a, b) => (b.severity === 'high' ? 1 : 0) - (a.severity === 'high' ? 1 : 0));
    }, [allergyAlerts, checkDrugInteractions, duplicateAlert]);
    
    const hasHighSeverityAlert = allAlerts.some(a => a.severity === 'high');

    // Load all drugs from pharmacy when modal opens
    useEffect(() => {
        const loadDrugs = async () => {
            if (!show) return;
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API}/api/pharmacy/inventory`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                let drugs = [];
                if (Array.isArray(res.data)) {
                    drugs = res.data;
                } else if (res.data?.data && Array.isArray(res.data.data)) {
                    drugs = res.data.data;
                } else if (res.data?.inventory && Array.isArray(res.data.inventory)) {
                    drugs = res.data.inventory;
                }
                drugs = drugs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                setAllDrugs(drugs);
                setSearchResults(drugs.slice(0, 15));
            } catch (err) {
                console.error('Failed to load drugs:', err);
                setError('Failed to load pharmacy inventory');
            } finally {
                setLoading(false);
            }
        };
        loadDrugs();
    }, [show]);

    // Search drugs from backend
    useEffect(() => {
        const searchDrugs = async () => {
             if (drugSearch.trim().length < 2) {
                setSearchResults(allDrugs.slice(0, 15));
                return;
             }

             setSearching(true);
             try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API}/api/pharmacy/inventory/search`, {
                    params: { query: drugSearch },
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = res.data?.data;
                setSearchResults(Array.isArray(data) ? data : []);
             } catch (err) {
                 console.error('Search failed:', err);
             } finally {
                 setSearching(false);
             }
        };

        const timeoutId = setTimeout(() => {
            if (drugSearch) searchDrugs();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [drugSearch, allDrugs]);

    const handleSelectDrug = (drug) => {
        setSelectedDrug(drug);
        setDrugSearch('');
        setSearchResults([]);
        setOverrideWarnings(false);
        const dose = extractDosage(drug.name) || extractDosage(drug.generic_name);
        if (dose) {
            setForm(f => ({ ...f, dosage: dose }));
        }
    };

    const handleSubmit = async () => {
        if (!selectedDrug) {
            setError('Please select a medication');
            return;
        }
        if (!form.dosage) {
            setError('Please enter dosage');
            return;
        }
        
        // Block if high severity alerts not overridden
        if (hasHighSeverityAlert && !overrideWarnings) {
            setError('Please acknowledge high-severity alerts before ordering');
            return;
        }

        setSubmitting(true);
        setError('');
        
        try {
            const token = localStorage.getItem('token');
            const description = `${selectedDrug.name} ${form.dosage} ${form.route} ${form.frequency}${form.isPRN ? ' (PRN)' : ''} - ${form.duration}${form.instructions ? ` | ${form.instructions}` : ''}`;
            
            // Include CDS override info if warnings were acknowledged
            const cdsNotes = overrideWarnings && allAlerts.length > 0 
                ? ` [CDS Override: ${allAlerts.map(a => a.message).join('; ')}]`
                : '';
            
            await axios.post(`${API}/api/clinical/order-medication`, {
                admission_id: admissionId,
                patient_id: patientId,
                drug_name: selectedDrug.name,
                drug_id: selectedDrug.id,
                dosage: form.dosage,
                frequency: form.frequency,
                route: form.route,
                duration: form.duration,
                instructions: form.instructions + cdsNotes,
                is_prn: form.isPRN,
                prn_reason: form.prnReason,
                description
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setSuccess('Medication ordered successfully!');
            setTimeout(() => {
                onMedicationAdded?.();
                handleClose();
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to order medication');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedDrug(null);
        setDrugSearch('');
        setSearchResults([]);
        setForm({
            dosage: '',
            frequency: 'OD',
            route: 'PO',
            duration: '7 days',
            instructions: '',
            isPRN: false,
            prnReason: ''
        });
        setError('');
        setSuccess('');
        setOverrideWarnings(false);
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title className="d-flex align-items-center">
                    <Pill size={20} className="me-2" />
                    Order Medication for {patientName}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                {success && <Alert variant="success"><CheckCircle size={16} className="me-1" />{success}</Alert>}
                
                {/* Patient Allergy Banner */}
                {patientAllergies.length > 0 && (
                    <Alert variant="danger" className="py-2 d-flex align-items-center">
                        <Shield size={18} className="me-2" />
                        <strong>Known Allergies:</strong>
                        <span className="ms-2">{patientAllergies.join(', ')}</span>
                    </Alert>
                )}
                
                {/* CDS Alerts Panel */}
                {selectedDrug && allAlerts.length > 0 && (
                    <Card className={`mb-3 border-${hasHighSeverityAlert ? 'danger' : 'warning'}`}>
                        <Card.Header className={`py-2 bg-${hasHighSeverityAlert ? 'danger' : 'warning'} text-${hasHighSeverityAlert ? 'white' : 'dark'}`}>
                            <AlertTriangle size={16} className="me-2" />
                            Clinical Decision Support Alerts ({allAlerts.length})
                        </Card.Header>
                        <Card.Body className="py-2">
                            {allAlerts.map((alert, idx) => (
                                <div key={idx} className={`d-flex align-items-start mb-2 ${idx < allAlerts.length - 1 ? 'border-bottom pb-2' : ''}`}>
                                    {alert.severity === 'high' ? (
                                        <XCircle size={16} className="text-danger me-2 flex-shrink-0 mt-1" />
                                    ) : (
                                        <AlertCircle size={16} className="text-warning me-2 flex-shrink-0 mt-1" />
                                    )}
                                    <div>
                                        <Badge bg={alert.severity === 'high' ? 'danger' : 'warning'} className="me-2">
                                            {alert.type === 'allergy' ? 'ALLERGY' : alert.type === 'interaction' ? 'INTERACTION' : 'DUPLICATE'}
                                        </Badge>
                                        <span className="small">{alert.message}</span>
                                    </div>
                                </div>
                            ))}
                            
                            {hasHighSeverityAlert && (
                                <Form.Check
                                    type="checkbox"
                                    id="override-warnings"
                                    label="I acknowledge these alerts and wish to proceed with the order"
                                    checked={overrideWarnings}
                                    onChange={(e) => setOverrideWarnings(e.target.checked)}
                                    className="mt-2 fw-bold text-danger"
                                />
                            )}
                        </Card.Body>
                    </Card>
                )}
                
                {/* Drug Search */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Search Medication from Pharmacy Inventory</Form.Label>
                    <InputGroup>
                        <InputGroup.Text><Search size={16} /></InputGroup.Text>
                        <Form.Control
                            type="text"
                            placeholder="Type generic or brand name..."
                            value={drugSearch}
                            onChange={(e) => setDrugSearch(e.target.value)}
                            autoFocus
                            disabled={selectedDrug !== null}
                        />
                        {searching && <div className="text-muted small mt-1 position-absolute" style={{ right: '10px', top: '35px' }}>Searching...</div>}
                    </InputGroup>
                    
                    {/* Drug List */}
                    {!selectedDrug && (
                        <div className="border rounded mt-2" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                            {loading ? (
                                <div className="text-center py-3 text-muted">Loading pharmacy inventory...</div>
                            ) : searchResults.length > 0 ? (
                                <ListGroup variant="flush">
                                    {searchResults.map(drug => (
                                        <ListGroup.Item 
                                            key={drug.id} 
                                            action 
                                            onClick={() => handleSelectDrug(drug)}
                                            className="d-flex justify-content-between align-items-center py-2"
                                        >
                                            <div>
                                                <strong>{drug.name}</strong>
                                                <span className="text-muted ms-2 small">({drug.generic_name})</span>
                                            </div>
                                            <Badge bg={drug.quantity_on_hand > 10 ? 'success' : drug.quantity_on_hand > 0 ? 'warning' : 'danger'}>
                                                Stock: {drug.quantity_on_hand || 0}
                                            </Badge>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            ) : (
                                <div className="text-center py-3 text-muted">No drugs found</div>
                            )}
                        </div>
                    )}
                </Form.Group>

                {/* Selected Drug Display */}
                {selectedDrug && (
                    <Alert variant={allAlerts.length > 0 ? (hasHighSeverityAlert ? 'danger' : 'warning') : 'info'} className="d-flex justify-content-between align-items-center">
                        <div>
                            <Pill size={16} className="me-2" />
                            <strong>{selectedDrug.name}</strong>
                            <span className="ms-2 text-muted">({selectedDrug.generic_name})</span>
                        </div>
                        <Button variant="outline-danger" size="sm" onClick={() => setSelectedDrug(null)}>
                            Change
                        </Button>
                    </Alert>
                )}

                {/* Prescription Details */}
                <Row className="mb-3">
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="fw-bold">Dosage *</Form.Label>
                            <Form.Control
                                placeholder="e.g., 500mg, 10ml"
                                value={form.dosage}
                                onChange={e => setForm({ ...form, dosage: e.target.value })}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="fw-bold">Frequency</Form.Label>
                            <Form.Select 
                                value={form.frequency}
                                onChange={e => setForm({ ...form, frequency: e.target.value })}
                            >
                                {FREQ_OPTIONS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="fw-bold">Route</Form.Label>
                            <Form.Select 
                                value={form.route}
                                onChange={e => setForm({ ...form, route: e.target.value })}
                            >
                                {ROUTE_OPTIONS.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>

                <Row className="mb-3">
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label className="fw-bold">Duration</Form.Label>
                            <Form.Select 
                                value={form.duration}
                                onChange={e => setForm({ ...form, duration: e.target.value })}
                            >
                                {DURATION_OPTIONS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Check
                                type="switch"
                                id="prn-switch"
                                label="PRN (As Needed)"
                                checked={form.isPRN}
                                onChange={e => setForm({ ...form, isPRN: e.target.checked })}
                                className="mt-4"
                            />
                        </Form.Group>
                    </Col>
                </Row>

                {form.isPRN && (
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">PRN Reason</Form.Label>
                        <Form.Control
                            placeholder="e.g., For pain, for nausea"
                            value={form.prnReason}
                            onChange={e => setForm({ ...form, prnReason: e.target.value })}
                        />
                    </Form.Group>
                )}

                <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Special Instructions</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="e.g., Take with food, Hold if BP < 90"
                        value={form.instructions}
                        onChange={e => setForm({ ...form, instructions: e.target.value })}
                    />
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button 
                    variant={hasHighSeverityAlert ? 'danger' : 'success'}
                    onClick={handleSubmit} 
                    disabled={!selectedDrug || !form.dosage || submitting || (hasHighSeverityAlert && !overrideWarnings)}
                >
                    {submitting ? 'Ordering...' : <><Plus size={16} className="me-1" /> Order Medication</>}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default IPDMedicationModal;
