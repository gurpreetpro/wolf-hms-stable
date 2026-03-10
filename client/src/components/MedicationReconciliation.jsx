import React, { useState } from 'react';
import { Table, Button, Form, Modal, Badge } from 'react-bootstrap';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';

const MedicationReconciliation = ({ hospitalMeds = [] }) => {
    const [homeMeds, setHomeMeds] = useState([
        { drug: 'Metformin', dose: '500mg', freq: 'BID', last_taken: 'Yesterday' }
    ]); // Initial dummy data

    const [showAddModal, setShowAddModal] = useState(false);
    const [newMed, setNewMed] = useState({ drug: '', dose: '', freq: '', last_taken: '' });

    const handleAddMed = () => {
        setHomeMeds([...homeMeds, newMed]);
        setNewMed({ drug: '', dose: '', freq: '', last_taken: '' });
        setShowAddModal(false);
    };

    const handleDeleteMed = (idx) => {
        setHomeMeds(homeMeds.filter((_, i) => i !== idx));
    };

    return (
        <div className="med-rec-container">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Medication Reconciliation</h6>
                <Button variant="outline-secondary" size="sm" onClick={() => setShowAddModal(true)}>
                    <Plus size={16} className="me-1" /> Add Home Med
                </Button>
            </div>

            <div className="row g-0 border rounded overflow-hidden">
                {/* Home Meds Column */}
                <div className="col-md-6 border-end">
                    <div className="p-2 bg-light border-bottom fw-bold text-center">Home Medications</div>
                    <div className="p-2">
                        {homeMeds.length > 0 ? (
                            <Table size="sm" borderless hover className="mb-0">
                                <tbody>
                                    {homeMeds.map((med, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div className="fw-bold">{med.drug}</div>
                                                <small className="text-muted">{med.dose} - {med.freq}</small>
                                            </td>
                                            <td className="text-end align-middle">
                                                <div className="d-flex align-items-center justify-content-end gap-2">
                                                    <Badge bg="secondary" className="fw-normal">Last: {med.last_taken}</Badge>
                                                    <Button variant="link" className="p-0 text-danger" size="sm" onClick={() => handleDeleteMed(idx)}>
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : <div className="text-center text-muted py-3 small">No home meds recorded</div>}
                    </div>
                </div>

                {/* Hospital Meds Column */}
                <div className="col-md-6 bg-light bg-opacity-10">
                    <div className="p-2 bg-success bg-opacity-10 border-bottom fw-bold text-center text-success">Active Hospital Orders</div>
                    <div className="p-2">
                        {hospitalMeds.length > 0 ? (
                            <Table size="sm" borderless hover className="mb-0">
                                <tbody>
                                    {hospitalMeds.map((med, idx) => (
                                        <tr key={med.id || idx}>
                                            <td className="align-middle text-muted"><ArrowRight size={16} /></td>
                                            <td>
                                                <div className="fw-bold text-success">{med.description}</div>
                                                <small className="text-muted">Status: {med.status}</small>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : <div className="text-center text-muted py-3 small">No active hospital orders</div>}
                    </div>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-2 text-muted small fst-italic">
                * Review discrepancies between home medications and active hospital orders.
            </div>

            {/* Add Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="sm">
                <Modal.Header closeButton><Modal.Title>Add Home Medication</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-2">
                        <Form.Label>Drug Name</Form.Label>
                        <Form.Control value={newMed.drug} onChange={e => setNewMed({ ...newMed, drug: e.target.value })} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                        <Form.Label>Dosage</Form.Label>
                        <Form.Control value={newMed.dose} onChange={e => setNewMed({ ...newMed, dose: e.target.value })} placeholder="e.g. 500mg" />
                    </Form.Group>
                    <Form.Group className="mb-2">
                        <Form.Label>Frequency</Form.Label>
                        <Form.Control value={newMed.freq} onChange={e => setNewMed({ ...newMed, freq: e.target.value })} placeholder="e.g. OD, BID" />
                    </Form.Group>
                    <Form.Group className="mb-2">
                        <Form.Label>Last Taken</Form.Label>
                        <Form.Control value={newMed.last_taken} onChange={e => setNewMed({ ...newMed, last_taken: e.target.value })} placeholder="e.g. This morning" />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleAddMed} disabled={!newMed.drug}>Add</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default MedicationReconciliation;
