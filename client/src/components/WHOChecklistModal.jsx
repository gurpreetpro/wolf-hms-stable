import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, ProgressBar, Alert, Badge } from 'react-bootstrap';
import { Check, AlertTriangle, Save } from 'lucide-react';
import axios from 'axios';

const STAGES = {
    SIGN_IN: 'Sign In',
    TIME_OUT: 'Time Out',
    SIGN_OUT: 'Sign Out'
};

const CHECKS = {
    [STAGES.SIGN_IN]: [
        { key: 'identity', label: 'Patient Identity confirmed' },
        { key: 'site', label: 'Surgical Site marked' },
        { key: 'anesthesia_check', label: 'Anesthesia Machine & Meds check complete' },
        { key: 'oximeter', label: 'Pulse Oximeter on and functioning' },
        { key: 'allergy', label: 'Does patient have Allergies?' },
        { key: 'airway', label: 'Difficult Airway / Aspiration risk?' }
    ],
    [STAGES.TIME_OUT]: [
        { key: 'team_intro', label: 'All team members introduced by name/role' },
        { key: 'confirm_details', label: 'Confirm Patient, Site, Procedure' },
        { key: 'antibiotics', label: 'Antibiotic prophylaxis within last 60 mins' },
        { key: 'critical_steps', label: 'Surgeon reviews critical steps' },
        { key: 'anesthesia_concerns', label: 'Anesthesia reviews concerns' },
        { key: 'nursing_review', label: 'Nursing reviews sterility/equipment' }
    ],
    [STAGES.SIGN_OUT]: [
        { key: 'instrument_count', label: 'Nurse confirms Instrument/Sponge count' },
        { key: 'specimen_label', label: 'Specimen labeling confirmed' },
        { key: 'equipment_issues', label: 'Equipment problems addressed' },
        { key: 'recovery_concerns', label: 'Surgeon/Anesthesia review recovery concerns' }
    ]
};

const WHOChecklistModal = ({ show, onHide, surgeryId, initialData = [], onSave }) => {
    const [activeStage, setActiveStage] = useState(STAGES.SIGN_IN);
    const [checklistData, setChecklistData] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && initialData) {
            // Merge initial data
            const merged = {};
            initialData.forEach(item => {
                if (item.stage && item.data) {
                    merged[item.stage] = item.data;
                }
            });
            setChecklistData(merged);
        }
    }, [show, initialData]);

    const handleCheck = (stage, key, checked) => {
        setChecklistData(prev => ({
            ...prev,
            [stage]: {
                ...prev[stage],
                [key]: checked
            }
        }));
    };

    const isStageComplete = (stage) => {
        const stageChecks = CHECKS[stage];
        const stageData = checklistData[stage] || {};
        // Simple check: are all keys present and true? (Actually some might be N/A, but for demo simpler)
        return stageChecks.every(c => stageData[c.key] === true);
    };

    const handleSaveStage = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const dataToSave = checklistData[activeStage] || {};
            await axios.post('/api/ot/checklist', {
                surgery_id: surgeryId,
                stage: activeStage,
                data: dataToSave
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (onSave) onSave();
            alert(`✅ ${activeStage} Saved Successfully!`);

            // Auto-advance logic
            if (activeStage === STAGES.SIGN_IN) setActiveStage(STAGES.TIME_OUT);
            else if (activeStage === STAGES.TIME_OUT) setActiveStage(STAGES.SIGN_OUT);

        } catch (err) {
            console.error(err);
            alert('Error saving checklist');
        } finally {
            setLoading(false);
        }
    };

    const getProgress = () => {
        let completed = 0;
        if (isStageComplete(STAGES.SIGN_IN)) completed += 33;
        if (isStageComplete(STAGES.TIME_OUT)) completed += 33;
        if (isStageComplete(STAGES.SIGN_OUT)) completed += 34;
        return completed;
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton className="bg-success text-white">
                <Modal.Title>
                    <Check size={20} className="me-2" />
                    WHO Surgical Safety Checklist
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <ProgressBar now={getProgress()} variant="success" className="mb-4" label={`${getProgress()}% Compliant`} />

                <div className="d-flex mb-4 border-bottom pb-2">
                    {Object.values(STAGES).map(stage => (
                        <Button
                            key={stage}
                            variant={activeStage === stage ? "primary" : "outline-secondary"}
                            className="me-2 flex-grow-1"
                            onClick={() => setActiveStage(stage)}
                        >
                            {stage}
                            {checklistData[stage] && Object.keys(checklistData[stage]).length > 0 && <Check size={14} className="ms-1" />}
                        </Button>
                    ))}
                </div>

                <div className="p-3 bg-light rounded border">
                    <h5 className="fw-bold mb-3 text-primary">{activeStage} Checks</h5>
                    {CHECKS[activeStage].map(item => (
                        <Form.Check
                            key={item.key}
                            type="checkbox"
                            id={`${activeStage}-${item.key}`}
                            className="mb-3"
                        >
                            <Form.Check.Input
                                type="checkbox"
                                checked={checklistData[activeStage]?.[item.key] || false}
                                onChange={(e) => handleCheck(activeStage, item.key, e.target.checked)}
                            />
                            <Form.Check.Label className="fs-6">{item.label}</Form.Check.Label>
                        </Form.Check>
                    ))}
                </div>

                <Alert variant="warning" className="mt-3 d-flex align-items-center">
                    <AlertTriangle size={18} className="me-2" />
                    <small>Ensure all verbal confirmations are made before proceeding.</small>
                </Alert>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
                <Button variant="success" onClick={handleSaveStage} disabled={loading}>
                    {loading ? 'Saving...' : `Confirm & Save ${activeStage}`}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default WHOChecklistModal;
