import React, { useState } from 'react';
import { Button, Form, Badge, ButtonGroup, Card } from 'react-bootstrap';
import { Activity, CheckCircle, TrendingUp, TrendingDown, AlertTriangle, Clock, Send } from 'lucide-react';
import axios from 'axios';

const STATUS_OPTIONS = [
    { value: 'Stable', label: 'Stable', icon: CheckCircle, color: 'success', description: 'Condition unchanged, vitals normal' },
    { value: 'Improving', label: 'Improving', icon: TrendingUp, color: 'primary', description: 'Getting better, positive response' },
    { value: 'Deteriorating', label: 'Deteriorating', icon: TrendingDown, color: 'warning', description: 'Worsening, needs attention' },
    { value: 'Critical', label: 'Critical', icon: AlertTriangle, color: 'danger', description: 'Urgent intervention needed' }
];

const RoundNoteQuickEntry = ({
    admissionId,
    patientId,
    patientName,
    onSave,
    compact = false
}) => {
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [notes, setNotes] = useState('');
    const [vitalsReviewed, setVitalsReviewed] = useState(true);
    const [labsReviewed, setLabsReviewed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        if (!selectedStatus) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const doctorName = localStorage.getItem('username') || 'Doctor';

            await axios.post('/api/clinical/round-notes', {
                admission_id: admissionId,
                patient_id: patientId,
                status: selectedStatus,
                notes,
                vitals_reviewed: vitalsReviewed,
                labs_reviewed: labsReviewed,
                doctor_name: 'Dr. ' + doctorName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSaved(true);
            setSelectedStatus(null);
            setNotes('');
            setTimeout(() => setSaved(false), 2000);

            if (onSave) onSave();
        } catch (err) {
            console.error('Error saving round note:', err);
            alert('Failed to save round note');
        } finally {
            setSaving(false);
        }
    };

    if (compact) {
        // Inline compact version for patient list
        return (
            <div className="d-flex align-items-center gap-2">
                <ButtonGroup size="sm">
                    {STATUS_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        return (
                            <Button
                                key={opt.value}
                                variant={selectedStatus === opt.value ? opt.color : `outline-${opt.color}`}
                                onClick={() => setSelectedStatus(opt.value)}
                                title={opt.description}
                                className="px-2 py-1"
                            >
                                <Icon size={14} />
                            </Button>
                        );
                    })}
                </ButtonGroup>
                {selectedStatus && (
                    <>
                        <Form.Control
                            size="sm"
                            placeholder="Quick note..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={{ width: '150px' }}
                        />
                        <Button
                            size="sm"
                            variant="success"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <Send size={14} />
                        </Button>
                    </>
                )}
                {saved && <Badge bg="success"><CheckCircle size={12} /> Saved</Badge>}
            </div>
        );
    }

    // Full card version
    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light d-flex align-items-center gap-2">
                <Activity size={18} className="text-primary" />
                <span className="fw-bold">Quick Round Note</span>
                {patientName && <Badge bg="secondary" className="ms-auto">{patientName}</Badge>}
            </Card.Header>
            <Card.Body>
                <div className="mb-3">
                    <Form.Label className="fw-bold small text-muted mb-2">Patient Status</Form.Label>
                    <div className="d-flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            const isSelected = selectedStatus === opt.value;
                            return (
                                <Button
                                    key={opt.value}
                                    variant={isSelected ? opt.color : `outline-${opt.color}`}
                                    onClick={() => setSelectedStatus(opt.value)}
                                    className="d-flex align-items-center gap-2 px-3"
                                >
                                    <Icon size={18} />
                                    <span>{opt.label}</span>
                                </Button>
                            );
                        })}
                    </div>
                    {selectedStatus && (
                        <small className="text-muted mt-1 d-block">
                            {STATUS_OPTIONS.find(o => o.value === selectedStatus)?.description}
                        </small>
                    )}
                </div>

                <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small text-muted">Brief Notes (optional)</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Any additional observations or notes for this round..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </Form.Group>

                <div className="d-flex gap-3 mb-3">
                    <Form.Check
                        type="checkbox"
                        id="vitals-reviewed"
                        label="Vitals Reviewed"
                        checked={vitalsReviewed}
                        onChange={(e) => setVitalsReviewed(e.target.checked)}
                    />
                    <Form.Check
                        type="checkbox"
                        id="labs-reviewed"
                        label="Labs Reviewed"
                        checked={labsReviewed}
                        onChange={(e) => setLabsReviewed(e.target.checked)}
                    />
                </div>

                <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                        <Clock size={14} className="me-1" />
                        {new Date().toLocaleTimeString()}
                    </small>
                    <Button
                        variant="success"
                        onClick={handleSave}
                        disabled={!selectedStatus || saving}
                    >
                        {saving ? 'Saving...' : (
                            <><CheckCircle size={16} className="me-2" /> Log Round</>
                        )}
                    </Button>
                </div>

                {saved && (
                    <div className="alert alert-success mt-3 py-2 mb-0">
                        <CheckCircle size={16} className="me-2" />
                        Round note saved successfully!
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default RoundNoteQuickEntry;
