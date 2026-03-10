import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Table } from 'react-bootstrap';
import { CheckCircle, AlertTriangle, ClipboardList, Activity } from 'lucide-react';
import axios from 'axios';
import PACAssessmentForm from '../components/pac/PACAssessmentForm';

const PACDashboard = () => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSurgery, setSelectedSurgery] = useState(null);
    const [showForm, setShowForm] = useState(false);

    const fetchPending = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/pac/pending');
            setPatients(res.data.data || res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleOpenAssessment = (surgery) => {
        setSelectedSurgery(surgery);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setSelectedSurgery(null);
        fetchPending(); // Refresh list
    };

    const getStatusBadge = (status) => {
        if (!status) return <Badge bg="secondary">Pending</Badge>;
        if (status === 'Fit') return <Badge bg="success">Fit for Surgery</Badge>;
        if (status === 'Unfit') return <Badge bg="danger">Unfit</Badge>;
        return <Badge bg="warning">{status}</Badge>;
    };

    return (
        <Container fluid className="p-4">
            <h2 className="mb-4"><Activity className="me-2 text-primary" />Pre-Anesthesia Checkup (PAC)</h2>

            {loading ? <Spinner animation="border" /> : (
                <Card className="shadow-sm">
                    <Card.Header as="h5">Scheduled Surgeries Assessment Queue</Card.Header>
                    <Table hover responsive>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Patient</th>
                                <th>Procedure</th>
                                <th>Age/Gender</th>
                                <th>PAC Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patients.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center">No scheduled surgeries pending review.</td>
                                </tr>
                            ) : patients.map(p => (
                                <tr key={p.surgery_id}>
                                    <td>{new Date(p.start_time).toLocaleDateString()}</td>
                                    <td>{p.patient_name}</td>
                                    <td>{p.procedure_name}</td>
                                    <td>{p.age} / {p.gender}</td>
                                    <td>{getStatusBadge(p.current_status)}</td>
                                    <td>
                                        <Button variant="outline-primary" size="sm" onClick={() => handleOpenAssessment(p)}>
                                            <ClipboardList size={16} className="me-1" /> Assess
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card>
            )}

            {/* Assessment Modal/Form Overlay */}
            {showForm && selectedSurgery && (
                <PACAssessmentForm 
                    show={showForm} 
                    onHide={handleCloseForm} 
                    surgery={selectedSurgery} 
                />
            )}
        </Container>
    );
};

export default PACDashboard;
