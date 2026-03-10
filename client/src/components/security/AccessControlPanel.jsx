import React, { useState } from 'react';
import { Button, Form, Modal, Badge } from 'react-bootstrap';
import { Lock, Unlock, AlertOctagon, Power } from 'lucide-react';
import securityService from '../../services/securityService';

const AccessControlPanel = ({ gates, onUpdate }) => {
    const [lockdownProcessing, setLockdownProcessing] = useState(false);
    const [showLockdownConfirm, setShowLockdownConfirm] = useState(false);
    const [togglingGate, setTogglingGate] = useState(null);

    const handleGateToggle = async (gate) => {
        setTogglingGate(gate.id);
        try {
            const newStatus = gate.status === 'LOCKED' ? 'OPEN' : 'LOCKED';
            await securityService.toggleGate(gate.id, newStatus);
            if (onUpdate) onUpdate(); // Refresh dashboard
        } catch (error) {
            console.error("Gate toggle failed", error);
        } finally {
            setTogglingGate(null);
        }
    };

    const handleLockdown = async () => {
        setLockdownProcessing(true);
        try {
            await securityService.toggleLockdown(true);
            setShowLockdownConfirm(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Lockdown failed", error);
        } finally {
            setLockdownProcessing(false);
        }
    };

    return (
        <div className="glass-panel h-100 d-flex flex-column">
            <div className="p-3 d-flex justify-content-between align-items-center border-bottom border-light" style={{ borderColor: 'var(--sec-glass-border)' }}>
                <h5 className="sec-font-header mb-0 d-flex align-items-center text-neon-blue">
                    <Lock size={20} className="me-2 text-neon-red" />
                    Access Control
                </h5>
                <Button 
                    variant="outline-danger" 
                    size="sm" 
                    className="d-flex align-items-center fw-bold text-uppercase"
                    style={{ letterSpacing: '1px' }}
                    onClick={() => setShowLockdownConfirm(true)}
                >
                    <AlertOctagon size={16} className="me-1" />
                    LOCKDOWN
                </Button>
            </div>
            <div className="p-3 flex-grow-1 overflow-auto">
                <div className="d-grid gap-3">
                    {gates && gates.length > 0 ? (
                        gates.map((gate) => (
                            <div key={gate.id} className="d-flex justify-content-between align-items-center p-3 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <h6 className="text-white mb-1 sec-font-header" style={{ fontSize: '0.9rem' }}>{gate.name}</h6>
                                    <Badge bg={gate.status === 'LOCKED' ? 'danger' : 'success'}>
                                        {gate.status}
                                    </Badge>
                                </div>
                                <Button 
                                    variant={gate.status === 'LOCKED' ? 'outline-success' : 'outline-danger'}
                                    size="sm"
                                    onClick={() => handleGateToggle(gate)}
                                    disabled={togglingGate === gate.id}
                                    className="d-flex align-items-center"
                                >
                                    {togglingGate === gate.id ? (
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    ) : (
                                        gate.status === 'LOCKED' ? <Unlock size={18} /> : <Lock size={18} />
                                    )}
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-muted text-center my-3 opacity-50">No gates configured.</p>
                    )}
                </div>
            </div>

            {/* Lockdown Confirmation Modal */}
            <Modal 
                show={showLockdownConfirm} 
                onHide={() => setShowLockdownConfirm(false)}
                centered
                backdrop="static"
                contentClassName="bg-dark text-white border-danger"
            >
                <Modal.Header closeButton closeVariant="white" className="border-secondary">
                    <Modal.Title className="text-danger fw-bold sec-font-header">
                        <AlertOctagon size={24} className="me-2" />
                        CONFIRM LOCKDOWN
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center py-4">
                    <h5 className="mb-3 text-neon-red">Are you sure?</h5>
                    <p className="text-muted">This will immediately LOCK ALL GATES and trigger a facility-wide CODE SILVER alert.</p>
                </Modal.Body>
                <Modal.Footer className="border-secondary justify-content-center">
                    <Button variant="secondary" onClick={() => setShowLockdownConfirm(false)}>Cancel</Button>
                    <Button 
                        variant="danger" 
                        onClick={handleLockdown} 
                        disabled={lockdownProcessing}
                        className="fw-bold px-4"
                        style={{ boxShadow: '0 0 15px rgba(255,0,0,0.4)' }}
                    >
                        {lockdownProcessing ? 'ACTIVATING...' : 'INITIATE LOCKDOWN'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AccessControlPanel;
