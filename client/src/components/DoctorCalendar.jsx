import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, Form, Badge } from 'react-bootstrap';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';

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

const DoctorCalendar = ({ selectedDoctor, onSlotClick }) => {
    const { isDark } = useTheme();
    const [events, setEvents] = useState([]);
    const [view, setView] = useState('week');

    // Fetch appointments
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const token = localStorage.getItem('token');
                // Fetch events for the current view range
                // For simplicity, we fetch a broad range or all. Ideally, use start/end from 'view' state.
                const res = await axios.get('/api/opd/appointments', {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { start: '2024-01-01', end: '2025-12-31' } // Fetch all for now or dynamic
                });

                const appointments = res.data.map(visit => ({
                    id: visit.id,
                    title: `${visit.token_number} - ${visit.patient_name}`,
                    start: new Date(visit.visit_date), // Use actual visit_date
                    end: new Date(new Date(visit.visit_date).setHours(new Date(visit.visit_date).getHours() + 1)), // Mock 1hr slot
                    resource: visit,
                    doctor_id: visit.doctor_id,
                    status: visit.status
                }));

                setEvents(appointments);
            } catch (err) {
                console.error("Failed to load calendar events", err);
            }
        };

        fetchAppointments();
    }, []);

    // Filter events if a doctor is selected (passed from parent)
    const filteredEvents = selectedDoctor
        ? events.filter(evt => evt.doctor_id === selectedDoctor.id) // This assumes we have doctor_id in queue data
        : events;

    const eventStyleGetter = (event) => {
        let backgroundColor = '#3b82f6';
        if (event.resource.status === 'Completed') backgroundColor = '#10b981';
        if (event.resource.status === 'Cancelled') backgroundColor = '#ef4444';

        return {
            style: {
                backgroundColor,
                borderRadius: '5px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    return (
        <Card className={`h-100 border-0 shadow-sm ${isDark ? 'bg-dark text-white' : 'bg-white'}`}>
            <Card.Body>
                <div style={{ height: '600px' }}>
                    <Calendar
                        localizer={localizer}
                        events={filteredEvents}
                        startAccessor="start"
                        endAccessor="end"
                        view={view}
                        onView={setView}
                        style={{ height: '100%', color: isDark ? '#cbd5e1' : '#1e293b' }}
                        eventPropGetter={eventStyleGetter}
                        onSelectEvent={(event) => onSlotClick && onSlotClick(event.resource)}
                    />
                </div>
            </Card.Body>
            <style>{`
                .rbc-calendar { font-family: inherit; }
                .rbc-toolbar button { color: ${isDark ? '#fff' : '#333'}; }
                .rbc-toolbar button:active, .rbc-toolbar button.rbc-active { background: ${isDark ? '#475569' : '#e2e8f0'}; }
                .rbc-off-range-bg { background: ${isDark ? '#1e293b' : '#f0f0f0'}; }
            `}</style>
        </Card>
    );
};

export default DoctorCalendar;
