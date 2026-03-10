import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Badge, Tabs, Tab, Spinner } from 'react-bootstrap';
import { Calendar, Clock, User, Plus, Check, X, Search, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { StatsCard } from '../components/ui';

const AppointmentsPage = () => {
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [summary, setSummary] = useState({ scheduled: 0, completed: 0, cancelled: 0, total: 0 });
    const [availableSlots, setAvailableSlots] = useState([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Booking form state
    const [bookingForm, setBookingForm] = useState({
        patient_id: '',
        patient_name: '',
        doctor_id: '',
        department: 'General Medicine',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '',
        reason: ''
    });

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch appointments, doctors, and summary in parallel
            const [appointmentsRes, doctorsRes, summaryRes] = await Promise.all([
                axios.get(`/api/appointments?date=${selectedDate}`, { headers }),
                axios.get('/api/appointments/doctors', { headers }),
                axios.get('/api/appointments/summary', { headers })
            ]);

            setAppointments(appointmentsRes.data.data || appointmentsRes.data);
            setDoctors(doctorsRes.data.data || doctorsRes.data);
            setSummary(summaryRes.data.data || summaryRes.data);
        } catch (err) {
            console.error('Error loading appointments:', err);
        }
        setLoading(false);
    };

    const handlePatientSearch = async (query) => {
        setPatientSearch(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/patients/search?query=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchResults(res.data.data || res.data);
        } catch (err) {
            console.error('Patient search error:', err);
        }
    };

    const handleSelectPatient = (patient) => {
        setBookingForm({
            ...bookingForm,
            patient_id: patient.id,
            patient_name: patient.name
        });
        setSearchResults([]);
        setPatientSearch('');
    };

    const handleDoctorChange = async (doctorId) => {
        setBookingForm({ ...bookingForm, doctor_id: doctorId, appointment_time: '' });

        if (!doctorId) {
            setAvailableSlots([]);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(
                `/api/appointments/slots?doctor_id=${doctorId}&date=${bookingForm.appointment_date}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setAvailableSlots((res.data.data && res.data.data.available_slots) || res.data.available_slots || []);
        } catch (err) {
            console.error('Error fetching slots:', err);
        }
    };

    const handleDateChange = async (date) => {
        setBookingForm({ ...bookingForm, appointment_date: date, appointment_time: '' });

        if (!bookingForm.doctor_id) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(
                `/api/appointments/slots?doctor_id=${bookingForm.doctor_id}&date=${date}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setAvailableSlots((res.data.data && res.data.data.available_slots) || res.data.available_slots || []);
        } catch (err) {
            console.error('Error fetching slots:', err);
        }
    };

    const handleBookAppointment = async (e) => {
        e.preventDefault();

        if (!bookingForm.patient_id || !bookingForm.doctor_id || !bookingForm.appointment_time) {
            alert('Please fill all required fields');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/appointments', bookingForm, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('✅ Appointment booked successfully!');
            setShowBookingModal(false);
            setBookingForm({
                patient_id: '',
                patient_name: '',
                doctor_id: '',
                department: 'General Medicine',
                appointment_date: new Date().toISOString().split('T')[0],
                appointment_time: '',
                reason: ''
            });
            loadData();
        } catch (err) {
            console.error('Booking error:', err);
            alert(`❌ Error: ${err.response?.data?.error || 'Failed to book appointment'}`);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/appointments/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadData();
        } catch (err) {
            console.error('Status update error:', err);
            alert('Failed to update status');
        }
    };

    const getStatusBadge = (status) => {
        const variants = {
            'Scheduled': 'primary',
            'Confirmed': 'info',
            'Completed': 'success',
            'Cancelled': 'secondary',
            'No Show': 'danger',
            'Rescheduled': 'warning'
        };
        return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
    };

    const departments = [
        'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology',
        'ENT', 'Dermatology', 'Ophthalmology', 'Neurology', 'Psychiatry'
    ];

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Loading appointments...</p>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold mb-0">📅 Appointment Management</h3>
                <Button variant="primary" onClick={() => setShowBookingModal(true)}>
                    <Plus size={18} className="me-2" />
                    Book Appointment
                </Button>
            </div>

            {/* Stats Row */}
            <Row className="mb-4 g-3">
                <Col md={3}>
                    <StatsCard
                        title="Scheduled Today"
                        value={summary.scheduled || 0}
                        icon={<Clock />}
                        variant="primary"
                    />
                </Col>
                <Col md={3}>
                    <StatsCard
                        title="Completed"
                        value={summary.completed || 0}
                        icon={<Check />}
                        variant="success"
                    />
                </Col>
                <Col md={3}>
                    <StatsCard
                        title="Cancelled"
                        value={summary.cancelled || 0}
                        icon={<X />}
                        variant="secondary"
                    />
                </Col>
                <Col md={3}>
                    <StatsCard
                        title="Total Appointments"
                        value={summary.total || 0}
                        icon={<Calendar />}
                        variant="info"
                    />
                </Col>
            </Row>

            {/* Date Filter */}
            <Card className="shadow-sm border-0 mb-4">
                <Card.Body className="d-flex align-items-center gap-3">
                    <Calendar size={20} />
                    <span className="fw-bold">View Date:</span>
                    <Form.Control
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{ width: '200px' }}
                    />
                    <Button variant="outline-primary" size="sm" onClick={loadData}>
                        <RefreshCw size={16} className="me-1" /> Refresh
                    </Button>
                </Card.Body>
            </Card>

            {/* Appointments Table */}
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white fw-bold">
                    Appointments for {new Date(selectedDate).toLocaleDateString('en-IN', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                </Card.Header>
                <Table hover responsive className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr>
                            <th>Time</th>
                            <th>Patient</th>
                            <th>Doctor</th>
                            <th>Department</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appointments.map(apt => (
                            <tr key={apt.id}>
                                <td><strong>{apt.appointment_time?.slice(0, 5)}</strong></td>
                                <td>
                                    <div>{apt.patient_name}</div>
                                    <small className="text-muted">{apt.patient_phone}</small>
                                </td>
                                <td>Dr. {apt.doctor_name}</td>
                                <td>{apt.department}</td>
                                <td className="small">{apt.reason || '-'}</td>
                                <td>{getStatusBadge(apt.status)}</td>
                                <td>
                                    {apt.status === 'Scheduled' && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="success"
                                                className="me-1"
                                                onClick={() => handleStatusUpdate(apt.id, 'Completed')}
                                            >
                                                <Check size={14} />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline-danger"
                                                onClick={() => handleStatusUpdate(apt.id, 'Cancelled')}
                                            >
                                                <X size={14} />
                                            </Button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {appointments.length === 0 && (
                            <tr>
                                <td colSpan="7" className="text-center p-5 text-muted">
                                    <Calendar size={48} className="mb-3 opacity-25" />
                                    <div>No appointments scheduled for this date</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* Booking Modal */}
            <Modal show={showBookingModal} onHide={() => setShowBookingModal(false)} size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>
                        <Calendar size={20} className="me-2" />
                        Book New Appointment
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleBookAppointment}>
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Patient *</Form.Label>
                                    {bookingForm.patient_id ? (
                                        <div className="d-flex align-items-center">
                                            <Badge bg="success" className="px-3 py-2 me-2">
                                                <User size={14} className="me-1" />
                                                {bookingForm.patient_name}
                                            </Badge>
                                            <Button
                                                size="sm"
                                                variant="outline-secondary"
                                                onClick={() => setBookingForm({ ...bookingForm, patient_id: '', patient_name: '' })}
                                            >
                                                Change
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="position-relative">
                                            <Form.Control
                                                type="text"
                                                placeholder="Search patient by name or phone..."
                                                value={patientSearch}
                                                onChange={(e) => handlePatientSearch(e.target.value)}
                                            />
                                            {searchResults.length > 0 && (
                                                <div className="position-absolute w-100 bg-white border rounded shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflow: 'auto' }}>
                                                    {searchResults.map(p => (
                                                        <div
                                                            key={p.id}
                                                            className="p-2 border-bottom hover-bg-light cursor-pointer"
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => handleSelectPatient(p)}
                                                        >
                                                            <div className="fw-bold">{p.name}</div>
                                                            <small className="text-muted">{p.phone}</small>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Doctor *</Form.Label>
                                    <Form.Select
                                        value={bookingForm.doctor_id}
                                        onChange={(e) => handleDoctorChange(e.target.value)}
                                        required
                                    >
                                        <option value="">Select Doctor</option>
                                        {doctors.map(d => (
                                            <option key={d.id} value={d.id}>
                                                Dr. {d.name} ({d.department || 'General'})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="mb-3">
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Department</Form.Label>
                                    <Form.Select
                                        value={bookingForm.department}
                                        onChange={(e) => setBookingForm({ ...bookingForm, department: e.target.value })}
                                    >
                                        {departments.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Date *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={bookingForm.appointment_date}
                                        onChange={(e) => handleDateChange(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold">Time Slot *</Form.Label>
                                    <Form.Select
                                        value={bookingForm.appointment_time}
                                        onChange={(e) => setBookingForm({ ...bookingForm, appointment_time: e.target.value })}
                                        required
                                        disabled={!bookingForm.doctor_id}
                                    >
                                        <option value="">Select Time</option>
                                        {availableSlots.map(slot => (
                                            <option key={slot} value={slot}>{slot}</option>
                                        ))}
                                    </Form.Select>
                                    {bookingForm.doctor_id && availableSlots.length === 0 && (
                                        <Form.Text className="text-danger">No slots available</Form.Text>
                                    )}
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Reason for Visit</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="e.g., Follow-up, Routine checkup, Consultation..."
                                value={bookingForm.reason}
                                onChange={(e) => setBookingForm({ ...bookingForm, reason: e.target.value })}
                            />
                        </Form.Group>

                        <div className="d-grid gap-2">
                            <Button type="submit" variant="primary" size="lg">
                                <Check size={18} className="me-2" />
                                Confirm Booking
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default AppointmentsPage;
