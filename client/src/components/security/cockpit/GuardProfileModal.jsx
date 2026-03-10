import React, { useState, useEffect } from 'react';
import { Modal, Button, Tabs, Tab, Table, Badge, Card, Spinner } from 'react-bootstrap';
import { User, Activity, FileText, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const GuardProfileModal = ({ show, onHide, guard }) => {
    const [handovers, setHandovers] = useState([]);
    const [metrics, setMetrics] = useState({ efficiency: 95, response: 'N/A', steps: 0, patrols: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (show && guard) {
            fetchHandovers();
            fetchMetrics();
        }
    }, [show, guard]);

    const fetchHandovers = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/security/handover/${guard.guard_id}`);
            if (res.data.success) {
                setHandovers(res.data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetrics = async () => {
        try {
            const res = await axios.get(`/api/security/guard/${guard.guard_id}/metrics`);
            if (res.data.success) {
                const d = res.data.data;
                setMetrics({
                    efficiency: d.efficiencyScore || 95,
                    response: '2m 14s', // Still calculated/mocked on backend for now
                    steps: guard.steps || 0,
                    patrols: d.totalPatrols || 0
                });
            }
        } catch (error) {
            console.error("Failed to load metrics", error);
        }
    };

    if (!guard) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered contentClassName="bg-dark border border-info text-white">
            <Modal.Header closeButton closeVariant="white" className="border-bottom border-secondary">
                <Modal.Title className="sec-font d-flex align-items-center">
                    <User size={24} className="me-2 text-info"/>
                    UNIT FILE: <span className="text-info ms-2">{guard.username}</span>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="d-flex mb-4 gap-4">
                    <img src={guard.avatar || `https://ui-avatars.com/api/?name=${guard.username}&background=0DCAF0&color=fff`} 
                         className="rounded border border-info" width="100" height="100" alt="Avatar"/>
                    <div>
                        <h5 className="mb-1">{guard.username}</h5>
                        <div className="text-muted small mb-2">ID: {guard.guard_id}</div>
                        <Badge bg={guard.status === 'ONLINE' ? 'success' : 'secondary'} className="me-2">
                            {guard.status}
                        </Badge>
                        <Badge bg="info" text="dark">Battery: {Math.round(guard.batteryLevel * 100)}%</Badge>
                        <div className="mt-2 small text-info font-monospace">
                            LAST LOCATION: {guard.latitude?.toFixed(4)}, {guard.longitude?.toFixed(4)}
                        </div>
                    </div>
                </div>

                <Tabs defaultActiveKey="stats" className="mb-3 sec-tabs">
                    <Tab eventKey="stats" title="PERFORMANCE">
                        <div className="p-3 bg-secondary bg-opacity-10 rounded">
                            <h6 className="text-warning mb-3"><Activity size={16} className="me-2"/>LIVE METRICS (LAST 7 DAYS)</h6>
                            <p>Patrol Efficiency: <strong className="text-success">{metrics.efficiency}%</strong></p>
                            <p>Patrols Completed: <strong className="text-white">{metrics.patrols}</strong></p>
                            <p>Steps Today: <strong className="text-white">{guard.steps || 0}</strong></p>
                        </div>
                    </Tab>
                    
                    <Tab eventKey="logbook" title="DIGITAL LOGBOOK">
                        <div className="p-2" style={{maxHeight: '400px', overflowY: 'auto'}}>
                            {loading ? <div className="text-center p-4"><Spinner animation="border" variant="info"/></div> : (
                                handovers.length === 0 ? <p className="text-muted text-center">No digital logs on file.</p> :
                                handovers.map(log => (
                                    <Card key={log.id} className="mb-3 bg-dark border-secondary">
                                        <Card.Header className="d-flex justify-content-between align-items-center py-2">
                                            <span className="text-info small fw-bold">
                                                <FileText size={14} className="me-2"/>
                                                SHIFT END: {new Date(log.created_at).toLocaleString()}
                                            </span>
                                            <Badge bg="secondary">SIGNED</Badge>
                                        </Card.Header>
                                        <Card.Body>
                                            <div className="row">
                                                <div className="col-md-8 border-end border-secondary">
                                                    <h6 className="text-muted small">NOTES</h6>
                                                    <p className="small mb-0">{log.notes}</p>
                                                    <div className="mt-3">
                                                        <h6 className="text-muted small">INVENTORY CHECK</h6>
                                                        <div className="d-flex gap-3 small">
                                                            {Object.entries(log.inventory_check || {}).map(([item, checked]) => (
                                                                <span key={item} className={checked ? 'text-success' : 'text-danger'}>
                                                                    {checked ? <CheckCircle size={12}/> : <XCircle size={12}/>} {item.toUpperCase()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-4 d-flex flex-column align-items-center justify-content-center">
                                                    <div className="bg-white p-2 rounded mb-1 w-100 d-flex justify-content-center">
                                                        {log.signature_url ? (
                                                            <img src={log.signature_url}  alt="Sig" style={{maxHeight: '60px', maxWidth: '100%'}}/> 
                                                        ) : <span className="text-muted small">No Sig</span>}
                                                    </div>
                                                    <small className="text-muted" style={{fontSize: '0.6rem'}}>DIGITALLY SIGNED</small>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                ))
                            )}
                        </div>
                    </Tab>
                </Tabs>
            </Modal.Body>
            <Modal.Footer className="border-top border-secondary">
                <Button variant="outline-light" size="sm" onClick={onHide}>CLOSE</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default GuardProfileModal;
