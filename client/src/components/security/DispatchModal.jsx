
import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { Mic, Send, Radio } from 'lucide-react';
import securityService from '../../services/securityService';

const DispatchModal = ({ show, onHide, activeGuards = [] }) => {
    const [message, setMessage] = useState('');
    const [targetId, setTargetId] = useState('BROADCAST');
    const [priority, setPriority] = useState('High');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        setStatus(null);

        const dispatchData = {
            message,
            targetGuardId: targetId === 'BROADCAST' ? null : targetId,
            priority
        };

        try {
            const result = await securityService.sendDispatch(dispatchData);
            if (result && result.success) {
                setStatus({ type: 'success', msg: 'Dispatch Sent Successfully' });
                setTimeout(() => {
                    onHide();
                    setMessage('');
                    setStatus(null);
                }, 1500);
            } else {
                setStatus({ type: 'danger', msg: 'Failed to send dispatch' });
            }
        } catch (error) {
            setStatus({ type: 'danger', msg: 'Network Error' });
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered className="glass-modal">
            <Modal.Header closeButton>
                <Modal.Title className="d-flex align-items-center text-neon-blue">
                    <Radio className="me-2" size={24} />
                    Voice Dispatch
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {status && <Alert variant={status.type}>{status.msg}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Target System</Form.Label>
                        <Form.Select 
                            value={targetId} 
                            onChange={(e) => setTargetId(e.target.value)}
                            className="bg-dark text-light border-secondary"
                        >
                            <option value="BROADCAST">📣 BROADCAST (ALL UNITS)</option>
                            {activeGuards.map(g => (
                                <option key={g.id} value={g.id}>👮 {g.guard_name} ({g.location || 'Unknown'})</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                         <Form.Label>Priority Level</Form.Label>
                         <div className="d-flex gap-3">
                            {['Medium', 'High', 'Critical'].map(p => (
                                <Form.Check 
                                    key={p}
                                    type="radio"
                                    label={p}
                                    name="priority"
                                    checked={priority === p}
                                    onChange={() => setPriority(p)}
                                    className={p === 'Critical' ? 'text-danger fw-bold' : 'text-light'}
                                />
                            ))}
                         </div>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Message (TTS)</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={3} 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type message to broadcast..."
                            required
                            className="bg-dark text-light border-secondary"
                        />
                    </Form.Group>

                    <div className="d-flex justify-content-end gap-2">
                        <Button variant="secondary" onClick={onHide}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={sending || !message}>
                            {sending ? 'Sending...' : <><Send size={18} className="me-2"/> Send Dispatch</>}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
            <style jsx>{`
                .glass-modal .modal-content {
                    background: rgba(20, 20, 30, 0.95);
                    border: 1px solid rgba(0, 229, 255, 0.3);
                    color: white;
                }
                .text-neon-blue { color: #00e5ff; text-shadow: 0 0 10px rgba(0, 229, 255, 0.5); }
            `}</style>
        </Modal>
    );
};

export default DispatchModal;
