import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Button, Badge, Form, Table,
  Modal, Alert, Spinner, InputGroup, Tabs, Tab, Toast, ToastContainer,
  ListGroup, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import {
  Eye, Search, Plus, Save, XCircle, CheckCircle2,
  Clock, FileText, DollarSign, Activity, RefreshCw,
  ClipboardCheck, User, Calendar, Filter
} from 'lucide-react';
import api from '../../utils/axiosInstance';
import StatsCard from '../../components/ui/StatsCard';

// ─── Ophthalmology procedure codes (common in India) ───
const OPHTHALMOLOGY_PROCEDURE_CODES = [
  { code: 'O001', name: 'Cataract Surgery - Phacoemulsification', fee: 25000, category: 'Cataract' },
  { code: 'O002', name: 'Cataract Surgery - MSICS', fee: 18000, category: 'Cataract' },
  { code: 'O003', name: 'LASIK - Both Eyes', fee: 45000, category: 'Refractive' },
  { code: 'O004', name: 'PRK - Single Eye', fee: 15000, category: 'Refractive' },
  { code: 'O005', name: 'Vitrectomy', fee: 35000, category: 'Retina' },
  { code: 'O006', name: 'Trabeculectomy', fee: 20000, category: 'Glaucoma' },
  { code: 'O007', name: 'Corneal Transplant (PKP)', fee: 40000, category: 'Cornea' },
  { code: 'O008', name: 'Ptosis Repair', fee: 15000, category: 'Oculoplasty' },
  { code: 'O009', name: 'DCR Surgery', fee: 12000, category: 'Oculoplasty' },
  { code: 'O010', name: 'Squint Correction', fee: 20000, category: 'Strabismus' },
  { code: 'O011', name: 'Intravitreal Injection (Anti-VEGF)', fee: 8000, category: 'Retina' },
  { code: 'O012', name: 'YAG Capsulotomy', fee: 5000, category: 'Cataract' },
];

// ─── IOL options ───
const IOL_MODELS = [
  'Alcon AcrySof IQ',
  'Alcon PanOptix Trifocal',
  'Alcon Vivity EDOF',
  'AMO Tecnis Symfony',
  'AMO Tecnis Eyhance',
  'Bausch & Lomb enVista',
  'Bausch & Lomb Akreos',
  'Zeiss AT LISA Tri',
  'Indian PMMA IOL',
  'Custom Toric IOL',
];

// ─── IOL formulas ───
const IOL_FORMULAS = ['SRK/T', 'Holladay 1', 'Holladay 2', 'Hoffer Q', 'Haigis', 'Barrett Universal II', 'Kane'];

const OphthalmologyDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [activeVisit, setActiveVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proceduresLog, setProceduresLog] = useState([]);
  const [biometryRecords, setBiometryRecords] = useState([]);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showProcModal, setShowProcModal] = useState(false);
  const [showBiometryModal, setShowBiometryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  // Visit form
  const [visitForm, setVisitForm] = useState({
    chief_complaint: '',
    visual_acuity_od: '',
    visual_acuity_os: '',
    iop_od: '',
    iop_os: '',
    refraction_sph_od: '',
    refraction_cyl_od: '',
    refraction_axis_od: '',
    refraction_sph_os: '',
    refraction_cyl_os: '',
    refraction_axis_os: '',
    diagnosis: '',
    treatment_plan: '',
    notes: '',
  });

  // Procedure form
  const [procForm, setProcForm] = useState({
    procedure_code: '',
    eye: 'OD',
    iol_power: '',
    iol_model: '',
    surgeon_id: '',
    notes: '',
  });

  // Biometry form
  const [biometryForm, setBiometryForm] = useState({
    axial_length_od: '',
    axial_length_os: '',
    k1_od: '',
    k2_od: '',
    k1_os: '',
    k2_os: '',
    acd_od: '',
    acd_os: '',
    lens_thickness_od: '',
    lens_thickness_os: '',
    wtw_od: '',
    wtw_os: '',
    iol_formula: 'SRK/T',
    target_refraction: '',
    notes: '',
  });

  const [stats, setStats] = useState({
    activeVisits: 0,
    proceduresToday: 0,
    cataractSurgeriesThisMonth: 0,
    totalFeesToday: 0,
  });

  const showToast = (message, variant = 'success') => {
    setToast({ show: true, message, variant });
    setTimeout(() => setToast({ show: false, message: '', variant: 'success' }), 4500);
  };

  const fetchPatients = useCallback(async () => {
    try {
      const res = await api.get('/api/patients?limit=60');
      const list = res.data?.data || res.data || [];
      setPatients(Array.isArray(list) ? list.slice(0, 60) : []);
    } catch (err) {
      console.error('Failed to load patients', err);
    }
  }, []);

  const fetchVisits = useCallback(async (patientId) => {
    if (!patientId) return;
    try {
      const res = await api.get(`/api/ophthalmology/visits?patient_id=${patientId}`);
      const data = res.data?.data || res.data || [];
      setVisits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load ophthalmology visits', err);
    }
  }, []);

  const fetchProcedures = useCallback(async (visitId) => {
    if (!visitId) return;
    try {
      const res = await api.get(`/api/ophthalmology/procedures?visit_id=${visitId}`);
      const data = res.data?.data || res.data || [];
      setProceduresLog(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load procedures', err);
      setProceduresLog([]);
    }
  }, []);

  const fetchBiometry = useCallback(async (patientId) => {
    if (!patientId) return;
    try {
      const res = await api.get(`/api/ophthalmology/biometry?patient_id=${patientId}`);
      const data = res.data?.data || res.data || [];
      setBiometryRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load biometry', err);
      setBiometryRecords([]);
    }
  }, []);

  const recalcStats = useCallback(() => {
    const active = visits.filter(v => v.status !== 'Completed' && v.status !== 'Cancelled').length;
    const today = new Date().toISOString().slice(0, 10);
    const procsToday = proceduresLog.filter(p => p.created_at && p.created_at.startsWith(today)).length;
    const cataract = proceduresLog.filter(p => (p.procedure_code === 'O001' || p.procedure_code === 'O002'))
      .length;
    const fees = proceduresLog.reduce((sum, p) => sum + (parseFloat(p.fee) || 0), 0);
    setStats({
      activeVisits: active,
      proceduresToday: procsToday,
      cataractSurgeriesThisMonth: cataract,
      totalFeesToday: fees,
    });
  }, [visits, proceduresLog]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchPatients();
      setLoading(false);
    })();
  }, [fetchPatients]);

  useEffect(() => {
    if (selectedPatient) {
      fetchVisits(selectedPatient.id);
      fetchBiometry(selectedPatient.id);
    }
  }, [selectedPatient, fetchVisits, fetchBiometry]);

  useEffect(() => {
    if (activeVisit) fetchProcedures(activeVisit.id);
  }, [activeVisit, fetchProcedures]);

  useEffect(() => { recalcStats(); }, [recalcStats]);

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setActiveVisit(null);
    setProceduresLog([]);
  };

  const handleCreateVisit = async () => {
    if (!selectedPatient || !visitForm.chief_complaint) {
      showToast('Please select a patient and enter chief complaint.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { patient_id: selectedPatient.id, ...visitForm };
      const res = await api.post('/api/ophthalmology/visits', payload);
      showToast('Ophthalmology visit created successfully!');
      setShowVisitModal(false);
      setActiveVisit(res.data?.data || res.data);
      fetchVisits(selectedPatient.id);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create visit', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogProcedure = async () => {
    if (!activeVisit || !procForm.procedure_code) {
      showToast('Select an active visit and procedure code.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { visit_id: activeVisit.id, ...procForm };
      const res = await api.post('/api/ophthalmology/procedures', payload);
      setProceduresLog(prev => [res.data?.data || res.data, ...prev]);
      showToast('Procedure logged successfully!');
      setShowProcModal(false);
      setProcForm({ procedure_code: '', eye: 'OD', iol_power: '', iol_model: '', surgeon_id: '', notes: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to log procedure', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBiometry = async () => {
    if (!selectedPatient) { showToast('Select a patient first.', 'warning'); return; }
    setSubmitting(true);
    try {
      const payload = { patient_id: selectedPatient.id, ...biometryForm };
      const res = await api.post('/api/ophthalmology/biometry', payload);
      setBiometryRecords(prev => [res.data?.data || res.data, ...prev]);
      showToast('Biometry record saved successfully!');
      setShowBiometryModal(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save biometry', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container fluid className="py-5 text-center bg-light min-vh-100">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading ophthalmology module...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 px-3 px-md-4 bg-light min-vh-100">
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast show={toast.show} onClose={() => setToast(prev => ({ ...prev, show: false }))} delay={4500} autohide bg={toast.variant}>
          <Toast.Header><strong className="me-auto">{toast.variant === 'danger' ? 'Error' : 'Notification'}</strong></Toast.Header>
          <Toast.Body className={toast.variant === 'danger' ? 'text-dark' : ''}>{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Header */}
      <Row className="align-items-center mb-4 g-3">
        <Col md={6}>
          <div className="d-flex align-items-center">
            <div className="rounded-3 p-3 me-3 shadow-sm d-flex align-items-center justify-content-center"
              style={{ width: 54, height: 54, backgroundColor: '#6366f1', color: '#fff' }}>
              <Eye size={28} />
            </div>
            <div>
              <h3 className="fw-bold mb-0 text-dark">Ophthalmology Suite</h3>
              <p className="text-muted small mb-0">Eye exams • Biometry • Cataract & Refractive surgery</p>
            </div>
          </div>
        </Col>
        <Col md={6}>
          <div className="d-flex flex-wrap justify-content-md-end gap-2">
            <Form.Select
              size="sm" style={{ maxWidth: 260 }}
              value={selectedPatient?.id || ''}
              onChange={(e) => {
                const p = patients.find(pt => String(pt.id) === e.target.value);
                if (p) handlePatientSelect(p);
              }}
            >
              <option value="">-- Select Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name || `Patient #${p.id}`} ({p.uhid || p.id})</option>
              ))}
            </Form.Select>
            <Button variant="outline-secondary" size="sm" onClick={() => { if (selectedPatient) { fetchVisits(selectedPatient.id); fetchBiometry(selectedPatient.id); } }}><RefreshCw size={15} /> Refresh</Button>
            <Button variant="primary" size="sm" disabled={!selectedPatient} onClick={() => setShowVisitModal(true)} style={{ backgroundColor: '#6366f1', borderColor: '#6366f1' }}><Plus size={15} /> New Visit</Button>
            <Button variant="outline-primary" size="sm" disabled={!selectedPatient} onClick={() => setShowBiometryModal(true)} style={{ borderColor: '#6366f1', color: '#6366f1' }}><Activity size={15} /> Biometry</Button>
            <Button variant="success" size="sm" disabled={!activeVisit} onClick={() => setShowProcModal(true)}><DollarSign size={15} /> Log Procedure</Button>
          </div>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={3} sm={6}><StatsCard title="Active Visits" value={stats.activeVisits} icon={<Eye />} variant="info" /></Col>
        <Col md={3} sm={6}><StatsCard title="Procedures Today" value={stats.proceduresToday} icon={<DollarSign />} variant="success" /></Col>
        <Col md={3} sm={6}><StatsCard title="Cataract Surgeries" value={stats.cataractSurgeriesThisMonth} icon={<Activity />} variant="warning" /></Col>
        <Col md={3} sm={6}><StatsCard title="Fees Today (₹)" value={`₹${stats.totalFeesToday.toLocaleString()}`} icon={<CheckCircle2 />} variant="purple" /></Col>
      </Row>

      {selectedPatient && (
        <Card className="border-0 shadow-sm mb-4 rounded-3 bg-white" style={{ borderLeft: '5px solid #6366f1' }}>
          <Card.Body className="py-3 px-4">
            <Row className="align-items-center g-3">
              <Col md={3}><div className="d-flex align-items-center"><User size={20} className="me-2" style={{ color: '#6366f1' }} /><div><div className="text-uppercase text-muted small fw-bold">Patient</div><div className="fw-bold">{selectedPatient.name || `#${selectedPatient.id}`}</div></div></div></Col>
              <Col md={2}><div className="d-flex align-items-center"><FileText size={20} className="me-2 text-secondary" /><div><div className="text-uppercase text-muted small fw-bold">UHID</div><div className="fw-bold font-monospace">{selectedPatient.uhid || `ID:${selectedPatient.id}`}</div></div></div></Col>
              <Col md={3}><div className="d-flex align-items-center"><Calendar size={20} className="me-2 text-secondary" /><div><div className="text-uppercase text-muted small fw-bold">DOB / Age</div><div className="fw-semibold">{selectedPatient.dob ? new Date(selectedPatient.dob).toLocaleDateString() : '—'} {selectedPatient.age ? `(${selectedPatient.age} yrs)` : ''}</div></div></div></Col>
              <Col md={4} className="text-md-end">
                {activeVisit ? <Badge bg="success" className="px-3 py-2 fs-6 rounded-pill"><CheckCircle2 size={14} className="me-1" /> Active Visit: {activeVisit.chief_complaint?.slice(0, 28) || `#${activeVisit.id}`}</Badge>
                  : <Badge bg="secondary" className="px-3 py-2 fs-6 rounded-pill">No active visit selected</Badge>}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <Card.Header className="bg-white py-3 px-4 border-bottom"><h5 className="fw-bold mb-0 d-flex align-items-center"><Eye size={20} className="me-2" style={{ color: '#6366f1' }} /> Ophthalmology Visits</h5></Card.Header>
            <Card.Body style={{ maxHeight: 300, overflowY: 'auto' }}>
              {!selectedPatient ? (
                <div className="text-center py-4 text-muted"><User size={32} className="mb-2 opacity-50" /><p className="small">Select a patient to view visits.</p></div>
              ) : visits.length === 0 ? (
                <div className="text-center py-4 text-muted"><FileText size={32} className="mb-2 opacity-50" /><p className="small">No ophthalmology visits recorded yet.</p></div>
              ) : (
                <ListGroup variant="flush">
                  {visits.map(v => (
                    <ListGroup.Item key={v.id} action active={activeVisit?.id === v.id} onClick={() => setActiveVisit(v)}
                      className="d-flex justify-content-between align-items-center"
                      style={{ borderLeft: activeVisit?.id === v.id ? '4px solid #6366f1' : '4px solid transparent', backgroundColor: activeVisit?.id === v.id ? '#eef2ff' : 'transparent' }}>
                      <div><div className="fw-semibold small">{v.chief_complaint?.slice(0, 40) || `Visit #${v.id}`}</div>
                        <div className="text-muted small d-flex align-items-center gap-2"><Clock size={12} /> {v.created_at ? new Date(v.created_at).toLocaleDateString() : '—'}
                          <span>· VA: {v.visual_acuity_od || '—'} / {v.visual_acuity_os || '—'}</span></div></div>
                      <Badge bg={v.status === 'Completed' ? 'success' : 'warning'} className="rounded-pill small">{v.status || 'Active'}</Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
              <h5 className="fw-bold mb-0 d-flex align-items-center"><DollarSign size={20} className="me-2" style={{ color: '#6366f1' }} /> Procedures Logged</h5>
              {activeVisit && <Button size="sm" variant="success" onClick={() => setShowProcModal(true)}><Plus size={14} /> Add</Button>}
            </Card.Header>
            <Card.Body style={{ maxHeight: 300, overflowY: 'auto' }}>
              {!activeVisit ? <div className="text-center py-4 text-muted"><ClipboardCheck size={32} className="mb-2 opacity-50" /><p className="small">Select a visit to view procedures.</p></div>
                : proceduresLog.length === 0 ? <div className="text-center py-4 text-muted"><DollarSign size={32} className="mb-2 opacity-50" /><p className="small">No procedures logged yet.</p></div>
                  : <Table hover responsive className="align-middle mb-0 small"><thead className="bg-light"><tr><th>Code</th><th>Eye</th><th>IOL</th><th className="text-end">Fee</th></tr></thead>
                    <tbody>{proceduresLog.map(p => (<tr key={p.id}><td className="fw-semibold font-monospace">{p.procedure_code}</td><td>{p.eye || '—'}</td><td>{p.iol_model || '—'}</td><td className="fw-bold text-end" style={{ color: '#6366f1' }}>₹{(parseFloat(p.fee) || 0).toLocaleString()}</td></tr>))}</tbody></Table>}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Biometry Records */}
      <Card className="border-0 shadow-sm rounded-3 bg-white">
        <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
          <div><h5 className="fw-bold mb-0 d-flex align-items-center"><Activity size={20} className="me-2" style={{ color: '#6366f1' }} /> IOL Master Biometry Records</h5><small className="text-muted">Axial length, keratometry, ACD & IOL power calculations</small></div>
          <Button size="sm" disabled={!selectedPatient} onClick={() => setShowBiometryModal(true)} style={{ backgroundColor: '#6366f1', borderColor: '#6366f1' }}><Plus size={14} /> New Biometry</Button>
        </Card.Header>
        <Card.Body className="p-0">
          {biometryRecords.length === 0 ? <div className="text-center py-4 text-muted"><Activity size={36} className="mb-2 opacity-50" /><p>No biometry records found for this patient.</p></div> :
            <Table hover responsive className="align-middle mb-0"><thead className="bg-light"><tr><th>Date</th><th>AL OD</th><th>AL OS</th><th>K1 OD/OS</th><th>ACD OD</th><th>Formula</th><th>Target Ref</th></tr></thead>
              <tbody>{biometryRecords.map(b => (<tr key={b.id}><td>{b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}</td><td>{b.axial_length_od || '—'}</td><td>{b.axial_length_os || '—'}</td><td>{b.k1_od || '—'} / {b.k1_os || '—'}</td><td>{b.acd_od || '—'}</td><td>{b.iol_formula || '—'}</td><td>{b.target_refraction || '—'}</td></tr>))}</tbody></Table>}
        </Card.Body>
      </Card>

      {/* Modal: New Visit */}
      <Modal show={showVisitModal} onHide={() => setShowVisitModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#6366f1', color: '#fff' }}><Modal.Title className="fw-bold d-flex align-items-center"><Eye size={20} className="me-2" /> New Ophthalmology Visit</Modal.Title></Modal.Header>
        <Form onSubmit={(e) => { e.preventDefault(); handleCreateVisit(); }}>
          <Modal.Body className="p-4">
            <Row className="g-3">
              <Col md={12}><Form.Group><Form.Label className="fw-bold small">Chief Complaint *</Form.Label><Form.Control type="text" placeholder="e.g., Blurred vision in right eye x 3 months" value={visitForm.chief_complaint} onChange={e => setVisitForm(prev => ({ ...prev, chief_complaint: e.target.value }))} required /></Form.Group></Col>
              <Col md={6}><h6 className="fw-bold text-muted">Right Eye (OD)</h6>
                <Form.Group className="mb-2"><Form.Label className="small">Visual Acuity</Form.Label><Form.Control type="text" placeholder="e.g., 6/18" value={visitForm.visual_acuity_od} onChange={e => setVisitForm(prev => ({ ...prev, visual_acuity_od: e.target.value }))} /></Form.Group>
                <Form.Group className="mb-2"><Form.Label className="small">IOP (mmHg)</Form.Label><Form.Control type="text" placeholder="e.g., 14" value={visitForm.iop_od} onChange={e => setVisitForm(prev => ({ ...prev, iop_od: e.target.value }))} /></Form.Group>
                <Form.Group className="mb-2"><Form.Label className="small">Refraction (Sph)</Form.Label><Form.Control type="text" placeholder="e.g., -1.50" value={visitForm.refraction_sph_od} onChange={e => setVisitForm(prev => ({ ...prev, refraction_sph_od: e.target.value }))} /></Form.Group>
                <Form.Group><Form.Label className="small">Cyl / Axis</Form.Label><Form.Control type="text" placeholder="e.g., -0.75 x 90" value={`${visitForm.refraction_cyl_od || ''} ${visitForm.refraction_axis_od ? 'x ' + visitForm.refraction_axis_od : ''}`} onChange={e => {
                  const parts = e.target.value.split('x'); setVisitForm(prev => ({ ...prev, refraction_cyl_od: parts[0]?.trim() || '', refraction_axis_od: parts[1]?.trim() || '' }));
                }} /></Form.Group>
              </Col>
              <Col md={6}><h6 className="fw-bold text-muted">Left Eye (OS)</h6>
                <Form.Group className="mb-2"><Form.Label className="small">Visual Acuity</Form.Label><Form.Control type="text" placeholder="e.g., 6/12" value={visitForm.visual_acuity_os} onChange={e => setVisitForm(prev => ({ ...prev, visual_acuity_os: e.target.value }))} /></Form.Group>
                <Form.Group className="mb-2"><Form.Label className="small">IOP (mmHg)</Form.Label><Form.Control type="text" placeholder="e.g., 12" value={visitForm.iop_os} onChange={e => setVisitForm(prev => ({ ...prev, iop_os: e.target.value }))} /></Form.Group>
                <Form.Group className="mb-2"><Form.Label className="small">Refraction (Sph)</Form.Label><Form.Control type="text" placeholder="e.g., -2.00" value={visitForm.refraction_sph_os} onChange={e => setVisitForm(prev => ({ ...prev, refraction_sph_os: e.target.value }))} /></Form.Group>
                <Form.Group><Form.Label className="small">Cyl / Axis</Form.Label><Form.Control type="text" placeholder="e.g., -1.00 x 75" value={`${visitForm.refraction_cyl_os || ''} ${visitForm.refraction_axis_os ? 'x ' + visitForm.refraction_axis_os : ''}`} onChange={e => {
                  const parts = e.target.value.split('x'); setVisitForm(prev => ({ ...prev, refraction_cyl_os: parts[0]?.trim() || '', refraction_axis_os: parts[1]?.trim() || '' }));
                }} /></Form.Group>
              </Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">Diagnosis</Form.Label><Form.Control type="text" placeholder="e.g., Nuclear Cataract OU" value={visitForm.diagnosis} onChange={e => setVisitForm(prev => ({ ...prev, diagnosis: e.target.value }))} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">Treatment Plan</Form.Label><Form.Control type="text" placeholder="e.g., Phaco + IOL OD" value={visitForm.treatment_plan} onChange={e => setVisitForm(prev => ({ ...prev, treatment_plan: e.target.value }))} /></Form.Group></Col>
              <Col md={12}><Form.Group><Form.Label className="fw-bold small">Notes</Form.Label><Form.Control as="textarea" rows={2} placeholder="Clinical observations..." value={visitForm.notes} onChange={e => setVisitForm(prev => ({ ...prev, notes: e.target.value }))} /></Form.Group></Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light"><Button variant="secondary" onClick={() => setShowVisitModal(false)}>Cancel</Button><Button type="submit" disabled={submitting} style={{ backgroundColor: '#6366f1', borderColor: '#6366f1' }}>{submitting ? <Spinner animation="border" size="sm" /> : 'Create Visit'}</Button></Modal.Footer>
        </Form>
      </Modal>

      {/* Modal: Log Procedure */}
      <Modal show={showProcModal} onHide={() => setShowProcModal(false)} centered size="md">
        <Modal.Header closeButton className="bg-success text-white"><Modal.Title className="fw-bold d-flex align-items-center"><DollarSign size={20} className="me-2" /> Log Ophthalmology Procedure</Modal.Title></Modal.Header>
        <Form onSubmit={(e) => { e.preventDefault(); handleLogProcedure(); }}>
          <Modal.Body className="p-4">
            <Row className="g-3">
              <Col md={8}><Form.Group><Form.Label className="fw-bold small">Procedure *</Form.Label><Form.Select value={procForm.procedure_code} onChange={e => setProcForm(prev => ({ ...prev, procedure_code: e.target.value }))}><option value="">-- Select --</option>{OPHTHALMOLOGY_PROCEDURE_CODES.map(c => (<option key={c.code} value={c.code}>{c.code} — {c.name} (₹{c.fee.toLocaleString()})</option>))}</Form.Select></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Eye</Form.Label><Form.Select value={procForm.eye} onChange={e => setProcForm(prev => ({ ...prev, eye: e.target.value }))}><option value="OD">OD (Right)</option><option value="OS">OS (Left)</option><option value="OU">OU (Both)</option></Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">IOL Power</Form.Label><Form.Control type="text" placeholder="e.g., +20.5 D" value={procForm.iol_power} onChange={e => setProcForm(prev => ({ ...prev, iol_power: e.target.value }))} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">IOL Model</Form.Label><Form.Select value={procForm.iol_model} onChange={e => setProcForm(prev => ({ ...prev, iol_model: e.target.value }))}><option value="">-- Select --</option>{IOL_MODELS.map(m => (<option key={m} value={m}>{m}</option>))}</Form.Select></Form.Group></Col>
              <Col md={12}><Form.Group><Form.Label className="fw-bold small">Notes</Form.Label><Form.Control type="text" placeholder="Complications, special instructions..." value={procForm.notes} onChange={e => setProcForm(prev => ({ ...prev, notes: e.target.value }))} /></Form.Group></Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light"><Button variant="secondary" onClick={() => setShowProcModal(false)}>Cancel</Button><Button variant="success" type="submit" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Log Procedure'}</Button></Modal.Footer>
        </Form>
      </Modal>

      {/* Modal: Biometry */}
      <Modal show={showBiometryModal} onHide={() => setShowBiometryModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#6366f1', color: '#fff' }}><Modal.Title className="fw-bold d-flex align-items-center"><Activity size={20} className="me-2" /> IOL Master Biometry</Modal.Title></Modal.Header>
        <Form onSubmit={(e) => { e.preventDefault(); handleCreateBiometry(); }}>
          <Modal.Body className="p-4">
            <Row className="g-3">
              <Col md={6}><h6 className="fw-bold text-muted">Right Eye (OD)</h6>
                <Form.Group className="mb-2"><Form.Label className="small">Axial Length (mm)</Form.Label><Form.Control type="number" step="0.01" placeholder="e.g., 23.45" value={biometryForm.axial_length_od} onChange={e => setBiometryForm(prev => ({ ...prev, axial_length_od: e.target.value }))} /></Form.Group>
                <Row className="g-2 mb-2"><Col><Form.Label className="small">K1</Form.Label><Form.Control type="number" step="0.01" placeholder="43.50" value={biometryForm.k1_od} onChange={e => setBiometryForm(prev => ({ ...prev, k1_od: e.target.value }))} /></Col><Col><Form.Label className="small">K2</Form.Label><Form.Control type="number" step="0.01" placeholder="44.25" value={biometryForm.k2_od} onChange={e => setBiometryForm(prev => ({ ...prev, k2_od: e.target.value }))} /></Col></Row>
                <Form.Group className="mb-2"><Form.Label className="small">ACD (mm)</Form.Label><Form.Control type="number" step="0.01" placeholder="3.20" value={biometryForm.acd_od} onChange={e => setBiometryForm(prev => ({ ...prev, acd_od: e.target.value }))} /></Form.Group>
                <Form.Group className="mb-2"><Form.Label className="small">Lens Thickness (mm)</Form.Label><Form.Control type="number" step="0.01" placeholder="4.10" value={biometryForm.lens_thickness_od} onChange={e => setBiometryForm(prev => ({ ...prev, lens_thickness_od: e.target.value }))} /></Form.Group>
                <Form.Group><Form.Label className="small">WTW (mm)</Form.Label><Form.Control type="number" step="0.01" placeholder="11.80" value={biometryForm.wtw_od} onChange={e => setBiometryForm(prev => ({ ...prev, wtw_od: e.target.value }))} /></Form.Group>
              </Col>
              <Col md={6}><h6 className="fw-bold text-muted">Left Eye (OS)</h6>
                <Form.Group className="mb-2"><Form.Label className="small">Axial Length (mm)</Form.Label><Form.Control type="number" step="0.01" placeholder="e.g., 23.89" value={biometryForm.axial_length_os} onChange={e => setBiometryForm(prev => ({ ...prev, axial_length_os: e.target.value }))} /></Form.Group>
                <Row className="g-2 mb-2"><Col><Form.Label className="small">K1</Form.Label><Form.Control type="number" step="0.01" placeholder="43.20" value={biometryForm.k1_os} onChange={e => setBiometryForm(prev => ({ ...prev, k1_os: e.target.value }))} /></Col><Col><Form.Label className="small">K2</Form.Label><Form.Control type="number" step="0.01" placeholder="44.00" value={biometryForm.k2_os} onChange={e => setBiometryForm(prev => ({ ...prev, k2_os: e.target.value }))} /></Col></Row>
                <Form.Group className="mb-2"><Form.Label className="small">ACD (mm)</Form.Label><Form.Control type="number" step="0.01" placeholder="3.25" value={biometryForm.acd_os} onChange={e => setBiometryForm(prev => ({ ...prev, acd_os: e.target.value }))} /></Form.Group>
                <Form.Group className="mb-2"><Form.Label className="small">Lens Thickness (mm)</Form.Label><Form.Control type="number" step="0.01" placeholder="4.05" value={biometryForm.lens_thickness_os} onChange={e => setBiometryForm(prev => ({ ...prev, lens_thickness_os: e.target.value }))} /></Form.Group>
                <Form.Group><Form.Label className="small">WTW (mm)</Form.Label><Form.Control type="number" step="0.01" placeholder="11.75" value={biometryForm.wtw_os} onChange={e => setBiometryForm(prev => ({ ...prev, wtw_os: e.target.value }))} /></Form.Group>
              </Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">IOL Formula</Form.Label><Form.Select value={biometryForm.iol_formula} onChange={e => setBiometryForm(prev => ({ ...prev, iol_formula: e.target.value }))}>{IOL_FORMULAS.map(f => (<option key={f} value={f}>{f}</option>))}</Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">Target Refraction</Form.Label><Form.Control type="text" placeholder="e.g., -0.25 D" value={biometryForm.target_refraction} onChange={e => setBiometryForm(prev => ({ ...prev, target_refraction: e.target.value }))} /></Form.Group></Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light"><Button variant="secondary" onClick={() => setShowBiometryModal(false)}>Cancel</Button><Button type="submit" disabled={submitting} style={{ backgroundColor: '#6366f1', borderColor: '#6366f1' }}>{submitting ? <Spinner animation="border" size="sm" /> : 'Save Biometry'}</Button></Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default OphthalmologyDashboard;