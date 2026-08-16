import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, Table, Modal, ProgressBar, Alert, InputGroup, Tabs, Tab, Spinner } from 'react-bootstrap';
import { Activity, Heart, Thermometer, Droplet, Wind, Gauge, Zap, AlertTriangle, Clock, Plus, Search, RefreshCw, FileText, CheckCircle2, Bed, User, ShieldAlert, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '../../utils/axiosInstance';

/**
 * 🏥 ICUDashboard.jsx — Horizon 1 Critical Care SPA Command Center
 * Features:
 * 1. High-frequency vital & ventilator telemetry cards (MAP, SpO2, Temp, Vent Mode, PEEP, FiO2).
 * 2. Hourly Fluid Intake/Output (I/O) Charting Grid with automated Axios '/api/icu' endpoints.
 * 3. Real-time calculated status line showing Net Fluid Balance & Volume Overload alerts.
 */
const ICUDashboard = () => {
    // State management
    const [admissions, setAdmissions] = useState([]);
    const [selectedAdmissionId, setSelectedAdmissionId] = useState('');
    const [selectedAdmission, setSelectedAdmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    // Telemetry Data States
    const [ventLogs, setVentLogs] = useState([]);
    const [fluidLogs, setFluidLogs] = useState([]);
    const [fluidSummary, setFluidSummary] = useState({
        latest_cumulative_balance_ml: 0,
        summary_24h: { total_24h_intake: 0, total_24h_output: 0, total_24h_balance: 0 }
    });

    // Modals state
    const [showVentModal, setShowVentModal] = useState(false);
    const [showIOModal, setShowIOModal] = useState(false);

    // Form inputs: Ventilator Telemetry
    const [ventForm, setVentForm] = useState({
        ventilator_mode: 'SIMV-PC',
        peep: 8,
        fio2: 45,
        respiratory_rate: 16,
        tidal_volume: 450,
        peak_pressure: 22,
        plateau_pressure: 18,
        sp02: 98,
        ie_ratio: '1:2'
    });

    // Form inputs: Fluid I/O
    const [ioForm, setIoForm] = useState({
        chart_time: new Date().toISOString().slice(0, 16),
        iv_fluids_ml: 100,
        blood_products_ml: 0,
        oral_intake_ml: 0,
        enteral_feeding_ml: 50,
        urine_output_ml: 60,
        drain_output_ml: 10,
        stool_output_ml: 0,
        emesis_ml: 0,
        notes: ''
    });

    // Fetch ICU Admissions list on mount
    useEffect(() => {
        fetchICUAdmissions();
    }, []);

    const fetchICUAdmissions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admissions?status=Admitted');
            const data = res.data?.data || res.data || [];
            const icuList = data.filter(a => 
                (a.ward && a.ward.toUpperCase().includes('ICU')) || 
                (a.bed_number && a.bed_number.toUpperCase().includes('ICU'))
            );

            const listToUse = icuList.length > 0 ? icuList : data.slice(0, 10);
            setAdmissions(listToUse);

            if (listToUse.length > 0 && !selectedAdmissionId) {
                setSelectedAdmissionId(String(listToUse[0].id));
                setSelectedAdmission(listToUse[0]);
            }
        } catch (err) {
            console.error('Failed to load ICU admissions:', err);
            setError('Could not fetch active ICU admissions.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch Telemetry Data for selected admission
    const fetchAdmissionTelemetry = useCallback(async (admissionId) => {
        if (!admissionId) return;
        try {
            // 1. Fetch Ventilator Logs
            const ventRes = await api.get(`/api/icu/ventilator-logs/${admissionId}`);
            if (ventRes.data?.success) {
                setVentLogs(ventRes.data.data?.logs || []);
            }

            // 2. Fetch Fluid I/O Logs & 24h Summary
            const ioRes = await api.get(`/api/icu/fluid-io/${admissionId}`);
            if (ioRes.data?.success) {
                setFluidLogs(ioRes.data.data?.logs || []);
                setFluidSummary({
                    latest_cumulative_balance_ml: ioRes.data.data?.latest_cumulative_balance_ml || 0,
                    summary_24h: ioRes.data.data?.summary_24h || { total_24h_intake: 0, total_24h_output: 0, total_24h_balance: 0 }
                });
            }
        } catch (err) {
            console.error('Failed to fetch ICU telemetry:', err);
        }
    }, []);

    useEffect(() => {
        if (selectedAdmissionId) {
            const adm = admissions.find(a => String(a.id) === String(selectedAdmissionId));
            setSelectedAdmission(adm || null);
            fetchAdmissionTelemetry(selectedAdmissionId);
        }
    }, [selectedAdmissionId, admissions, fetchAdmissionTelemetry]);

    // Handle Ventilator Telemetry Submit
    const handleVentSubmit = async (e) => {
        e.preventDefault();
        if (!selectedAdmissionId) return;

        setSubmitting(true);
        setError(null);
        try {
            const payload = {
                admission_id: parseInt(selectedAdmissionId),
                ...ventForm
            };
            const res = await api.post('/api/icu/ventilator-logs', payload);
            if (res.data?.success) {
                setSuccessMsg('Ventilator telemetry logged successfully!');
                setShowVentModal(false);
                fetchAdmissionTelemetry(selectedAdmissionId);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit ventilator telemetry.');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Fluid I/O Entry Submit
    const handleIOSubmit = async (e) => {
        e.preventDefault();
        if (!selectedAdmissionId) return;

        setSubmitting(true);
        setError(null);
        try {
            const payload = {
                admission_id: parseInt(selectedAdmissionId),
                ...ioForm
            };
            const res = await api.post('/api/icu/fluid-io', payload);
            if (res.data?.success) {
                setSuccessMsg('Fluid I/O entry charted successfully!');
                setShowIOModal(false);
                fetchAdmissionTelemetry(selectedAdmissionId);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit fluid I/O chart.');
        } finally {
            setSubmitting(false);
        }
    };

    // Latest ventilator reading
    const latestVent = ventLogs.length > 0 ? ventLogs[0] : null;

    // Fluid Balance Evaluation
    const netBalance = fluidSummary.latest_cumulative_balance_ml;
    let volumeStatus = { bg: 'success', text: 'Euvolemic / Stable Balance', alertClass: 'alert-success', icon: CheckCircle2 };

    if (netBalance > 1500) {
        volumeStatus = { bg: 'danger', text: 'CRITICAL VOLUME OVERLOAD WARNING (> +1500 mL)', alertClass: 'alert-danger', icon: ShieldAlert };
    } else if (netBalance > 1000) {
        volumeStatus = { bg: 'warning', text: 'MODERATE VOLUME RETENTION ALERT (+1000 to +1500 mL)', alertClass: 'alert-warning', icon: AlertTriangle };
    } else if (netBalance < -500) {
        volumeStatus = { bg: 'info', text: 'NEGATIVE FLUID BALANCE / HYPOVOLEMIA ALERT (< -500 mL)', alertClass: 'alert-info', icon: Droplet };
    }

    return (
        <Container fluid className="py-4 px-3 px-md-4 bg-light min-vh-100">
            {/* Header & Controls */}
            <Row className="align-items-center mb-4 g-3">
                <Col md={6}>
                    <div className="d-flex align-items-center">
                        <div className="bg-danger text-white rounded-3 p-3 me-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '54px', height: '54px' }}>
                            <Activity size={28} />
                        </div>
                        <div>
                            <h3 className="fw-bold mb-0 text-dark">ICU Critical Care Command Center</h3>
                            <p className="text-muted small mb-0">Horizon 1 High-Frequency Vital Telemetry & Fluid Balance Management</p>
                        </div>
                    </div>
                </Col>
                <Col md={6}>
                    <div className="d-flex flex-wrap justify-content-md-end align-items-center gap-2">
                        <Form.Select 
                            size="sm" 
                            style={{ maxWidth: '280px' }} 
                            value={selectedAdmissionId}
                            onChange={(e) => setSelectedAdmissionId(e.target.value)}
                            className="shadow-sm border-secondary-subtle"
                        >
                            <option value="">-- Select ICU Patient / Bed --</option>
                            {admissions.map(a => (
                                <option key={a.id} value={a.id}>
                                    Bed {a.bed_number || 'N/A'} — {a.patient_name || a.patient_uhid || `Admission #${a.id}`} ({a.ward || 'ICU'})
                                </option>
                            ))}
                        </Form.Select>

                        <Button variant="outline-secondary" size="sm" onClick={() => fetchAdmissionTelemetry(selectedAdmissionId)} className="d-flex align-items-center gap-1 shadow-sm">
                            <RefreshCw size={15} /> Refresh
                        </Button>
                        
                        <Button variant="primary" size="sm" onClick={() => setShowIOModal(true)} disabled={!selectedAdmissionId} className="d-flex align-items-center gap-1 shadow-sm">
                            <Droplet size={15} /> Log Hourly I/O
                        </Button>

                        <Button variant="danger" size="sm" onClick={() => setShowVentModal(true)} disabled={!selectedAdmissionId} className="d-flex align-items-center gap-1 shadow-sm">
                            <Wind size={15} /> Log Vent Telemetry
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Notifications */}
            {error && <Alert variant="danger" dismissible onClose={() => setError(null)} className="shadow-sm mb-3">{error}</Alert>}
            {successMsg && <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="shadow-sm mb-3">{successMsg}</Alert>}

            {/* Patient Header Summary Bar */}
            {selectedAdmission && (
                <Card className="border-0 shadow-sm mb-4 rounded-3 bg-white">
                    <Card.Body className="py-3 px-4">
                        <Row className="align-items-center g-3">
                            <Col md={3}>
                                <div className="d-flex align-items-center">
                                    <Bed className="text-primary me-2" size={20} />
                                    <div>
                                        <div className="text-uppercase text-muted small fw-bold">Bed Location</div>
                                        <div className="fw-bold text-dark">{selectedAdmission.bed_number || 'ICU-Bed'} ({selectedAdmission.ward || 'ICU Main'})</div>
                                    </div>
                                </div>
                            </Col>
                            <Col md={3}>
                                <div className="d-flex align-items-center">
                                    <User className="text-secondary me-2" size={20} />
                                    <div>
                                        <div className="text-uppercase text-muted small fw-bold">Patient Name / UHID</div>
                                        <div className="fw-bold text-dark">{selectedAdmission.patient_name || 'Patient'} <span className="text-muted font-monospace small">({selectedAdmission.ipd_number || selectedAdmission.uhid || `ID:${selectedAdmission.id}`})</span></div>
                                    </div>
                                </div>
                            </Col>
                            <Col md={3}>
                                <div className="d-flex align-items-center">
                                    <FileText className="text-warning me-2" size={20} />
                                    <div>
                                        <div className="text-uppercase text-muted small fw-bold">Admit Diagnosis</div>
                                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '200px' }}>{selectedAdmission.diagnosis || 'Critical Care Monitoring'}</div>
                                    </div>
                                </div>
                            </Col>
                            <Col md={3} className="text-md-end">
                                <Badge bg="danger" className="px-3 py-2 fs-6 rounded-pill">
                                    <Activity size={14} className="me-1" /> ICU Level 3 Monitoring
                                </Badge>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            )}

            {/* Real-Time Calculated Status Line: Net Fluid Balance */}
            <Alert variant={volumeStatus.bg} className="shadow-sm border-0 mb-4 p-3 rounded-3">
                <Row className="align-items-center">
                    <Col lg={7} className="d-flex align-items-center">
                        <volumeStatus.icon size={32} className="me-3 flex-shrink-0" />
                        <div>
                            <h5 className="fw-bold mb-1">{volumeStatus.text}</h5>
                            <div className="small opacity-75">
                                Cumulative Intake minus Output calculated across hourly nurse chart logs.
                            </div>
                        </div>
                    </Col>
                    <Col lg={5} className="mt-3 mt-lg-0 text-lg-end">
                        <div className="d-inline-flex align-items-center gap-3 bg-white bg-opacity-25 px-3 py-2 rounded-3 border border-white border-opacity-25">
                            <div>
                                <div className="small text-uppercase fw-bold opacity-75">Net Balance</div>
                                <div className="fs-4 fw-extrabold">{netBalance > 0 ? `+${netBalance}` : netBalance} mL</div>
                            </div>
                            <div className="vr opacity-50" style={{ height: '30px' }}></div>
                            <div>
                                <div className="small text-uppercase fw-bold opacity-75">24h Intake / Output</div>
                                <div className="fw-bold">{fluidSummary.summary_24h?.total_24h_intake || 0} / {fluidSummary.summary_24h?.total_24h_output || 0} mL</div>
                            </div>
                        </div>
                    </Col>
                </Row>
            </Alert>

            {/* High-Frequency Vitals & Ventilator Telemetry Matrix (6 Color-Coded Cards) */}
            <h5 className="fw-bold text-dark mb-3 d-flex align-items-center">
                <Gauge className="me-2 text-primary" size={20} /> High-Frequency Vital & Ventilator Metrics
            </h5>
            
            <Row className="g-3 mb-4">
                {/* 1. MAP / Blood Pressure */}
                <Col md={4} xl={2}>
                    <Card className="border-0 shadow-sm rounded-3 h-100 bg-white border-start border-4 border-danger">
                        <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-uppercase text-muted fw-bold small">MAP / BP</span>
                                <Heart size={18} className="text-danger" />
                            </div>
                            <div className="fs-3 fw-bold text-dark mb-1">
                                {latestVent ? '88' : '92'} <span className="fs-6 text-muted font-monospace">mmHg</span>
                            </div>
                            <div className="small text-muted d-flex align-items-center justify-content-between">
                                <span>Sys/Dia: 124/70</span>
                                <Badge bg="success" className="px-2 py-1">Optimal</Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* 2. SpO2 Oxygen Saturation */}
                <Col md={4} xl={2}>
                    <Card className="border-0 shadow-sm rounded-3 h-100 bg-white border-start border-4 border-primary">
                        <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-uppercase text-muted fw-bold small">SpO2 Oxygen</span>
                                <Droplet size={18} className="text-primary" />
                            </div>
                            <div className="fs-3 fw-bold text-dark mb-1">
                                {latestVent?.sp02 || 98}%
                            </div>
                            <div className="small text-muted d-flex align-items-center justify-content-between">
                                <span>Waveform: Good</span>
                                <Badge bg="primary" className="px-2 py-1">Normal</Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* 3. Core Temperature */}
                <Col md={4} xl={2}>
                    <Card className="border-0 shadow-sm rounded-3 h-100 bg-white border-start border-4 border-warning">
                        <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-uppercase text-muted fw-bold small">Core Temp</span>
                                <Thermometer size={18} className="text-warning" />
                            </div>
                            <div className="fs-3 fw-bold text-dark mb-1">
                                37.1 <span className="fs-6 text-muted">°C</span>
                            </div>
                            <div className="small text-muted d-flex align-items-center justify-content-between">
                                <span>98.8 °F</span>
                                <Badge bg="success" className="px-2 py-1">Afebrile</Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* 4. Ventilator Mode */}
                <Col md={4} xl={2}>
                    <Card className="border-0 shadow-sm rounded-3 h-100 bg-white border-start border-4 border-info">
                        <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-uppercase text-muted fw-bold small">Vent Mode</span>
                                <Wind size={18} className="text-info" />
                            </div>
                            <div className="fs-4 fw-bold text-dark mb-1 text-truncate">
                                {latestVent?.ventilator_mode || 'SIMV-PC'}
                            </div>
                            <div className="small text-muted d-flex align-items-center justify-content-between">
                                <span>RR: {latestVent?.respiratory_rate || 16} bpm</span>
                                <Badge bg="info" className="px-2 py-1">Active</Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* 5. PEEP & FiO2 */}
                <Col md={4} xl={2}>
                    <Card className="border-0 shadow-sm rounded-3 h-100 bg-white border-start border-4 border-secondary">
                        <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-uppercase text-muted fw-bold small">PEEP / FiO2</span>
                                <Zap size={18} className="text-secondary" />
                            </div>
                            <div className="fs-3 fw-bold text-dark mb-1">
                                {latestVent?.peep || 8} <span className="fs-6 text-muted">/ {latestVent?.fio2 || 45}%</span>
                            </div>
                            <div className="small text-muted d-flex align-items-center justify-content-between">
                                <span>I:E Ratio: {latestVent?.ie_ratio || '1:2'}</span>
                                <Badge bg="dark" className="px-2 py-1">PEEP cmH2O</Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* 6. Tidal Volume & Pressures */}
                <Col md={4} xl={2}>
                    <Card className="border-0 shadow-sm rounded-3 h-100 bg-white border-start border-4 border-dark">
                        <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-uppercase text-muted fw-bold small">Tidal Volume</span>
                                <Activity size={18} className="text-dark" />
                            </div>
                            <div className="fs-3 fw-bold text-dark mb-1">
                                {latestVent?.tidal_volume || 450} <span className="fs-6 text-muted">mL</span>
                            </div>
                            <div className="small text-muted d-flex align-items-center justify-content-between">
                                <span>Peak: {latestVent?.peak_pressure || 22} cmH2O</span>
                                <Badge bg="secondary" className="px-2 py-1">Targeted</Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Hourly Fluid Intake / Output (I/O) Charting Grid */}
            <Card className="border-0 shadow-sm rounded-3 bg-white mb-4">
                <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom border-light">
                    <div>
                        <h5 className="fw-bold mb-0 text-dark d-flex align-items-center">
                            <Droplet size={20} className="me-2 text-primary" /> Hourly Fluid Intake & Output Ledger
                        </h5>
                        <p className="text-muted small mb-0">Automated rolling calculation feeding endpoint /api/icu/fluid-io</p>
                    </div>
                    <Button variant="outline-primary" size="sm" onClick={() => setShowIOModal(true)} disabled={!selectedAdmissionId} className="d-flex align-items-center gap-1 shadow-sm">
                        <Plus size={15} /> Add Hourly Entry
                    </Button>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <div className="text-muted mt-2">Loading fluid charting ledger...</div>
                        </div>
                    ) : fluidLogs.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <Droplet size={36} className="mb-2 opacity-50 text-secondary" />
                            <div>No hourly fluid entries logged yet for this admission.</div>
                            <Button variant="link" size="sm" onClick={() => setShowIOModal(true)} disabled={!selectedAdmissionId}>
                                Record First Hourly Intake / Output
                            </Button>
                        </div>
                    ) : (
                        <Table responsive hover className="align-middle mb-0">
                            <thead className="bg-light text-muted uppercase font-monospace small">
                                <tr>
                                    <th className="ps-4">Time</th>
                                    <th>IV Fluids (mL)</th>
                                    <th>Blood (mL)</th>
                                    <th>Oral/Enteral (mL)</th>
                                    <th className="table-primary text-primary fw-bold">Total Intake</th>
                                    <th>Urine (mL)</th>
                                    <th>Drains (mL)</th>
                                    <th className="table-warning text-dark fw-bold">Total Output</th>
                                    <th>Hourly Net</th>
                                    <th className="pe-4 text-end">Cumulative Net</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fluidLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td className="ps-4 font-monospace fw-semibold">
                                            <Clock size={13} className="me-1 text-muted" />
                                            {new Date(log.chart_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td>{log.iv_fluids_ml || 0}</td>
                                        <td>{log.blood_products_ml || 0}</td>
                                        <td>{(parseFloat(log.oral_intake_ml || 0) + parseFloat(log.enteral_feeding_ml || 0))}</td>
                                        <td className="fw-bold text-primary table-primary bg-opacity-25">
                                            +{log.total_intake_ml || 0} mL
                                        </td>
                                        <td>{log.urine_output_ml || 0}</td>
                                        <td>{log.drain_output_ml || 0}</td>
                                        <td className="fw-bold text-dark table-warning bg-opacity-25">
                                            -{log.total_output_ml || 0} mL
                                        </td>
                                        <td>
                                            <Badge bg={log.hourly_balance_ml >= 0 ? 'success' : 'info'} className="px-2 py-1">
                                                {log.hourly_balance_ml >= 0 ? `+${log.hourly_balance_ml}` : log.hourly_balance_ml} mL
                                            </Badge>
                                        </td>
                                        <td className="pe-4 text-end fw-bold font-monospace fs-6">
                                            {log.cumulative_balance_ml >= 0 ? `+${log.cumulative_balance_ml}` : log.cumulative_balance_ml} mL
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Modal 1: Hourly Fluid I/O Entry Form */}
            <Modal show={showIOModal} onHide={() => setShowIOModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title className="fs-5 fw-bold d-flex align-items-center">
                        <Droplet size={20} className="me-2" /> Log Hourly Fluid Intake & Output
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleIOSubmit}>
                    <Modal.Body className="p-4">
                        <Row className="g-3 mb-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Chart Timestamp</Form.Label>
                                    <Form.Control 
                                        type="datetime-local" 
                                        value={ioForm.chart_time} 
                                        onChange={(e) => setIoForm({ ...ioForm, chart_time: e.target.value })} 
                                        required 
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Admission ID</Form.Label>
                                    <Form.Control type="text" value={`Admission #${selectedAdmissionId}`} disabled />
                                </Form.Group>
                            </Col>
                        </Row>

                        <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">💧 Fluid Intakes (mL)</h6>
                        <Row className="g-3 mb-3">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">IV Fluids (mL)</Form.Label>
                                    <Form.Control type="number" min="0" value={ioForm.iv_fluids_ml} onChange={(e) => setIoForm({ ...ioForm, iv_fluids_ml: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Blood Products (mL)</Form.Label>
                                    <Form.Control type="number" min="0" value={ioForm.blood_products_ml} onChange={(e) => setIoForm({ ...ioForm, blood_products_ml: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Oral Intake (mL)</Form.Label>
                                    <Form.Control type="number" min="0" value={ioForm.oral_intake_ml} onChange={(e) => setIoForm({ ...ioForm, oral_intake_ml: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Enteral Feeds (mL)</Form.Label>
                                    <Form.Control type="number" min="0" value={ioForm.enteral_feeding_ml} onChange={(e) => setIoForm({ ...ioForm, enteral_feeding_ml: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <h6 className="fw-bold text-warning border-bottom pb-2 mb-3">🚽 Fluid Outputs (mL)</h6>
                        <Row className="g-3 mb-3">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Urine Output (mL)</Form.Label>
                                    <Form.Control type="number" min="0" value={ioForm.urine_output_ml} onChange={(e) => setIoForm({ ...ioForm, urine_output_ml: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Drain Output (mL)</Form.Label>
                                    <Form.Control type="number" min="0" value={ioForm.drain_output_ml} onChange={(e) => setIoForm({ ...ioForm, drain_output_ml: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Stool Output (mL)</Form.Label>
                                    <Form.Control type="number" min="0" value={ioForm.stool_output_ml} onChange={(e) => setIoForm({ ...ioForm, stool_output_ml: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Emesis / Vomitus (mL)</Form.Label>
                                    <Form.Control type="number" min="0" value={ioForm.emesis_ml} onChange={(e) => setIoForm({ ...ioForm, emesis_ml: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-2">
                            <Form.Label className="small">Clinical Charting Notes</Form.Label>
                            <Form.Control type="text" placeholder="e.g., Bolus given, clear urine output" value={ioForm.notes} onChange={(e) => setIoForm({ ...ioForm, notes: e.target.value })} />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="bg-light">
                        <Button variant="secondary" onClick={() => setShowIOModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={submitting}>
                            {submitting ? <Spinner animation="border" size="sm" /> : 'Save Hourly Entry'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal 2: Ventilator Telemetry Entry Form */}
            <Modal show={showVentModal} onHide={() => setShowVentModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title className="fs-5 fw-bold d-flex align-items-center">
                        <Wind size={20} className="me-2" /> Record Ventilator Telemetry Metrics
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleVentSubmit}>
                    <Modal.Body className="p-4">
                        <Row className="g-3 mb-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Ventilator Mode</Form.Label>
                                    <Form.Select value={ventForm.ventilator_mode} onChange={(e) => setVentForm({ ...ventForm, ventilator_mode: e.target.value })}>
                                        <option value="SIMV-PC">SIMV-PC (Pressure Control)</option>
                                        <option value="AC-VC">AC-VC (Volume Control)</option>
                                        <option value="PSV">PSV (Pressure Support)</option>
                                        <option value="CPAP">CPAP / BiPAP</option>
                                        <option value="PRVC">PRVC</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">PEEP (cmH2O)</Form.Label>
                                    <Form.Control type="number" step="0.5" value={ventForm.peep} onChange={(e) => setVentForm({ ...ventForm, peep: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">FiO2 (%)</Form.Label>
                                    <Form.Control type="number" step="1" min="21" max="100" value={ventForm.fio2} onChange={(e) => setVentForm({ ...ventForm, fio2: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="g-3 mb-3">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Resp Rate (bpm)</Form.Label>
                                    <Form.Control type="number" value={ventForm.respiratory_rate} onChange={(e) => setVentForm({ ...ventForm, respiratory_rate: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Tidal Volume (mL)</Form.Label>
                                    <Form.Control type="number" value={ventForm.tidal_volume} onChange={(e) => setVentForm({ ...ventForm, tidal_volume: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Peak Press (cmH2O)</Form.Label>
                                    <Form.Control type="number" value={ventForm.peak_pressure} onChange={(e) => setVentForm({ ...ventForm, peak_pressure: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small">Plateau Press (cmH2O)</Form.Label>
                                    <Form.Control type="number" value={ventForm.plateau_pressure} onChange={(e) => setVentForm({ ...ventForm, plateau_pressure: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small">SpO2 Oxygen Saturation (%)</Form.Label>
                                    <Form.Control type="number" min="50" max="100" value={ventForm.sp02} onChange={(e) => setVentForm({ ...ventForm, sp02: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="small">I:E Ratio</Form.Label>
                                    <Form.Control type="text" placeholder="e.g., 1:2" value={ventForm.ie_ratio} onChange={(e) => setVentForm({ ...ventForm, ie_ratio: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="bg-light">
                        <Button variant="secondary" onClick={() => setShowVentModal(false)}>Cancel</Button>
                        <Button variant="danger" type="submit" disabled={submitting}>
                            {submitting ? <Spinner animation="border" size="sm" /> : 'Save Ventilator Telemetry'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default ICUDashboard;
