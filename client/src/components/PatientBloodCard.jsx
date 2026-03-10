import { useState, useEffect } from 'react';
import { Card, Badge, Table, Alert, Spinner, Button } from 'react-bootstrap';
import { Droplet, Clock, AlertTriangle, CheckCircle, History } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';

// Blood Group Colors
const bloodGroupColors = {
    'A+': '#dc3545', 'A-': '#c82333',
    'B+': '#28a745', 'B-': '#218838',
    'O+': '#007bff', 'O-': '#0056b3',
    'AB+': '#6f42c1', 'AB-': '#5a32a3'
};

export default function PatientBloodCard({ patientId, showHistory = false }) {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!patientId) return;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                const profileRes = await axiosInstance.get(`/blood-bank/patient/${patientId}/blood-profile`);
                setProfile(profileRes.data);

                if (showHistory) {
                    const historyRes = await axiosInstance.get(`/blood-bank/patient/${patientId}/transfusion-history`);
                    setHistory(historyRes.data.transfusions || []);
                }
            } catch (err) {
                console.error('Failed to fetch blood profile:', err);
                setError(err.response?.data?.message || 'Failed to load');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [patientId, showHistory]);

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-4">
                    <Spinner size="sm" className="text-danger" />
                </Card.Body>
            </Card>
        );
    }

    if (error || !profile) {
        return (
            <Alert variant="warning" className="mb-0">
                <AlertTriangle size={16} className="me-2" />
                {error || 'No blood profile data'}
            </Alert>
        );
    }

    const { patient, summary } = profile;
    const bloodGroup = patient?.blood_group;

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-danger text-white d-flex align-items-center">
                <Droplet size={18} className="me-2" />
                <span className="fw-bold">Blood Profile</span>
            </Card.Header>
            <Card.Body>
                {/* Blood Group Display */}
                <div className="text-center mb-3">
                    <div 
                        className="d-inline-block rounded-circle p-3"
                        style={{ 
                            backgroundColor: bloodGroup ? `${bloodGroupColors[bloodGroup]}20` : '#f8f9fa',
                            border: bloodGroup ? `3px solid ${bloodGroupColors[bloodGroup]}` : '3px solid #dee2e6'
                        }}
                    >
                        <h2 
                            className="mb-0 fw-bold"
                            style={{ color: bloodGroupColors[bloodGroup] || '#6c757d' }}
                        >
                            {bloodGroup || '?'}
                        </h2>
                    </div>
                    <div className="mt-2">
                        {patient?.blood_group_verified ? (
                            <Badge bg="success"><CheckCircle size={12} className="me-1" />Verified</Badge>
                        ) : (
                            <Badge bg="warning" text="dark"><AlertTriangle size={12} className="me-1" />Unverified</Badge>
                        )}
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="row text-center g-2 mb-3">
                    <div className="col-4">
                        <div className="bg-light rounded p-2">
                            <h5 className="mb-0 text-primary">{summary?.total_transfusions || 0}</h5>
                            <small className="text-muted">Transfusions</small>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="bg-light rounded p-2">
                            <h5 className="mb-0 text-danger">{summary?.total_reactions || 0}</h5>
                            <small className="text-muted">Reactions</small>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="bg-light rounded p-2">
                            <h5 className="mb-0 text-warning">{summary?.pending_requests || 0}</h5>
                            <small className="text-muted">Pending</small>
                        </div>
                    </div>
                </div>

                {/* Last Transfusion */}
                {summary?.last_transfusion && (
                    <div className="text-muted small">
                        <Clock size={12} className="me-1" />
                        Last: {new Date(summary.last_transfusion).toLocaleDateString()}
                    </div>
                )}

                {/* Reaction Warning */}
                {parseInt(summary?.total_reactions) > 0 && (
                    <Alert variant="danger" className="mt-3 mb-0 py-2">
                        <AlertTriangle size={14} className="me-2" />
                        Previous transfusion reaction(s) on record
                    </Alert>
                )}

                {/* Transfusion History */}
                {showHistory && history.length > 0 && (
                    <div className="mt-3">
                        <h6><History size={14} className="me-1" />Recent Transfusions</h6>
                        <Table size="sm" hover>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Blood</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.slice(0, 5).map((t, i) => (
                                    <tr key={i}>
                                        <td>{new Date(t.start_time).toLocaleDateString()}</td>
                                        <td><Badge bg="danger">{t.blood_group}</Badge></td>
                                        <td>
                                            <Badge bg={t.outcome === 'Completed' ? 'success' : 'warning'}>
                                                {t.outcome}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
}
