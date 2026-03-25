import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Tab, Nav, Badge, Button, Table, Alert, Spinner, Modal, Form, ProgressBar } from 'react-bootstrap';
import axios from 'axios';

const API = '/api/ai';

const EnterpriseAIDashboard = () => {
    const [activeTab, setActiveTab] = useState('revenue');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ── Revenue Cycle State ──
    const [scrubResult, setScrubResult] = useState(null);
    const [drgResult, setDrgResult] = useState(null);
    const [appealResult, setAppealResult] = useState(null);
    const [leakageResult, setLeakageResult] = useState(null);
    const [scrubInvoiceId, setScrubInvoiceId] = useState('');
    const [drgAdmissionId, setDrgAdmissionId] = useState('');
    const [leakageAdmissionId, setLeakageAdmissionId] = useState('');
    const [appealInvoiceId, setAppealInvoiceId] = useState('');
    const [appealReason, setAppealReason] = useState('MEDICAL_NECESSITY');

    // ── Supply Chain State ──
    const [surgicalForecast, setSurgicalForecast] = useState(null);
    const [diseaseSpikes, setDiseaseSpikes] = useState(null);
    const [expiryRisk, setExpiryRisk] = useState(null);
    const [poResult, setPOResult] = useState(null);
    const [poItemName, setPOItemName] = useState('');
    const [poQuantity, setPOQuantity] = useState(100);

    // ── Clinical AI State ──
    const [pathwayResult, setPathwayResult] = useState(null);
    const [readmissionResult, setReadmissionResult] = useState(null);
    const [sepsisResult, setSepsisResult] = useState(null);
    const [pathwayAdmId, setPathwayAdmId] = useState('');
    const [readmissionPatId, setReadmissionPatId] = useState('');
    const [sepsisAdmId, setSepsisAdmId] = useState('');

    // ── Ops Center State ──
    const [bedIntel, setBedIntel] = useState(null);
    const [staffWorkload, setStaffWorkload] = useState(null);
    const [erSurge, setERSurge] = useState(null);
    const [scorecard, setScorecard] = useState(null);

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const apiCall = async (method, url, data = null) => {
        setLoading(true);
        setError(null);
        try {
            const config = { headers };
            const res = method === 'post'
                ? await axios.post(url, data, config)
                : await axios.get(url, config);
            return res.data;
        } catch (err) {
            setError(err.response?.data?.message || err.message);
            return null;
        } finally {
            setLoading(false);
        }
    };

    // ── Auto-load Ops Center data ──
    useEffect(() => {
        if (activeTab === 'ops') {
            loadOpsData();
        }
    }, [activeTab]);

    const loadOpsData = async () => {
        setLoading(true);
        try {
            const [beds, staff, er, sc] = await Promise.all([
                axios.get(`${API}/ops/beds`, { headers }).catch(() => ({ data: null })),
                axios.get(`${API}/ops/staff-workload`, { headers }).catch(() => ({ data: null })),
                axios.get(`${API}/ops/er-surge`, { headers }).catch(() => ({ data: null })),
                axios.get(`${API}/ops/scorecard`, { headers }).catch(() => ({ data: null })),
            ]);
            setBedIntel(beds.data);
            setStaffWorkload(staff.data);
            setERSurge(er.data);
            setScorecard(sc.data);
        } catch (e) {
            setError('Failed to load ops data');
        }
        setLoading(false);
    };

    // ══════════════════════════════════════════════════
    // SEVERITY BADGE HELPER
    // ══════════════════════════════════════════════════
    const SeverityBadge = ({ severity }) => {
        const map = {
            'CRITICAL': 'danger', 'HIGH': 'warning', 'MEDIUM': 'info',
            'LOW': 'success', 'NONE': 'secondary',
            '🔴 CRITICAL': 'danger', '🟡 WARNING': 'warning', '🟠 MONITOR': 'info',
            '🔴 SHORTAGE': 'danger', '🟡 LOW': 'warning', '🟢 OK': 'success',
            '🔴 Understaffed': 'danger', '🟡 Borderline': 'warning', '🟢 Adequate': 'success',
        };
        return <Badge bg={map[severity] || 'secondary'}>{severity}</Badge>;
    };

    // ══════════════════════════════════════════════════
    // PILLAR 1: REVENUE CYCLE
    // ══════════════════════════════════════════════════
    const RevenueCyclePanel = () => (
        <div>
            <Row className="g-3 mb-4">
                {/* Claim Scrubber */}
                <Col md={6}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
                        <Card.Body className="text-white">
                            <h5>🛡️ Pre-Flight Claim Scrubber</h5>
                            <p className="text-white-50 small">Validate claims against clinical documentation before TPA submission</p>
                            <Form.Group className="mb-2">
                                <Form.Control size="sm" placeholder="Invoice ID" value={scrubInvoiceId}
                                    onChange={e => setScrubInvoiceId(e.target.value)} className="bg-dark text-white border-secondary" />
                            </Form.Group>
                            <Button size="sm" variant="outline-info" onClick={async () => {
                                if (!scrubInvoiceId) return;
                                const r = await apiCall('get', `${API}/revenue/scrub/${scrubInvoiceId}`);
                                if (r) setScrubResult(r);
                            }}>🔍 Scrub Claim</Button>

                            {scrubResult && (
                                <div className="mt-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span>Risk Score</span>
                                        <Badge bg={scrubResult.riskScore >= 50 ? 'danger' : scrubResult.riskScore >= 25 ? 'warning' : 'success'} className="fs-6">
                                            {scrubResult.riskScore}/100
                                        </Badge>
                                    </div>
                                    <ProgressBar now={scrubResult.riskScore} variant={scrubResult.riskScore >= 50 ? 'danger' : scrubResult.riskScore >= 25 ? 'warning' : 'success'} className="mb-2" />
                                    <small>{scrubResult.recommendation}</small>
                                    {scrubResult.flags?.map((f, i) => (
                                        <Alert key={i} variant={f.severity === 'CRITICAL' ? 'danger' : 'warning'} className="mt-2 py-1 px-2 small mb-1">
                                            <strong>[{f.code}]</strong> {f.message}<br />
                                            <em>Fix: {f.fix}</em>
                                        </Alert>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* DRG Auto-Coder */}
                <Col md={6}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #0f3460 0%, #533483 100%)' }}>
                        <Card.Body className="text-white">
                            <h5>🧬 Autonomous DRG Coder</h5>
                            <p className="text-white-50 small">Auto-assign ICD-10 & DRG codes from clinical documentation</p>
                            <Form.Group className="mb-2">
                                <Form.Control size="sm" placeholder="Admission ID" value={drgAdmissionId}
                                    onChange={e => setDrgAdmissionId(e.target.value)} className="bg-dark text-white border-secondary" />
                            </Form.Group>
                            <Button size="sm" variant="outline-light" onClick={async () => {
                                if (!drgAdmissionId) return;
                                const r = await apiCall('get', `${API}/revenue/drg/${drgAdmissionId}`);
                                if (r) setDrgResult(r);
                            }}>🏷️ Auto-Code</Button>

                            {drgResult && (
                                <div className="mt-3">
                                    <Table size="sm" className="text-white small" borderless>
                                        <tbody>
                                            <tr><td>DRG Code</td><td><Badge bg="info" className="fs-6">{drgResult.drgCode}</Badge></td></tr>
                                            <tr><td>ICD-10</td><td>{drgResult.icd10Codes?.join(', ')}</td></tr>
                                            <tr><td>Diagnosis</td><td>{drgResult.primaryDiagnosis}</td></tr>
                                            <tr><td>Confidence</td><td>
                                                <ProgressBar now={drgResult.confidence * 100} label={`${(drgResult.confidence * 100).toFixed(0)}%`}
                                                    variant={drgResult.confidence > 0.7 ? 'success' : 'warning'} />
                                            </td></tr>
                                        </tbody>
                                    </Table>
                                    <small className="text-white-50">{drgResult.note}</small>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Denial Appeal Generator */}
                <Col md={6}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #2d132c 0%, #801336 100%)' }}>
                        <Card.Body className="text-white">
                            <h5>⚖️ Denial Appeal Generator</h5>
                            <p className="text-white-50 small">Auto-draft legally robust appeal letters with clinical evidence</p>
                            <Row className="g-2 mb-2">
                                <Col><Form.Control size="sm" placeholder="Invoice ID" value={appealInvoiceId}
                                    onChange={e => setAppealInvoiceId(e.target.value)} className="bg-dark text-white border-secondary" /></Col>
                                <Col><Form.Select size="sm" value={appealReason} onChange={e => setAppealReason(e.target.value)} className="bg-dark text-white border-secondary">
                                    <option value="MEDICAL_NECESSITY">Medical Necessity</option>
                                    <option value="DOCUMENTS_MISSING">Documents Missing</option>
                                    <option value="PROCEDURE_NOT_COVERED">Procedure Not Covered</option>
                                    <option value="EXCESS_CHARGES">Excess Charges</option>
                                </Form.Select></Col>
                            </Row>
                            <Button size="sm" variant="outline-danger" onClick={async () => {
                                if (!appealInvoiceId) return;
                                const r = await apiCall('post', `${API}/revenue/appeal/${appealInvoiceId}`, { denialReason: appealReason });
                                if (r) setAppealResult(r);
                            }}>📝 Generate Appeal</Button>

                            {appealResult && (
                                <div className="mt-3">
                                    <pre className="bg-dark p-2 rounded small text-warning" style={{ maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                                        {appealResult.appealLetter}
                                    </pre>
                                    <small className="text-white-50">Attachments Required: {appealResult.attachmentsRequired?.join(', ')}</small>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Revenue Leakage */}
                <Col md={6}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #1b1b2f 0%, #e43f5a 100%)' }}>
                        <Card.Body className="text-white">
                            <h5>💸 Revenue Leakage Detector</h5>
                            <p className="text-white-50 small">Find unbilled labs, medicines, and procedures</p>
                            <Form.Group className="mb-2">
                                <Form.Control size="sm" placeholder="Admission ID" value={leakageAdmissionId}
                                    onChange={e => setLeakageAdmissionId(e.target.value)} className="bg-dark text-white border-secondary" />
                            </Form.Group>
                            <Button size="sm" variant="outline-warning" onClick={async () => {
                                if (!leakageAdmissionId) return;
                                const r = await apiCall('get', `${API}/revenue/leakage/${leakageAdmissionId}`);
                                if (r) setLeakageResult(r);
                            }}>🔎 Scan for Leaks</Button>

                            {leakageResult && (
                                <div className="mt-3">
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>{leakageResult.message}</span>
                                        <SeverityBadge severity={leakageResult.severity} />
                                    </div>
                                    {leakageResult.leaks?.map((l, i) => (
                                        <Alert key={i} variant="warning" className="py-1 px-2 small mb-1">
                                            <strong>[{l.type}]</strong> {l.message} — Est. ₹{l.estimatedLoss}
                                        </Alert>
                                    ))}
                                    {leakageResult.totalLeakageEstimate > 0 && (
                                        <div className="text-center mt-2">
                                            <Badge bg="danger" className="fs-5">₹{leakageResult.totalLeakageEstimate?.toLocaleString()}</Badge>
                                            <div className="small text-white-50 mt-1">Total Estimated Revenue Loss</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );

    // ══════════════════════════════════════════════════
    // PILLAR 2: SUPPLY CHAIN
    // ══════════════════════════════════════════════════
    const SupplyChainPanel = () => (
        <div>
            <Row className="g-3 mb-3">
                <Col md={6}>
                    <Button variant="primary" className="w-100 py-3" onClick={async () => {
                        const r = await apiCall('get', `${API}/supply/surgical-forecast`);
                        if (r) setSurgicalForecast(r);
                    }}>🔮 Run 14-Day Surgical Demand Forecast</Button>
                </Col>
                <Col md={6}>
                    <Button variant="danger" className="w-100 py-3" onClick={async () => {
                        const r = await apiCall('get', `${API}/supply/disease-spikes`);
                        if (r) setDiseaseSpikes(r);
                    }}>🦠 Scan Disease Spikes</Button>
                </Col>
                <Col md={6}>
                    <Button variant="warning" className="w-100 py-3" onClick={async () => {
                        const r = await apiCall('get', `${API}/supply/expiry-risk?days=90`);
                        if (r) setExpiryRisk(r);
                    }}>⏰ Scan Expiry Risk (90 Days)</Button>
                </Col>
                <Col md={6}>
                    <Card className="border-0 shadow-sm" style={{ background: '#1a1a2e' }}>
                        <Card.Body className="text-white">
                            <h6>📦 Smart PO Recommendation</h6>
                            <Row className="g-2">
                                <Col><Form.Control size="sm" placeholder="Item Name" value={poItemName} onChange={e => setPOItemName(e.target.value)} className="bg-dark text-white border-secondary" /></Col>
                                <Col xs={3}><Form.Control size="sm" type="number" value={poQuantity} onChange={e => setPOQuantity(e.target.value)} className="bg-dark text-white border-secondary" /></Col>
                                <Col xs={3}><Button size="sm" variant="outline-info" onClick={async () => {
                                    const r = await apiCall('post', `${API}/supply/smart-po`, { itemName: poItemName, quantity: poQuantity });
                                    if (r) setPOResult(r);
                                }}>Analyze</Button></Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Surgical Forecast Results */}
            {surgicalForecast && (
                <Card className="border-0 shadow-sm mb-3">
                    <Card.Header className="bg-primary text-white">
                        🔮 Surgical Demand Forecast — {surgicalForecast.totalSurgeries} surgeries in next 14 days
                    </Card.Header>
                    <Card.Body>
                        {surgicalForecast.alerts?.length > 0 && surgicalForecast.alerts.map((a, i) => (
                            <Alert key={i} variant="danger" className="py-1 small">{a.message}</Alert>
                        ))}
                        <Table size="sm" striped hover responsive>
                            <thead><tr><th>Item</th><th>Required</th><th>In Stock</th><th>Deficit</th><th>Status</th></tr></thead>
                            <tbody>
                                {surgicalForecast.demandForecast?.map((d, i) => (
                                    <tr key={i}>
                                        <td>{d.item}</td><td>{d.required}</td><td>{d.currentStock}</td>
                                        <td className={d.deficit > 0 ? 'text-danger fw-bold' : ''}>{d.deficit}</td>
                                        <td>{d.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {/* Disease Spikes */}
            {diseaseSpikes && (
                <Card className="border-0 shadow-sm mb-3">
                    <Card.Header className="bg-danger text-white">
                        🦠 Epidemiological Analysis — {diseaseSpikes.message}
                    </Card.Header>
                    <Card.Body>
                        {diseaseSpikes.spikes?.length > 0 ? (
                            <Table size="sm" striped hover responsive>
                                <thead><tr><th>Disease</th><th>This Week</th><th>Avg/Week</th><th>Spike %</th><th>Severity</th></tr></thead>
                                <tbody>
                                    {diseaseSpikes.spikes.map((s, i) => (
                                        <tr key={i}>
                                            <td className="fw-bold">{s.disease}</td><td>{s.thisWeek}</td>
                                            <td>{s.weeklyAverage}</td><td className="text-danger fw-bold">+{s.spikePercent}%</td>
                                            <td><SeverityBadge severity={s.severity} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : <p className="text-muted">No significant disease spikes detected ✅</p>}
                    </Card.Body>
                </Card>
            )}

            {/* Expiry Risk */}
            {expiryRisk && (
                <Card className="border-0 shadow-sm mb-3">
                    <Card.Header className="bg-warning text-dark">
                        ⏰ Expiry Risk — {expiryRisk.summary}
                    </Card.Header>
                    <Card.Body>
                        {expiryRisk.atRiskItems?.length > 0 ? (
                            <Table size="sm" striped hover responsive>
                                <thead><tr><th>Item</th><th>Batch</th><th>Qty</th><th>Value</th><th>Days Left</th><th>Urgency</th></tr></thead>
                                <tbody>
                                    {expiryRisk.atRiskItems.map((it, i) => (
                                        <tr key={i}>
                                            <td>{it.name}</td><td>{it.batch}</td><td>{it.quantity}</td>
                                            <td>₹{it.totalValue?.toLocaleString()}</td><td>{it.daysLeft}</td>
                                            <td>{it.urgency}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : <p className="text-success">No near-expiry items ✅</p>}
                    </Card.Body>
                </Card>
            )}

            {/* Smart PO Result */}
            {poResult && (
                <Card className="border-0 shadow-sm mb-3">
                    <Card.Header className="bg-info text-white">📦 Vendor Comparison — {poResult.item} (Qty: {poResult.requestedQuantity})</Card.Header>
                    <Card.Body>
                        <p className="fw-bold">{poResult.recommendation}</p>
                        <Table size="sm" striped hover responsive>
                            <thead><tr><th>Vendor</th><th>Avg Price</th><th>Total Cost</th><th>Delivery</th><th>Reliability</th></tr></thead>
                            <tbody>
                                {poResult.vendorComparison?.map((v, i) => (
                                    <tr key={i}>
                                        <td className="fw-bold">{v.vendor}</td>
                                        <td>₹{v.avgUnitPrice}</td><td>₹{v.totalCost?.toLocaleString()}</td>
                                        <td>{v.avgDeliveryDays} days</td><td><Badge bg={v.reliability === 'HIGH' ? 'success' : 'warning'}>{v.reliability}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}
        </div>
    );

    // ══════════════════════════════════════════════════
    // PILLAR 3: CLINICAL AI
    // ══════════════════════════════════════════════════
    const ClinicalAIPanel = () => (
        <div>
            <Row className="g-3 mb-4">
                {/* Pathway Adherence */}
                <Col md={4}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #0d7377 0%, #14ffec 100%)' }}>
                        <Card.Body>
                            <h5>📋 Pathway Adherence</h5>
                            <p className="small text-dark">Check treatment vs clinical protocol</p>
                            <Form.Control size="sm" placeholder="Admission ID" value={pathwayAdmId}
                                onChange={e => setPathwayAdmId(e.target.value)} className="mb-2" />
                            <Button size="sm" variant="dark" onClick={async () => {
                                if (!pathwayAdmId) return;
                                const r = await apiCall('get', `${API}/clinical/pathway/${pathwayAdmId}`);
                                if (r) setPathwayResult(r);
                            }}>Analyze Pathway</Button>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Readmission Risk */}
                <Col md={4}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                        <Card.Body className="text-white">
                            <h5>🔄 Readmission Risk</h5>
                            <p className="small text-white-50">30-day readmission probability</p>
                            <Form.Control size="sm" placeholder="Patient ID (UUID)" value={readmissionPatId}
                                onChange={e => setReadmissionPatId(e.target.value)} className="mb-2 bg-dark text-white border-0" />
                            <Button size="sm" variant="outline-light" onClick={async () => {
                                if (!readmissionPatId) return;
                                const r = await apiCall('get', `${API}/clinical/readmission-risk/${readmissionPatId}`);
                                if (r) setReadmissionResult(r);
                            }}>Predict Risk</Button>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Sepsis Screen */}
                <Col md={4}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)' }}>
                        <Card.Body className="text-white">
                            <h5>🚨 Sepsis Screening</h5>
                            <p className="small text-white-50">qSOFA-based early warning</p>
                            <Form.Control size="sm" placeholder="Admission ID" value={sepsisAdmId}
                                onChange={e => setSepsisAdmId(e.target.value)} className="mb-2 bg-dark text-white border-0" />
                            <Button size="sm" variant="outline-light" onClick={async () => {
                                if (!sepsisAdmId) return;
                                const r = await apiCall('get', `${API}/clinical/sepsis-screen/${sepsisAdmId}`);
                                if (r) setSepsisResult(r);
                            }}>Screen Now</Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Pathway Result */}
            {pathwayResult && (
                <Card className="border-0 shadow-sm mb-3">
                    <Card.Header className="bg-dark text-white d-flex justify-content-between">
                        <span>📋 Pathway Adherence — {pathwayResult.pathway || 'N/A'}</span>
                        {pathwayResult.adherenceScore !== null && (
                            <Badge bg={pathwayResult.adherenceGrade === 'A' ? 'success' : pathwayResult.adherenceGrade === 'B' ? 'info' : 'danger'} className="fs-6">
                                Grade {pathwayResult.adherenceGrade} ({pathwayResult.adherenceScore}%)
                            </Badge>
                        )}
                    </Card.Header>
                    <Card.Body>
                        {pathwayResult.deviations?.length > 0 ? pathwayResult.deviations.map((d, i) => (
                            <Alert key={i} variant={d.severity === 'CRITICAL' ? 'danger' : 'warning'} className="py-1 small">
                                <strong>[{d.type}]</strong> {d.message}
                            </Alert>
                        )) : <p className="text-success">No deviations detected ✅</p>}
                    </Card.Body>
                </Card>
            )}

            {/* Readmission Result */}
            {readmissionResult && (
                <Card className="border-0 shadow-sm mb-3">
                    <Card.Header className={`text-white ${readmissionResult.riskLevel === 'HIGH' ? 'bg-danger' : readmissionResult.riskLevel === 'MODERATE' ? 'bg-warning' : 'bg-success'}`}>
                        🔄 Readmission Risk — {readmissionResult.patientName} — {readmissionResult.riskLevel} ({readmissionResult.riskScore}/100)
                    </Card.Header>
                    <Card.Body>
                        <ProgressBar now={readmissionResult.riskScore} variant={readmissionResult.riskLevel === 'HIGH' ? 'danger' : 'warning'} className="mb-3" label={`${readmissionResult.riskScore}%`} />
                        <Row>
                            <Col md={6}>
                                <h6>Risk Factors</h6>
                                {readmissionResult.factors?.map((f, i) => (
                                    <div key={i} className="d-flex justify-content-between border-bottom py-1 small">
                                        <span>{f.name}</span><Badge bg="secondary">+{f.score}</Badge>
                                    </div>
                                ))}
                            </Col>
                            <Col md={6}>
                                <h6>Recommended Interventions</h6>
                                <ul className="small">{readmissionResult.interventions?.map((iv, i) => <li key={i}>{iv}</li>)}</ul>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            )}

            {/* Sepsis Result */}
            {sepsisResult && (
                <Card className={`border-0 shadow-sm mb-3 ${sepsisResult.isSepsisAlert ? 'border-danger border-3' : ''}`}>
                    <Card.Header className={`text-white ${sepsisResult.isSepsisAlert ? 'bg-danger' : 'bg-success'}`}>
                        🚨 {sepsisResult.alertLevel} — qSOFA Score: {sepsisResult.qsofaScore}/{sepsisResult.maxScore}
                    </Card.Header>
                    <Card.Body>
                        <Table size="sm" striped>
                            <thead><tr><th>Criterion</th><th>Value</th><th>Threshold</th><th>Met?</th></tr></thead>
                            <tbody>
                                {sepsisResult.criteria?.map((c, i) => (
                                    <tr key={i} className={c.met ? 'table-danger' : ''}>
                                        <td>{c.criterion}</td><td>{c.value}</td><td>{c.threshold}</td>
                                        <td>{c.met ? '⚠️ YES' : '✅ No'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                        {sepsisResult.actions?.length > 0 && (
                            <div className="mt-2">
                                <h6 className="text-danger">STAT ACTIONS:</h6>
                                {sepsisResult.actions.map((a, i) => <div key={i} className="fw-bold text-danger small">{a}</div>)}
                            </div>
                        )}
                    </Card.Body>
                </Card>
            )}
        </div>
    );

    // ══════════════════════════════════════════════════
    // PILLAR 4: OPS COMMAND CENTER
    // ══════════════════════════════════════════════════
    const OpsCommandPanel = () => (
        <div>
            {/* Scorecard */}
            {scorecard && (
                <Card className="border-0 shadow-sm mb-3" style={{ background: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 100%)' }}>
                    <Card.Header className="bg-transparent text-white d-flex justify-content-between">
                        <h5 className="mb-0">🏥 Hospital Performance Scorecard</h5>
                        <Badge bg={scorecard.overallScore >= 90 ? 'success' : scorecard.overallScore >= 60 ? 'warning' : 'danger'} className="fs-5">
                            Grade {scorecard.grade} ({scorecard.overallScore}/100)
                        </Badge>
                    </Card.Header>
                    <Card.Body>
                        <Row className="text-white text-center">
                            {scorecard.kpis && Object.entries(scorecard.kpis).map(([key, kpi], i) => (
                                <Col key={i} md={2} className="mb-2">
                                    <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <div className="fs-4">{kpi.status}</div>
                                        <div className="fs-5 fw-bold">{typeof kpi.value === 'object' ? JSON.stringify(kpi.value) : kpi.value}</div>
                                        <small className="text-white-50">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</small>
                                        {kpi.benchmark && <div className="small text-info">Target: {kpi.benchmark}</div>}
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </Card.Body>
                </Card>
            )}

            <Row className="g-3 mb-3">
                {/* Bed Intelligence */}
                {bedIntel && (
                    <Col md={6}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Header className="bg-primary text-white">🛏️ Real-Time Bed Intelligence</Card.Header>
                            <Card.Body>
                                <Row className="text-center mb-3">
                                    <Col><div className="fs-3 fw-bold text-success">{bedIntel.overall?.available}</div><small>Available</small></Col>
                                    <Col><div className="fs-3 fw-bold text-danger">{bedIntel.overall?.occupied}</div><small>Occupied</small></Col>
                                    <Col><div className="fs-3 fw-bold text-primary">{bedIntel.overall?.occupancyRate}</div><small>Rate</small></Col>
                                </Row>
                                {bedIntel.bottlenecks?.length > 0 && bedIntel.bottlenecks.map((b, i) => (
                                    <Alert key={i} variant="danger" className="py-1 small">{b.message}</Alert>
                                ))}
                                <Table size="sm" striped hover>
                                    <thead><tr><th>Ward</th><th>Total</th><th>Occupied</th><th>Available</th><th>%</th></tr></thead>
                                    <tbody>
                                        {bedIntel.byWard?.map((w, i) => (
                                            <tr key={i}>
                                                <td>{w.ward}</td><td>{w.total}</td><td>{w.occupied}</td><td>{w.available}</td>
                                                <td><Badge bg={Number(w.occupancy_pct) > 90 ? 'danger' : 'success'}>{w.occupancy_pct}%</Badge></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Col>
                )}

                {/* Staff Workload */}
                {staffWorkload && (
                    <Col md={6}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Header className={`text-white ${staffWorkload.nabhCompliant ? 'bg-success' : 'bg-danger'}`}>
                                👩‍⚕️ NABH Staff Compliance — {staffWorkload.nabhCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'} (Score: {staffWorkload.overallScore})
                            </Card.Header>
                            <Card.Body>
                                {staffWorkload.alerts?.map((a, i) => (
                                    <Alert key={i} variant={a.severity === 'CRITICAL' ? 'danger' : 'warning'} className="py-1 small">{a.message}</Alert>
                                ))}
                                <Table size="sm" striped hover>
                                    <thead><tr><th>Ward</th><th>Patients</th><th>Nurses</th><th>Ratio</th><th>Deficit</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {staffWorkload.wards?.map((w, i) => (
                                            <tr key={i}>
                                                <td>{w.ward}</td><td>{w.patients}</td><td>{w.nurses}</td>
                                                <td>{w.actualRatio}</td><td className={w.deficit > 0 ? 'text-danger fw-bold' : ''}>{w.deficit}</td>
                                                <td>{w.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    </Col>
                )}
            </Row>

            {/* ER Surge */}
            {erSurge && (
                <Card className="border-0 shadow-sm mb-3">
                    <Card.Header className="bg-warning text-dark">
                        🚑 ER Surge Prediction — {erSurge.recommendation}
                    </Card.Header>
                    <Card.Body>
                        <Row className="text-center mb-3">
                            <Col><div className="fs-3 fw-bold text-danger">{erSurge.currentERPatients}</div><small>Current ER Patients</small></Col>
                            <Col><div className="fs-3 fw-bold text-primary">{erSurge.totalPredicted}</div><small>Predicted (6h)</small></Col>
                            <Col><div className="fs-3 fw-bold text-warning">{erSurge.peakHour}:00</div><small>Peak Hour</small></Col>
                        </Row>
                        <Table size="sm" striped>
                            <thead><tr><th>Hour</th><th>Predicted Arrivals</th><th>Confidence</th></tr></thead>
                            <tbody>
                                {erSurge.next6Hours?.map((h, i) => (
                                    <tr key={i}><td>{h.hour}:00</td><td>{h.predictedArrivals}</td><td><Badge bg="info">{h.confidence}</Badge></td></tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            <Button variant="outline-primary" className="w-100" onClick={loadOpsData} disabled={loading}>
                {loading ? <Spinner size="sm" /> : '🔄 Refresh All Ops Data'}
            </Button>
        </div>
    );

    // ══════════════════════════════════════════════════
    // MAIN RENDER
    // ══════════════════════════════════════════════════
    return (
        <Container fluid className="py-4" style={{ background: '#f0f2f5', minHeight: '100vh' }}>
            {/* Header */}
            <div className="mb-4">
                <h2 className="fw-bold mb-1">
                    <span style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        🐺 Enterprise AI Command Center
                    </span>
                </h2>
                <p className="text-muted mb-0">Phase 8 — 4 AI Pillars • 16 Endpoints • Real-Time Hospital Intelligence</p>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

            <Tab.Container activeKey={activeTab} onSelect={k => setActiveTab(k)}>
                <Nav variant="pills" className="mb-4 gap-2">
                    <Nav.Item>
                        <Nav.Link eventKey="revenue" className="px-4 py-2" style={activeTab === 'revenue' ? { background: 'linear-gradient(135deg, #1a1a2e, #16213e)', color: '#fff' } : {}}>
                            💰 Revenue Cycle
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="supply" className="px-4 py-2" style={activeTab === 'supply' ? { background: 'linear-gradient(135deg, #0d7377, #14ffec)', color: '#000' } : {}}>
                            📦 Supply Chain
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="clinical" className="px-4 py-2" style={activeTab === 'clinical' ? { background: 'linear-gradient(135deg, #f093fb, #f5576c)', color: '#fff' } : {}}>
                            🩺 Clinical AI
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="ops" className="px-4 py-2" style={activeTab === 'ops' ? { background: 'linear-gradient(135deg, #0c0c1d, #1a1a3e)', color: '#fff' } : {}}>
                            🏥 Ops Command Center
                        </Nav.Link>
                    </Nav.Item>
                </Nav>

                <Tab.Content>
                    <Tab.Pane eventKey="revenue"><RevenueCyclePanel /></Tab.Pane>
                    <Tab.Pane eventKey="supply"><SupplyChainPanel /></Tab.Pane>
                    <Tab.Pane eventKey="clinical"><ClinicalAIPanel /></Tab.Pane>
                    <Tab.Pane eventKey="ops"><OpsCommandPanel /></Tab.Pane>
                </Tab.Content>
            </Tab.Container>

            {loading && (
                <div className="position-fixed bottom-0 end-0 m-3">
                    <Badge bg="dark" className="px-3 py-2"><Spinner size="sm" className="me-2" /> Processing AI request...</Badge>
                </div>
            )}
        </Container>
    );
};

export default EnterpriseAIDashboard;
