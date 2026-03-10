import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

const QueueDisplay = () => {
    const { isDark } = useTheme();
    const [queue, setQueue] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const fetchQueue = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await axios.get('/api/opd/queue', { headers: { Authorization: `Bearer ${token}` } });
                const list = res.data.data || res.data;
                setQueue(Array.isArray(list) ? list : []);
            } catch (err) { console.error(err); }
        };

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        const dataTimer = setInterval(fetchQueue, 15000); // Poll every 15s
        fetchQueue();
        return () => { clearInterval(timer); clearInterval(dataTimer); };
    }, []);

    const validQueue = Array.isArray(queue) ? queue : [];
    const currentPatient = validQueue.length > 0 ? validQueue[0] : null;
    const nextPatients = validQueue.slice(1, 6); // Next 5

    return (
        <Container fluid className={`vh-100 d-flex flex-column p-4 ${isDark ? 'bg-dark text-white' : 'bg-light text-dark'}`}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-5">
                <h1 className="display-4 fw-bold">OPD Queue Status</h1>
                <h2 className="fw-light">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h2>
            </div>

            <Row className="flex-grow-1 g-5">
                {/* NOW SERVING (Left Side - Big) */}
                <Col lg={7} className="d-flex flex-column h-100">
                    <Card className={`text-center h-100 border-0 shadow-lg ${isDark ? 'bg-secondary text-white' : 'bg-white'}`} style={{ borderRadius: '30px' }}>
                        <Card.Body className="d-flex flex-column justify-content-center align-items-center p-5">
                            <h2 className="display-6 text-uppercase letter-spacing-2 mb-4">Now Serving</h2>
                            {currentPatient ? (
                                <>
                                    <div className="display-1 fw-bold text-success mb-2" style={{ fontSize: '8rem' }}>
                                        {currentPatient.token_number}
                                    </div>
                                    <h3 className="display-5">{currentPatient.patient_name}</h3>
                                    <h4 className="text-muted mt-3">{currentPatient.department || 'General'}</h4>
                                </>
                            ) : (
                                <h3 className="text-muted">No appointments</h3>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* UP NEXT (Right Side - List) */}
                <Col lg={5} className="d-flex flex-column h-100">
                    <Card className={`h-100 border-0 shadow-sm ${isDark ? 'bg-transparent' : 'bg-transparent'}`}>
                        <Card.Body className="p-0">
                            <h3 className="mb-4 ps-3 border-start border-4 border-info">Up Next</h3>
                            <div className="d-grid gap-3">
                                {nextPatients.map((p, idx) => (
                                    <Card key={p.id} className={`border-0 shadow-sm p-4 ${isDark ? 'bg-secondary text-white' : 'bg-white'}`} style={{ borderRadius: '20px' }}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <div className="lead fw-bold text-info">Token {p.token_number}</div>
                                                <div className="h5 mb-0">{p.patient_name}</div>
                                            </div>
                                            <div className="text-end text-muted small">
                                                Est. Wait: {(idx + 1) * 15} min
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                {nextPatients.length === 0 && <p className="text-muted ms-3">No pending patients.</p>}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default QueueDisplay;
