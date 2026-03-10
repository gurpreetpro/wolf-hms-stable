import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, Button } from 'react-bootstrap';

const HL7ADTFeed = () => {
    const [activeTab, setActiveTab] = useState('live');

    const liveFeed = [
        { id: 'MSG-00891', type: 'A01', event: 'Admit', patient: 'Ramesh Kumar', mrn: 'MR-10045', location: 'Ward 3A, Bed 12', time: '14:32:05', status: 'Sent' },
        { id: 'MSG-00890', type: 'A03', event: 'Discharge', patient: 'Priya Sharma', mrn: 'MR-10032', location: 'Ward 2B, Bed 8', time: '14:28:11', status: 'Sent' },
        { id: 'MSG-00889', type: 'A02', event: 'Transfer', patient: 'Suresh Mehta', mrn: 'MR-10078', location: 'ICU → Ward 4A', time: '14:15:44', status: 'Sent' },
        { id: 'MSG-00888', type: 'A08', event: 'Update', patient: 'Anita Reddy', mrn: 'MR-10091', location: 'Ward 1C, Bed 3', time: '13:55:20', status: 'Sent' },
        { id: 'MSG-00887', type: 'A01', event: 'Admit', patient: 'Vikram Joshi', mrn: 'MR-10105', location: 'ED → ICU Bed 5', time: '13:42:38', status: 'ACK' },
        { id: 'MSG-00886', type: 'A04', event: 'Registration', patient: 'Meera Patel', mrn: 'MR-10112', location: 'OPD Registration', time: '13:30:00', status: 'Sent' },
        { id: 'MSG-00885', type: 'A03', event: 'Discharge', patient: 'Arun Singh', mrn: 'MR-10089', location: 'Ward 5B, Bed 2', time: '12:45:12', status: 'NACK' },
    ];

    const subscribers = [
        { name: 'Wolf Care (Patient App)', endpoint: 'wss://care.wolfhms.in/hl7', events: ['A01', 'A03', 'A08'], status: 'Connected', lastPing: '2s ago' },
        { name: 'Wolf Lab Bridge', endpoint: 'tcp://lab-bridge:2575', events: ['A01', 'A04'], status: 'Connected', lastPing: '5s ago' },
        { name: 'Insurance Gateway', endpoint: 'https://tpa.gateway/hl7/adt', events: ['A01', 'A02', 'A03'], status: 'Connected', lastPing: '8s ago' },
        { name: 'ABHA/ABDM HIP', endpoint: 'https://abdm.wolfhms.in/notify', events: ['A01', 'A03'], status: 'Connected', lastPing: '12s ago' },
        { name: 'Analytics Engine', endpoint: 'amqp://analytics-queue', events: ['A01', 'A02', 'A03', 'A04', 'A08'], status: 'Connected', lastPing: '3s ago' },
        { name: 'Legacy HIS (MLLP)', endpoint: 'mllp://192.168.1.50:2575', events: ['A01', 'A03'], status: 'Disconnected', lastPing: '5min ago' },
    ];

    const messageTypes = [
        { code: 'A01', name: 'ADT^A01 — Admit', desc: 'Patient admitted to inpatient bed', count: 45, today: 12 },
        { code: 'A02', name: 'ADT^A02 — Transfer', desc: 'Patient transferred between locations', count: 18, today: 4 },
        { code: 'A03', name: 'ADT^A03 — Discharge', desc: 'Patient discharged from facility', count: 38, today: 9 },
        { code: 'A04', name: 'ADT^A04 — Register', desc: 'Outpatient/ED registration', count: 120, today: 35 },
        { code: 'A08', name: 'ADT^A08 — Update', desc: 'Patient information updated', count: 85, today: 22 },
        { code: 'A11', name: 'ADT^A11 — Cancel Admit', desc: 'Admission cancelled/reversed', count: 3, today: 0 },
        { code: 'A13', name: 'ADT^A13 — Cancel Discharge', desc: 'Discharge reversed', count: 1, today: 0 },
    ];

    const eventColor = (e) => ({ Admit: 'success', Discharge: 'info', Transfer: 'warning', Update: 'secondary', Registration: 'primary' }[e] || 'secondary');
    const statusColor = (s) => ({ Sent: 'success', ACK: 'primary', NACK: 'danger', Connected: 'success', Disconnected: 'danger' }[s] || 'secondary');

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">📡 HL7 ADT Feed Management</h3>
                <Badge bg="success" className="fs-6">● Live — {liveFeed.length} messages/hr</Badge>
            </div>

            <Row className="mb-4 g-3">
                {[
                    { t: 'Messages Today', v: 82, c: 'primary' },
                    { t: 'Active Subscribers', v: subscribers.filter(s => s.status === 'Connected').length, c: 'success' },
                    { t: 'Failed (NACK)', v: 1, c: 'danger' },
                    { t: 'Avg Latency', v: '45ms', c: 'info' },
                ].map((k, i) => (
                    <Col md={3} key={i}><Card className="border-0 shadow-sm text-center"><Card.Body className="py-3"><small className="text-muted">{k.t}</small><h4 className={`fw-bold text-${k.c} mb-0`}>{k.v}</h4></Card.Body></Card></Col>
                ))}
            </Row>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                <Tab eventKey="live" title="📡 Live Feed">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle" size="sm">
                        <thead className="bg-light"><tr><th>MSG ID</th><th>Type</th><th>Event</th><th>Patient</th><th>MRN</th><th>Location</th><th>Time</th><th>Status</th></tr></thead>
                        <tbody>{liveFeed.map(m => (
                            <tr key={m.id} className={m.status === 'NACK' ? 'table-danger' : ''}>
                                <td><code className="small">{m.id}</code></td>
                                <td><Badge bg="dark">{m.type}</Badge></td>
                                <td><Badge bg={eventColor(m.event)}>{m.event}</Badge></td>
                                <td><strong>{m.patient}</strong></td>
                                <td><small>{m.mrn}</small></td>
                                <td><small>{m.location}</small></td>
                                <td><small>{m.time}</small></td>
                                <td><Badge bg={statusColor(m.status)}>{m.status}</Badge></td>
                            </tr>
                        ))}</tbody>
                    </Table></Card>
                </Tab>

                <Tab eventKey="subscribers" title="🔗 Subscribers">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>System</th><th>Endpoint</th><th>Subscribed Events</th><th>Status</th><th>Last Ping</th></tr></thead>
                        <tbody>{subscribers.map(s => (
                            <tr key={s.name} className={s.status === 'Disconnected' ? 'table-danger' : ''}>
                                <td><strong>{s.name}</strong></td>
                                <td><code className="small">{s.endpoint}</code></td>
                                <td>{s.events.map(e => <Badge key={e} bg="dark" className="me-1">{e}</Badge>)}</td>
                                <td><Badge bg={statusColor(s.status)}>● {s.status}</Badge></td>
                                <td><small>{s.lastPing}</small></td>
                            </tr>
                        ))}</tbody>
                    </Table></Card>
                </Tab>

                <Tab eventKey="types" title="📋 Message Types">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>Code</th><th>Message Type</th><th>Description</th><th>Total (30d)</th><th>Today</th></tr></thead>
                        <tbody>{messageTypes.map(t => (
                            <tr key={t.code}>
                                <td><Badge bg="dark" className="fs-6">{t.code}</Badge></td>
                                <td><strong>{t.name}</strong></td>
                                <td><small>{t.desc}</small></td>
                                <td>{t.count}</td>
                                <td className="fw-bold">{t.today}</td>
                            </tr>
                        ))}</tbody>
                    </Table></Card>
                </Tab>
            </Tabs>
        </Container>
    );
};

export default HL7ADTFeed;
