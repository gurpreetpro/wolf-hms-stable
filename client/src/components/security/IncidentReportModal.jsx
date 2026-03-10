
import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { AlertTriangle, Plus } from 'lucide-react';
import securityService from '../../services/securityService';

const IncidentReportModal = ({ show, onHide, onReportCreated }) => {
    const [title, setTitle] = useState('');
    const [locations, setLocations] = useState(['General', 'Main Gate', 'Lobby', 'ER Entrance', 'Server Room', 'Parking Lot']);
    const [location, setLocation] = useState('General');
    const [severity, setSeverity] = useState('Low');
    const [description, setDescription] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await securityService.createIncident({
                title,
                location,
                severity,
                description,
                type: 'Security'                
            });
            
            // Reset and Close
            setTitle('');
            setDescription('');
            setLocation('General');
            setSeverity('Low');
            onHide();
            if (onReportCreated) onReportCreated();
        } catch (err) {
            console.error("Report failed", err);
            setError('Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered contentClassName="bg-dark text-white border-warning">
            <Modal.Header closeButton closeVariant="white" className="border-secondary">
                <Modal.Title className="text-warning d-flex align-items-center">
                    <AlertTriangle size={24} className="me-2" />
                    Report New Incident
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Incident Title</Form.Label>
                        <Form.Control 
                            type="text" 
                            placeholder="e.g. Broken Lock, Suspicious Person" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="bg-secondary text-white border-0"
                        />
                    </Form.Group>

                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>Location</Form.Label>
                                <Form.Select 
                                    value={location} 
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="bg-secondary text-white border-0"
                                >
                                    {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                </Form.Select>
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>Severity</Form.Label>
                                <Form.Select 
                                    value={severity} 
                                    onChange={(e) => setSeverity(e.target.value)}
                                    className="bg-secondary text-white border-0"
                                >
                                    <option value="Low">Low (Log only)</option>
                                    <option value="Medium">Medium (Require Action)</option>
                                    <option value="High">High (Urgent)</option>
                                    <option value="Critical">Critical (Emergency)</option>
                                </Form.Select>
                            </Form.Group>
                        </div>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={3} 
                            placeholder="Describe the situation..." 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-secondary text-white border-0"
                        />
                    </Form.Group>

                    <div className="d-flex justify-content-end gap-2">
                        <Button variant="outline-secondary" onClick={onHide}>Cancel</Button>
                        <Button type="submit" variant="warning" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Filing Report...
                                </>
                            ) : (
                                <>
                                    <Plus size={18} className="me-1" />
                                    Submit Report
                                </>
                            )}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default IncidentReportModal;
