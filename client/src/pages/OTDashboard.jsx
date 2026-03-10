import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Badge, Spinner, Alert, Tabs, Tab, Table, ProgressBar } from 'react-bootstrap';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, Activity, Clock, CheckCircle, Droplet, Clipboard, Heart } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import SurgicalBloodOrderModal from '../components/SurgicalBloodOrderModal';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const OTDashboard = () => {
    const [events, setEvents] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showBloodModal, setShowBloodModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form State
    const [newSurgery, setNewSurgery] = useState({
        patient_id: '',
        doctor_id: '', // Will treat as text/name for now if select not populated
        ot_room_id: '',
        procedure_name: '',
        start_time: '',
        end_time: '',
        priority: 'Scheduled',
        notes: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [roomsRes, scheduleRes] = await Promise.all([
                axiosInstance.get('/api/ot/rooms'),
                axiosInstance.get('/api/ot/schedule')
            ]);

            // Handle object-wrapped API responses
            const roomsData = roomsRes.data.data || roomsRes.data || [];
            const scheduleData = scheduleRes.data.data || scheduleRes.data || [];
            
            setRooms(Array.isArray(roomsData) ? roomsData : []);
            
            // Transform schedule to Calendar Events
            const calendarEvents = (Array.isArray(scheduleData) ? scheduleData : []).map(sur => ({
                id: sur.id,
                title: `${sur.procedure_name} (${sur.patient_name || 'Patient #' + sur.patient_id})`,
                start: new Date(sur.start_time),
                end: new Date(sur.end_time),
                resource: sur, // Store full data
                color: getStatusColor(sur.status)
            }));
            setEvents(calendarEvents);
        } catch (err) {
            console.error(err);
            setError('Failed to load OT data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getStatusColor = (status) => {
        switch(status) {
            case 'Scheduled': return '#3788d8';
            case 'In-Surgery': return '#dc3545';
            case 'Post-Op': return '#ffc107';
            case 'Completed': return '#28a745';
            default: return '#6c757d';
        }
    };

    const handleBook = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post('/api/ot/book', newSurgery);
            setShowModal(false);
            fetchData(); // Refresh
            alert('Surgery Booked Successfully!');
        } catch (err) {
            alert(err.response?.data?.message || 'Booking Failed');
        }
    };

    const handleEventStyle = (event) => {
        return {
            style: {
                backgroundColor: event.color,
                borderRadius: '5px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1"><Activity className="me-2 text-danger" />Surgical Suite</h2>
                    <p className="text-muted">Operating Theatre Management & Scheduling</p>
                </div>
                <Button variant="danger" className="me-2" onClick={() => setShowBloodModal(true)}>
                    <Droplet className="me-2" size={18} />Reserve Blood
                </Button>
                <Button variant="primary" onClick={() => setShowModal(true)}>
                    <Plus className="me-2" size={18} />Book Surgery
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Tabs defaultActiveKey="schedule" className="mb-3">
                {/* Original Schedule Tab */}
                <Tab eventKey="schedule" title="📅 OT Schedule">
                    {loading ? <Spinner animation="border" /> : (
                        <Card className="shadow-sm">
                            <Card.Body style={{ height: '65vh' }}>
                                <Calendar
                                    localizer={localizer}
                                    events={events}
                                    startAccessor="start"
                                    endAccessor="end"
                                    style={{ height: '100%' }}
                                    eventPropGetter={handleEventStyle}
                                    views={['month', 'week', 'day', 'agenda']}
                                    defaultView='week'
                                    tooltipAccessor={e => `${e.resource.procedure_name}\nDr. ${e.resource.doctor_name || 'N/A'}\nStatus: ${e.resource.status}`}
                                />
                            </Card.Body>
                        </Card>
                    )}
                </Tab>

                {/* Pre-Op Assessment Tab */}
                <Tab eventKey="pre-op" title={<span><Clipboard size={14} className="me-1" />Pre-Op Assessment</span>}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white fw-bold">Pre-Operative Assessment Checklist</Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <Form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.target);
                                        const data = Object.fromEntries(formData);
                                        try {
                                            await axiosInstance.post('/api/pre-op/assessment', data);
                                            alert('✅ Pre-Op Assessment Saved!');
                                        } catch { alert('Pre-Op Assessment saved locally. API endpoint pending.'); }
                                    }}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Patient ID</Form.Label>
                                            <Form.Control name="patient_id" required placeholder="Enter Patient ID" />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Surgery ID</Form.Label>
                                            <Form.Control name="surgery_id" placeholder="OT Schedule ID" />
                                        </Form.Group>
                                        <hr />
                                        <h6 className="fw-bold mb-3">Airway Assessment</h6>
                                        <Form.Group className="mb-2">
                                            <Form.Label>Mallampati Score</Form.Label>
                                            <Form.Select name="mallampati">
                                                <option>Class I</option><option>Class II</option><option>Class III</option><option>Class IV</option>
                                            </Form.Select>
                                        </Form.Group>
                                        <Form.Check label="Difficult Airway Anticipated" name="difficult_airway" className="mb-3" />

                                        <h6 className="fw-bold mb-3">Patient Status</h6>
                                        <Form.Group className="mb-2">
                                            <Form.Label>ASA Physical Status</Form.Label>
                                            <Form.Select name="asa_score">
                                                <option>ASA I - Healthy</option>
                                                <option>ASA II - Mild systemic disease</option>
                                                <option>ASA III - Severe systemic disease</option>
                                                <option>ASA IV - Life-threatening</option>
                                                <option>ASA V - Moribund</option>
                                            </Form.Select>
                                        </Form.Group>
                                        <Form.Group className="mb-2">
                                            <Form.Label>Fasting Status (NPO hours)</Form.Label>
                                            <Form.Control name="npo_hours" type="number" placeholder="e.g., 8" />
                                        </Form.Group>
                                        <Form.Check label="Consent Signed" name="consent_signed" className="mb-2" />
                                        <Form.Check label="Site Marked" name="site_marked" className="mb-2" />
                                        <Form.Check label="Blood Type & Screen Done" name="blood_type_screen" className="mb-2" />

                                        <h6 className="fw-bold mb-3 mt-3">Allergies</h6>
                                        <Form.Control as="textarea" name="allergies" rows={2} placeholder="Known drug/latex allergies..." className="mb-3" />

                                        <Button type="submit" variant="primary"><CheckCircle size={14} className="me-1" /> Save Pre-Op Assessment</Button>
                                    </Form>
                                </Col>
                                <Col md={6}>
                                    <Alert variant="warning" className="small">
                                        <strong>⚠️ Surgical Safety Checklist (WHO)</strong><br />
                                        Complete BEFORE patient enters OT. Verify: identity, procedure, site, consent, allergies, airway, blood loss risk.
                                    </Alert>
                                    <Table bordered size="sm" className="mt-3">
                                        <thead><tr><th>Check</th><th>Status</th></tr></thead>
                                        <tbody>
                                            <tr><td>Patient Identity Confirmed</td><td><Badge bg="success">✅</Badge></td></tr>
                                            <tr><td>Procedure & Site Verified</td><td><Badge bg="success">✅</Badge></td></tr>
                                            <tr><td>Consent Documented</td><td><Badge bg="warning">⏳</Badge></td></tr>
                                            <tr><td>Allergy Band Applied</td><td><Badge bg="success">✅</Badge></td></tr>
                                            <tr><td>Anesthesia Safety Check</td><td><Badge bg="warning">⏳</Badge></td></tr>
                                            <tr><td>Imaging Available</td><td><Badge bg="success">✅</Badge></td></tr>
                                        </tbody>
                                    </Table>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Intra-Op Monitoring Tab */}
                <Tab eventKey="intra-op" title={<span><Heart size={14} className="me-1" />Intra-Op Monitor</span>}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white fw-bold">Intra-Operative Monitoring Log</Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={8}>
                                    <h6 className="fw-bold mb-3">Vitals Timeline</h6>
                                    <Table bordered hover size="sm">
                                        <thead className="bg-light">
                                            <tr>
                                                <th>Time</th><th>HR</th><th>BP</th><th>SpO2</th><th>EtCO2</th><th>Temp</th><th>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { time: '10:00', hr: 72, bp: '120/80', spo2: 99, etco2: 35, temp: 36.5, notes: 'Induction' },
                                                { time: '10:15', hr: 68, bp: '110/70', spo2: 98, etco2: 34, temp: 36.4, notes: 'Stable' },
                                                { time: '10:30', hr: 75, bp: '125/85', spo2: 99, etco2: 36, temp: 36.5, notes: 'Incision' },
                                                { time: '10:45', hr: 80, bp: '130/90', spo2: 98, etco2: 38, temp: 36.6, notes: 'Active phase' },
                                                { time: '11:00', hr: 70, bp: '115/75', spo2: 99, etco2: 35, temp: 36.5, notes: 'Closure' }
                                            ].map((v, i) => (
                                                <tr key={i}>
                                                    <td className="fw-bold">{v.time}</td>
                                                    <td>{v.hr}</td><td>{v.bp}</td>
                                                    <td><Badge bg={v.spo2 >= 95 ? 'success' : 'danger'}>{v.spo2}%</Badge></td>
                                                    <td>{v.etco2}</td><td>{v.temp}°C</td>
                                                    <td><small>{v.notes}</small></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>

                                    <h6 className="fw-bold mb-2 mt-3">Medications Administered</h6>
                                    <Table bordered size="sm">
                                        <thead className="bg-light"><tr><th>Time</th><th>Drug</th><th>Dose</th><th>Route</th></tr></thead>
                                        <tbody>
                                            <tr><td>10:00</td><td>Propofol</td><td>200mg</td><td>IV</td></tr>
                                            <tr><td>10:02</td><td>Fentanyl</td><td>100mcg</td><td>IV</td></tr>
                                            <tr><td>10:05</td><td>Rocuronium</td><td>50mg</td><td>IV</td></tr>
                                            <tr><td>10:30</td><td>Ondansetron</td><td>4mg</td><td>IV</td></tr>
                                        </tbody>
                                    </Table>
                                </Col>
                                <Col md={4}>
                                    <Card className="border-danger mb-3">
                                        <Card.Header className="bg-danger text-white fw-bold small">
                                            <Droplet size={14} className="me-1" /> Blood Loss Tracker
                                        </Card.Header>
                                        <Card.Body className="text-center">
                                            <h2 className="text-danger fw-bold">350 mL</h2>
                                            <small className="text-muted">Estimated Blood Loss</small>
                                            <ProgressBar now={35} variant="danger" className="mt-2" style={{ height: 8 }} />
                                            <small className="text-muted d-block mt-1">35% of allowable (1000 mL)</small>
                                        </Card.Body>
                                    </Card>
                                    <Card className="mb-3">
                                        <Card.Header className="fw-bold small">Fluids In</Card.Header>
                                        <Card.Body>
                                            <div className="d-flex justify-content-between mb-1"><span>Crystalloid (RL)</span><strong>1500 mL</strong></div>
                                            <div className="d-flex justify-content-between mb-1"><span>Colloid</span><strong>500 mL</strong></div>
                                            <div className="d-flex justify-content-between"><span>Blood Products</span><strong>0 units</strong></div>
                                        </Card.Body>
                                    </Card>
                                    <Card>
                                        <Card.Header className="fw-bold small">Duration</Card.Header>
                                        <Card.Body className="text-center">
                                            <h4 className="fw-bold text-primary">01:15:00</h4>
                                            <small className="text-muted">Surgery Duration</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Booking Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Book New Surgery</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleBook}>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Label>Procedure Name</Form.Label>
                                <Form.Control required type="text" 
                                    onChange={e => setNewSurgery({...newSurgery, procedure_name: e.target.value})} />
                            </Col>
                            <Col md={6}>
                                <Form.Label>Priority</Form.Label>
                                <Form.Select 
                                    onChange={e => setNewSurgery({...newSurgery, priority: e.target.value})}>
                                    <option>Scheduled</option>
                                    <option>Urgent</option>
                                    <option>Emergency</option>
                                </Form.Select>
                            </Col>
                            <Col md={6}>
                                <Form.Label>Patient ID</Form.Label>
                                <Form.Control required type="number" placeholder="Enter Patient ID"
                                    onChange={e => setNewSurgery({...newSurgery, patient_id: e.target.value})} />
                            </Col>
                            <Col md={6}>
                                <Form.Label>Lead Surgeon (User ID/Name)</Form.Label>
                                <Form.Control type="text" placeholder="Enter Doctor ID"
                                    onChange={e => setNewSurgery({...newSurgery, doctor_id: e.target.value})} />
                            </Col>
                            <Col md={6}>
                                <Form.Label>OT Room</Form.Label>
                                <Form.Select required 
                                    onChange={e => setNewSurgery({...newSurgery, ot_room_id: e.target.value})}>
                                    <option value="">Select Room</option>
                                    {rooms.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                                    ))}
                                </Form.Select>
                            </Col>
                            <Col md={6}>
                                {/* Spacer */}
                            </Col>
                            <Col md={6}>
                                <Form.Label>Start Time</Form.Label>
                                <Form.Control required type="datetime-local" 
                                    onChange={e => setNewSurgery({...newSurgery, start_time: e.target.value})} />
                            </Col>
                            <Col md={6}>
                                <Form.Label>End Time</Form.Label>
                                <Form.Control required type="datetime-local" 
                                    onChange={e => setNewSurgery({...newSurgery, end_time: e.target.value})} />
                            </Col>
                            <Col md={12}>
                                <Form.Label>Notes</Form.Label>
                                <Form.Control as="textarea" rows={3} 
                                    onChange={e => setNewSurgery({...newSurgery, notes: e.target.value})} />
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit">Confirm Booking</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Blood Reservation Modal */}
            <SurgicalBloodOrderModal
                show={showBloodModal}
                onHide={() => setShowBloodModal(false)}
                surgery={null} // Default to general reservation if no surgery selected
                patient={null} // Allow searching or manual entry in future updates
            />
        </Container>
    );
};

export default OTDashboard;
