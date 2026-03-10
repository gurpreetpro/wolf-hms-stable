import React, { useState } from 'react';
import { Card, Row, Col, Badge, Button, Table, Modal, Form, Alert } from 'react-bootstrap';
import { Calendar, MapPin, Clock, Users, Plus, Edit2, Trash2 } from 'lucide-react';

/**
 * DoctorScheduleManager - Phase 7 Enterprise Feature
 * Multi-location scheduling and availability management
 */

// Mock locations (multi-clinic support)
const LOCATIONS = [
    { id: 1, name: 'Main Hospital - OPD Block A', address: 'Sector 12, Chandigarh' },
    { id: 2, name: 'City Clinic', address: 'SCO 45, Sector 17, Chandigarh' },
    { id: 3, name: 'Satellite Center', address: 'Phase 3B2, Mohali' },
    { id: 4, name: 'Telemedicine (Virtual)', address: 'Online Consultations' }
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIME_SLOTS = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM'
];

const DoctorScheduleManager = ({ doctorName = 'Dr. Demo' }) => {
    const [schedules, setSchedules] = useState([
        { id: 1, day: 'Monday', locationId: 1, startTime: '09:00 AM', endTime: '01:00 PM', slots: 12 },
        { id: 2, day: 'Monday', locationId: 4, startTime: '05:00 PM', endTime: '07:00 PM', slots: 8 },
        { id: 3, day: 'Wednesday', locationId: 2, startTime: '10:00 AM', endTime: '02:00 PM', slots: 10 },
        { id: 4, day: 'Friday', locationId: 1, startTime: '09:00 AM', endTime: '01:00 PM', slots: 12 },
        { id: 5, day: 'Saturday', locationId: 3, startTime: '09:00 AM', endTime: '12:00 PM', slots: 8 }
    ]);
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [formData, setFormData] = useState({
        day: 'Monday',
        locationId: 1,
        startTime: '09:00 AM',
        endTime: '01:00 PM',
        slots: 10
    });

    const getLocationById = (id) => LOCATIONS.find(l => l.id === id);

    const handleAddSchedule = () => {
        setEditingSchedule(null);
        setFormData({
            day: 'Monday',
            locationId: 1,
            startTime: '09:00 AM',
            endTime: '01:00 PM',
            slots: 10
        });
        setShowModal(true);
    };

    const handleEditSchedule = (schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            day: schedule.day,
            locationId: schedule.locationId,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            slots: schedule.slots
        });
        setShowModal(true);
    };

    const handleDeleteSchedule = (id) => {
        if (window.confirm('Delete this schedule slot?')) {
            setSchedules(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleSaveSchedule = () => {
        if (editingSchedule) {
            setSchedules(prev => prev.map(s =>
                s.id === editingSchedule.id ? { ...s, ...formData } : s
            ));
        } else {
            setSchedules(prev => [...prev, { id: Date.now(), ...formData }]);
        }
        setShowModal(false);
    };

    // Group schedules by day
    const schedulesByDay = DAYS.reduce((acc, day) => {
        acc[day] = schedules.filter(s => s.day === day);
        return acc;
    }, {});

    // Calculate total slots per location
    const slotsByLocation = LOCATIONS.map(loc => ({
        ...loc,
        totalSlots: schedules.filter(s => s.locationId === loc.id).reduce((sum, s) => sum + s.slots, 0)
    }));

    return (
        <>
            <Card className="shadow-sm mb-3">
                <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-2">
                    <div className="d-flex align-items-center gap-2">
                        <Calendar size={20} />
                        <strong>Weekly Schedule</strong>
                        <Badge bg="light" text="dark">{doctorName}</Badge>
                    </div>
                    <Button variant="light" size="sm" onClick={handleAddSchedule}>
                        <Plus size={14} className="me-1" />
                        Add Slot
                    </Button>
                </Card.Header>
                <Card.Body className="p-2">
                    {/* Location Summary */}
                    <Row className="mb-3 g-2">
                        {slotsByLocation.map(loc => (
                            <Col key={loc.id} md={3}>
                                <div className="p-2 bg-light rounded text-center">
                                    <MapPin size={14} className="text-primary" />
                                    <div className="small fw-bold text-truncate" title={loc.name}>
                                        {loc.name.split(' - ')[0]}
                                    </div>
                                    <Badge bg={loc.totalSlots > 0 ? 'success' : 'secondary'}>
                                        {loc.totalSlots} slots/week
                                    </Badge>
                                </div>
                            </Col>
                        ))}
                    </Row>

                    {/* Weekly View */}
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <Table size="sm" className="small mb-0">
                            <thead className="sticky-top bg-white">
                                <tr>
                                    <th style={{ width: 100 }}>Day</th>
                                    <th>Schedule</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DAYS.map(day => (
                                    <tr key={day}>
                                        <td className="fw-bold">{day.substring(0, 3)}</td>
                                        <td>
                                            {schedulesByDay[day].length === 0 ? (
                                                <span className="text-muted">No schedule</span>
                                            ) : (
                                                <div className="d-flex flex-wrap gap-1">
                                                    {schedulesByDay[day].map(slot => {
                                                        const loc = getLocationById(slot.locationId);
                                                        return (
                                                            <Badge
                                                                key={slot.id}
                                                                bg={slot.locationId === 4 ? 'info' : 'primary'}
                                                                className="d-flex align-items-center gap-1"
                                                                style={{ cursor: 'pointer' }}
                                                                onClick={() => handleEditSchedule(slot)}
                                                            >
                                                                <MapPin size={10} />
                                                                {loc?.name.split(' ')[0]}
                                                                <Clock size={10} className="ms-1" />
                                                                {slot.startTime}-{slot.endTime}
                                                                <Users size={10} className="ms-1" />
                                                                {slot.slots}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Add/Edit Schedule Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>
                        {editingSchedule ? 'Edit Schedule' : 'Add Schedule Slot'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Day</Form.Label>
                                <Form.Select
                                    value={formData.day}
                                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                                >
                                    {DAYS.map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Location</Form.Label>
                                <Form.Select
                                    value={formData.locationId}
                                    onChange={(e) => setFormData({ ...formData, locationId: parseInt(e.target.value) })}
                                >
                                    {LOCATIONS.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Start Time</Form.Label>
                                <Form.Select
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                >
                                    {TIME_SLOTS.map(time => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">End Time</Form.Label>
                                <Form.Select
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                >
                                    {TIME_SLOTS.map(time => (
                                        <option key={time} value={time}>{time}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Max Slots</Form.Label>
                                <Form.Control
                                    type="number"
                                    min={1}
                                    max={30}
                                    value={formData.slots}
                                    onChange={(e) => setFormData({ ...formData, slots: parseInt(e.target.value) })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    {formData.locationId === 4 && (
                        <Alert variant="info" className="small py-1">
                            <strong>Telemedicine Slot:</strong> Patients will connect via video consultation.
                        </Alert>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {editingSchedule && (
                        <Button
                            variant="outline-danger"
                            onClick={() => { handleDeleteSchedule(editingSchedule.id); setShowModal(false); }}
                            className="me-auto"
                        >
                            <Trash2 size={14} className="me-1" />
                            Delete
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveSchedule}>
                        {editingSchedule ? 'Update' : 'Add'} Schedule
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default DoctorScheduleManager;
