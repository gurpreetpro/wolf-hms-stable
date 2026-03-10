import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const AdmissionModal = ({ show, onHide, patient, onAdmit }) => {
    const [ward, setWard] = useState('General');
    const [bedNumber, setBedNumber] = useState('');
    const [availableBeds, setAvailableBeds] = useState([]);
    const [loadingBeds, setLoadingBeds] = useState(false);
    const [wards, setWards] = useState([]); // State for ward list
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Helper to unwrap key-value response from backend
    const getListData = (res) => {
        if (Array.isArray(res.data)) return res.data;
        if (res.data && Array.isArray(res.data.data)) return res.data.data;
        return [];
    };

    // Fetch wards on mount
    useEffect(() => {
        const fetchWards = async () => {
            if (!show) return;
            try {
                const res = await api.get('/api/ward/wards');
                const data = getListData(res);
                
                if (data.length === 0) {
                    setError('Status: Loaded 0 wards (Server returned empty list)');
                    setWards([]);
                } else {
                    setWards(data);
                    // Set default ward if empty or matches existing default logic
                     const exists = data.some(w => w.name === ward);
                     if (!exists) {
                         setWard(data[0].name);
                     }
                }
            } catch (err) {
                console.error('Failed to fetch wards:', err);
                setError(`Failed to load wards: ${err.message || 'Unknown Error'}`);
            }
        };
        fetchWards();
    }, [show]); 

    // Fetch available beds when ward changes or modal opens
    useEffect(() => {
        const fetchAvailableBeds = async () => {
            if (!show) return;

            setLoadingBeds(true);
            setBedNumber(''); 

            try {
                // Ensure ward is not empty before fetching
                if (!ward) return; 
                
                const res = await api.get(`/api/admissions/available-beds?ward=${ward}`);
                // Unwrap beds data
                const beds = getListData(res);
                setAvailableBeds(beds);
            } catch (err) {
                console.error('Failed to fetch beds:', err);
                setAvailableBeds([]);
            } finally {
                setLoadingBeds(false);
            }
        };

        fetchAvailableBeds();
    }, [ward, show]);

    // Reset form when modal closes
    useEffect(() => {
        if (!show) {
            setBedNumber('');
            setAvailableBeds([]);
            setError('');
        }
    }, [show]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!bedNumber) {
            setError('Please select a bed');
            return;
        }

        setLoading(true);

        // Determine correct UUID
        // If patient is from Queue, 'id' is int, 'patient_id' is UUID.
        // If patient is User object, 'id' is UUID.
        const patientUUID = patient.patient_id || patient.id;

        try {
            const res = await api.post('/api/admissions/admit', {
                patient_id: patientUUID,
                ward,
                bed_number: bedNumber
            });

            // Unwrap response for callback
            const admittedData = res.data.data || res.data;
            onAdmit(admittedData);
            onHide();
            setBedNumber('');
        } catch (err) {
            console.error('Admission Error:', err);
            if (err.response && err.response.status === 400) {
                // [FIX] Show detailed validation errors if available
                const valErrors = err.response.data.errors;
                if (valErrors && valErrors.length > 0) {
                     setError(`Validation Error: ${valErrors.join(', ')}`);
                } else {
                     setError(`Error: ${err.response.data.message}`); 
                }
            } else {
                setError('Failed to admit patient. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} fullscreen={true} aria-labelledby="admission-modal">
            <Modal.Header closeButton>
                <Modal.Title>Admit Patient: {patient?.patient_name || patient?.name}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger" style={{whiteSpace: 'pre-wrap'}}>{error}</Alert>}

                    <Form.Group className="mb-3">
                        <Form.Label>Ward</Form.Label>
                        <Form.Select value={ward} onChange={(e) => setWard(e.target.value)}>
                            {wards.length > 0 ? (
                                wards.map(w => (
                                    <option key={w.id} value={w.name}>{w.name}</option>
                                ))
                            ) : (
                                <option value="">{error ? 'Server returned 0 wards' : (wards === null ? 'Loading...' : 'No wards found')}</option>
                            )}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Bed Number</Form.Label>
                        {loadingBeds ? (
                            <div className="d-flex align-items-center gap-2 py-2">
                                <Spinner animation="border" size="sm" />
                                <span className="text-muted">Loading available beds...</span>
                            </div>
                        ) : availableBeds.length > 0 ? (
                            <Form.Select
                                value={bedNumber}
                                onChange={(e) => setBedNumber(e.target.value)}
                                required
                            >
                                <option value="">Select a bed...</option>
                                {availableBeds.map((bed) => (
                                    <option key={bed.id} value={bed.bed_number}>
                                        {bed.bed_number}
                                    </option>
                                ))}
                            </Form.Select>
                        ) : (
                            <Alert variant="warning" className="mb-0 py-2">
                                No available beds in {ward} ward. Please select another ward or contact admin.
                            </Alert>
                        )}
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button
                        variant="danger"
                        type="submit"
                        disabled={loading || loadingBeds || availableBeds.length === 0}
                    >
                        {loading ? 'Admitting...' : 'Confirm Admission'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default AdmissionModal;
