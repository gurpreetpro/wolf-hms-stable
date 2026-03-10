import React, { useState } from 'react';
import { Button, Modal, Form, Row, Col } from 'react-bootstrap';
import { Wifi, Activity } from 'lucide-react';
import api from '../utils/axiosInstance';

const DeviceSimulator = () => {
    const [show, setShow] = useState(false);
    const [deviceId, setDeviceId] = useState('DEV-BP-01');
    const [type, setType] = useState('BP');
    const [value, setValue] = useState('120/80');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        setSending(true);
        try {
            await api.post('/api/devices/ingest', {
                deviceId,
                type,
                value,
                timestamp: new Date().toISOString()
            });
            alert('Data Sent!');
        } catch (error) {
            console.error(error);
            alert('Failed to send data: ' + error.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <Button variant="outline-info" size="sm" onClick={() => setShow(true)} className="ms-2">
                <Wifi size={16} className="me-1" /> IoT Sim
            </Button>

            <Modal show={show} onHide={() => setShow(false)}>
                <Modal.Header closeButton>
                    <Modal.Title><Activity size={20} className="me-2" /> IoT Device Simulator</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Device ID (Mapped to Beds)</Form.Label>
                            <Form.Select value={deviceId} onChange={e => setDeviceId(e.target.value)}>
                                <option value="DEV-BP-01">Bed 1 - BP Monitor</option>
                                <option value="DEV-BP-02">Bed 2 - BP Monitor</option>
                                <option value="DEV-OXI-01">Bed 1 - Oximeter</option>
                                <option value="DEV-IOT-GENERIC">Generic Device</option>
                            </Form.Select>
                        </Form.Group>
                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select value={type} onChange={e => setType(e.target.value)}>
                                        <option value="BP">Blood Pressure</option>
                                        <option value="HR">Heart Rate</option>
                                        <option value="SPO2">SPO2</option>
                                        <option value="Temp">Temperature</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Value</Form.Label>
                                    <Form.Control value={value} onChange={e => setValue(e.target.value)} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="d-grid">
                            <Button variant="primary" disabled={sending} onClick={handleSend}>
                                {sending ? 'Sending...' : 'Transmit Signal'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default DeviceSimulator;
