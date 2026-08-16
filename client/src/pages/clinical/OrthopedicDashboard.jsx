import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Button, Badge, Form, Table,
  Modal, Alert, Spinner, Tabs, Tab, Toast, ToastContainer,
  ListGroup, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import {
  Bone, Search, Plus, Save, XCircle, CheckCircle2,
  Clock, FileText, DollarSign, Activity, RefreshCw,
  ClipboardCheck, User, Calendar, Filter, Stethoscope
} from 'lucide-react';
import api from '../../utils/axiosInstance';
import StatsCard from '../../components/ui/StatsCard';

// ─── Orthopedic procedure codes (common in India) ───
const ORTHO_PROCEDURE_CODES = [
  { code: 'OR001', name: 'Total Hip Replacement (THR)', fee: 150000, category: 'Arthroplasty' },
  { code: 'OR002', name: 'Total Knee Replacement (TKR)', fee: 135000, category: 'Arthroplasty' },
  { code: 'OR003', name: 'Shoulder Arthroplasty', fee: 120000, category: 'Arthroplasty' },
  { code: 'OR004', name: 'ACL Reconstruction', fee: 65000, category: 'Arthroscopic' },
  { code: 'OR005', name: 'Arthroscopic Meniscectomy', fee: 40000, category: 'Arthroscopic' },
  { code: 'OR006', name: 'Rotator Cuff Repair - Arthroscopic', fee: 55000, category: 'Arthroscopic' },
  { code: 'OR007', name: 'Interlocking Nail - Femur', fee: 45000, category: 'Trauma' },
  { code: 'OR008', name: 'ORIF - Distal Radius', fee: 30000, category: 'Trauma' },
  { code: 'OR009', name: 'ORIF - Ankle', fee: 35000, category: 'Trauma' },
  { code: 'OR010', name: 'Spine Instrumentation (1 level)', fee: 180000, category: 'Spine' },
  { code: 'OR011', name: 'Microdiscectomy', fee: 55000, category: 'Spine' },
  { code: 'OR012', name: 'Closed Reduction + POP Cast', fee: 5000, category: 'Trauma' },
  { code: 'OR013', name: 'External Fixator Application', fee: 25000, category: 'Trauma' },
  { code: 'OR014', name: 'Pedicle Screw Fixation (2 level)', fee: 220000, category: 'Spine' },
  { code: 'OR015', name: 'Hemiarthroplasty - Hip', fee: 80000, category: 'Arthroplasty' },
];

// ─── Implant catalog ───
const IMPLANT_TYPES = [
  'Plates - DCP', 'Plates - LCP', 'Plates - Reconstruction', 'Plates - T-Buttress',
  'Screws - Cortical', 'Screws - Cancellous', 'Screws - Locking',
  'Intramedullary Nail - Femur', 'Intramedullary Nail - Tibia', 'Intramedullary Nail - Humerus',
  'Total Knee Prosthesis - PCL Retaining', 'Total Knee Prosthesis - PS',
  'Hip Stem - Cemented', 'Hip Stem - Uncemented', 'Acetabular Cup', 'Femoral Head',
  'Spine Pedicle Screws', 'Spine Rods', 'Interbody Cage',
  'External Fixator Components', 'K-Wires', 'Steinmann Pins',
  'Suture Anchors',
];

const JOINT_OPTIONS = ['Hip', 'Knee', 'Shoulder', 'Elbow', 'Ankle', 'Wrist', 'Spine - Cervical', 'Spine - Thoracic', 'Spine - Lumbar'];
const SIDE_OPTIONS = ['Left', 'Right', 'Bilateral'];
const SURGICAL_APPROACHES = ['Anterior', 'Posterior', 'Lateral', 'Medial', 'Minimally Invasive', 'Arthroscopic'];

const OrthopedicDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [activeVisit, setActiveVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proceduresLog, setProceduresLog] = useState([]);
  const [implants, setImplants] = useState([]);
  const [physioOrders, setPhysioOrders] = useState([]);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showProcModal, setShowProcModal] = useState(false);
  const [showImplantModal, setShowImplantModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  // Visit form
  const [visitForm, setVisitForm] = useState({
    chief_complaint: '',
    joint_affected: '',
    side: 'Left',
    mechanism_of_injury: '',
    pain_score: '0',
    swelling: '',
    deformity: '',
    range_of_motion: '{}',
    xray_findings: '',
    mri_findings: '',
    diagnosis: '',
    treatment_plan: '',
    notes: '',
  });

  // Procedure form
  const [procForm, setProcForm] = useState({
    procedure_code: '',
    joint: 'Knee',
    side: 'Left',
    surgical_approach: 'Minimally Invasive',
    implants_used: '[]',
    tourniquet_time_min: '',
    blood_loss_ml: '',
    complications: '',
    notes: '',
  });

  // Implant form
  const [implantForm, setImplantForm] = useState({
    implant_type: '',
    manufacturer: '',
    model: '',
    size: '',
    material: '',
    lot_batch: '',
    quantity: '1',
    is_sterile: true,
    expiry_date: '',
    notes: '',
  });

  const [stats, setStats] = useState({
    activeVisits: 0,
    proceduresToday: 0,
    availableImplants: 0,
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
    } catch (err) { console.error('Failed to load patients', err); }
  }, []);

  const fetchVisits = useCallback(async (patientId) => {
    if (!patientId) return;
    try {
      const res = await api.get(`/api/orthopedic/visits?patient_id=${patientId}`);
      const data = res.data?.data || res.data || [];
      setVisits(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Failed to load orthopedic visits', err); }
  }, []);

  const fetchProcedures = useCallback(async (visitId) => {
    if (!visitId) return;
    try {
      const res = await api.get(`/api/orthopedic/procedures?visit_id=${visitId}`);
      const data = res.data?.data || res.data || [];
      setProceduresLog(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Failed to load procedures', err); setProceduresLog([]); }
  }, []);

  const fetchImplants = useCallback(async () => {
    try {
      const res = await api.get('/api/orthopedic/implants?limit=60');
      const data = res.data?.data || res.data || [];
      setImplants(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Failed to load implants', err); }
  }, []);

  const fetchPhysioOrders = useCallback(async (visitId) => {
    if (!visitId) return;
    try {
      const res = await api.get(`/api/orthopedic/physio-orders?visit_id=${visitId}`);
      const data = res.data?.data || res.data || [];
      setPhysioOrders(Array.isArray(data) ? data : []);
    } catch (err) { setPhysioOrders([]); }
  }, []);

  const recalcStats = useCallback(() => {
    const active = visits.filter(v => v.status !== 'Completed' && v.status !== 'Cancelled').length;
    const today = new Date().toISOString().slice(0, 10);
    const procsToday = proceduresLog.filter(p => p.created_at && p.created_at.startsWith(today)).length;
    const available = implants.filter(i => i.quantity > 0).length;
    const fees = proceduresLog.reduce((sum, p) => sum + (parseFloat(p.fee) || 0), 0);
    setStats({ activeVisits: active, proceduresToday: procsToday, availableImplants: available, totalFeesToday: fees });
  }, [visits, proceduresLog, implants]);

  useEffect(() => { (async () => { setLoading(true); await fetchPatients(); await fetchImplants(); setLoading(false); })(); }, [fetchPatients, fetchImplants]);
  useEffect(() => { if (selectedPatient) fetchVisits(selectedPatient.id); }, [selectedPatient, fetchVisits]);
  useEffect(() => { if (activeVisit) { fetchProcedures(activeVisit.id); fetchPhysioOrders(activeVisit.id); } }, [activeVisit, fetchProcedures, fetchPhysioOrders]);
  useEffect(() => { recalcStats(); }, [recalcStats]);

  const handlePatientSelect = (patient) => { setSelectedPatient(patient); setActiveVisit(null); setProceduresLog([]); };

  const handleCreateVisit = async () => {
    if (!selectedPatient || !visitForm.chief_complaint) { showToast('Please select a patient and enter chief complaint.', 'warning'); return; }
    setSubmitting(true);
    try {
      const payload = { patient_id: selectedPatient.id, ...visitForm };
      const res = await api.post('/api/orthopedic/visits', payload);
      showToast('Orthopedic visit created successfully!');
      setShowVisitModal(false);
      setActiveVisit(res.data?.data || res.data);
      fetchVisits(selectedPatient.id);
    } catch (err) { showToast(err.response?.data?.message || 'Failed to create visit', 'danger'); } finally { setSubmitting(false); }
  };

  const handleLogProcedure = async () => {
    if (!activeVisit || !procForm.procedure_code) { showToast('Select an active visit and procedure code.', 'warning'); return; }
    setSubmitting(true);
    try {
      const payload = { visit_id: activeVisit.id, ...procForm };
      const res = await api.post('/api/orthopedic/procedures', payload);
      setProceduresLog(prev => [res.data?.data || res.data, ...prev]);
      showToast('Procedure logged successfully!');
      setShowProcModal(false);
      setProcForm({ procedure_code: '', joint: 'Knee', side: 'Left', surgical_approach: 'Minimally Invasive', implants_used: '[]', tourniquet_time_min: '', blood_loss_ml: '', complications: '', notes: '' });
    } catch (err) { showToast(err.response?.data?.message || 'Failed to log procedure', 'danger'); } finally { setSubmitting(false); }
  };

  const handleCreateImplant = async () => {
    if (!implantForm.implant_type) { showToast('Implant type is required.', 'warning'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/api/orthopedic/implants', implantForm);
      setImplants(prev => [res.data?.data || res.data, ...prev]);
      showToast('Implant added to inventory successfully!');
      setShowImplantModal(false);
      setImplantForm({ implant_type: '', manufacturer: '', model: '', size: '', material: '', lot_batch: '', quantity: '1', is_sterile: true, expiry_date: '', notes: '' });
    } catch (err) { showToast(err.response?.data?.message || 'Failed to add implant', 'danger'); } finally { setSubmitting(false); }
  };

  if (loading) {
    return <Container fluid className="py-5 text-center bg-light min-vh-100"><Spinner animation="border" variant="primary" /><p className="mt-3 text-muted">Loading orthopedic module...</p></Container>;
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
            <div className="rounded-3 p-3 me-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: 54, height: 54, backgroundColor: '#f97316', color: '#fff' }}>
              <Bone size={28} />
            </div>
            <div><h3 className="fw-bold mb-0 text-dark">Orthopedic Command Center</h3><p className="text-muted small mb-0">Joint replacements • Trauma • Spine • Implant inventory</p></div>
          </div>
        </Col>
        <Col md={6}>
          <div className="d-flex flex-wrap justify-content-md-end gap-2">
            <Form.Select size="sm" style={{ maxWidth: 260 }} value={selectedPatient?.id || ''} onChange={(e) => { const p = patients.find(pt => String(pt.id) === e.target.value); if (p) handlePatientSelect(p); }}>
              <option value="">-- Select Patient --</option>
              {patients.map(p => (<option key={p.id} value={p.id}>{p.name || `Patient #${p.id}`} ({p.uhid || p.id})</option>))}
            </Form.Select>
            <Button variant="outline-secondary" size="sm" onClick={() => { if (selectedPatient) fetchVisits(selectedPatient.id); }}><RefreshCw size={15} /> Refresh</Button>
            <Button variant="primary" size="sm" disabled={!selectedPatient} onClick={() => setShowVisitModal(true)} style={{ backgroundColor: '#f97316', borderColor: '#f97316' }}><Plus size={15} /> New Visit</Button>
            <Button variant="outline-primary" size="sm" onClick={() => setShowImplantModal(true)} style={{ borderColor: '#f97316', color: '#f97316' }}><Bone size={15} /> Add Implant</Button>
            <Button variant="success" size="sm" disabled={!activeVisit} onClick={() => setShowProcModal(true)}><DollarSign size={15} /> Log Procedure</Button>
          </div>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={3} sm={6}><StatsCard title="Active Visits" value={stats.activeVisits} icon={<Stethoscope />} variant="info" /></Col>
        <Col md={3} sm={6}><StatsCard title="Procedures Today" value={stats.proceduresToday} icon={<DollarSign />} variant="success" /></Col>
        <Col md={3} sm={6}><StatsCard title="Available Implants" value={stats.availableImplants} icon={<Bone />} variant="warning" /></Col>
        <Col md={3} sm={6}><StatsCard title="Fees Today (₹)" value={`₹${stats.totalFeesToday.toLocaleString()}`} icon={<CheckCircle2 />} variant="purple" /></Col>
      </Row>

      {selectedPatient && (
        <Card className="border-0 shadow-sm mb-4 rounded-3 bg-white" style={{ borderLeft: '5px solid #f97316' }}>
          <Card.Body className="py-3 px-4">
            <Row className="align-items-center g-3">
              <Col md={3}><div className="d-flex align-items-center"><User size={20} className="me-2" style={{ color: '#f97316' }} /><div><div className="text-uppercase text-muted small fw-bold">Patient</div><div className="fw-bold">{selectedPatient.name || `#${selectedPatient.id}`}</div></div></div></Col>
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
            <Card.Header className="bg-white py-3 px-4 border-bottom"><h5 className="fw-bold mb-0 d-flex align-items-center"><Bone size={20} className="me-2" style={{ color: '#f97316' }} /> Orthopedic Visits</h5></Card.Header>
            <Card.Body style={{ maxHeight: 300, overflowY: 'auto' }}>
              {!selectedPatient ? <div className="text-center py-4 text-muted"><User size={32} className="mb-2 opacity-50" /><p className="small">Select a patient to view visits.</p></div>
                : visits.length === 0 ? <div className="text-center py-4 text-muted"><FileText size={32} className="mb-2 opacity-50" /><p className="small">No orthopedic visits recorded yet.</p></div>
                  : <ListGroup variant="flush">{visits.map(v => (
                    <ListGroup.Item key={v.id} action active={activeVisit?.id === v.id} onClick={() => setActiveVisit(v)}
                      className="d-flex justify-content-between align-items-center"
                      style={{ borderLeft: activeVisit?.id === v.id ? '4px solid #f97316' : '4px solid transparent', backgroundColor: activeVisit?.id === v.id ? '#fff7ed' : 'transparent' }}>
                      <div><div className="fw-semibold small">{v.chief_complaint?.slice(0, 40) || `Visit #${v.id}`}</div>
                        <div className="text-muted small d-flex align-items-center gap-2"><Clock size={12} /> {v.created_at ? new Date(v.created_at).toLocaleDateString() : '—'}<span>· {v.joint_affected} {v.side}</span></div></div>
                      <Badge bg={v.status === 'Completed' ? 'success' : 'warning'} className="rounded-pill small">{v.status || 'Active'}</Badge>
                    </ListGroup.Item>
                  ))}</ListGroup>}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
              <h5 className="fw-bold mb-0 d-flex align-items-center"><DollarSign size={20} className="me-2" style={{ color: '#f97316' }} /> Procedures Logged</h5>
              {activeVisit && <Button size="sm" variant="success" onClick={() => setShowProcModal(true)}><Plus size={14} /> Add</Button>}
            </Card.Header>
            <Card.Body style={{ maxHeight: 300, overflowY: 'auto' }}>
              {!activeVisit ? <div className="text-center py-4 text-muted"><ClipboardCheck size={32} className="mb-2 opacity-50" /><p className="small">Select a visit to view procedures.</p></div>
                : proceduresLog.length === 0 ? <div className="text-center py-4 text-muted"><DollarSign size={32} className="mb-2 opacity-50" /><p className="small">No procedures logged yet.</p></div>
                  : <Table hover responsive className="align-middle mb-0 small"><thead className="bg-light"><tr><th>Code</th><th>Joint</th><th>Approach</th><th className="text-end">Fee</th></tr></thead>
                    <tbody>{proceduresLog.map(p => (<tr key={p.id}><td className="fw-semibold font-monospace">{p.procedure_code}</td><td>{p.joint} ({p.side})</td><td>{p.surgical_approach || '—'}</td><td className="fw-bold text-end" style={{ color: '#f97316' }}>₹{(parseFloat(p.fee) || 0).toLocaleString()}</td></tr>))}</tbody></Table>}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Implant Inventory */}
      <Card className="border-0 shadow-sm rounded-3 bg-white">
        <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
          <div><h5 className="fw-bold mb-0 d-flex align-items-center"><Bone size={20} className="me-2" style={{ color: '#f97316' }} /> Sterile Implant Inventory</h5><small className="text-muted">Plates, screws, joint prostheses & spine instrumentation</small></div>
          <Button size="sm" onClick={() => setShowImplantModal(true)} style={{ backgroundColor: '#f97316', borderColor: '#f97316' }}><Plus size={14} /> Add Implant</Button>
        </Card.Header>
        <Card.Body className="p-0">
          {implants.length === 0 ? <div className="text-center py-4 text-muted"><Bone size={36} className="mb-2 opacity-50" /><p>No implants in inventory.</p></div> :
            <Table hover responsive className="align-middle mb-0"><thead className="bg-light"><tr><th>Type</th><th>Manuf. / Model</th><th>Size</th><th>Lot/Batch</th><th>Qty</th><th>Sterile</th><th>Expiry</th></tr></thead>
              <tbody>{implants.map(i => (<tr key={i.id}><td className="fw-semibold">{i.implant_type}</td><td>{i.manufacturer} {i.model}</td><td>{i.size || '—'}</td><td className="font-monospace small">{i.lot_batch || '—'}</td><td>{i.quantity}</td><td>{i.is_sterile ? <CheckCircle2 size={16} className="text-success" /> : <XCircle size={16} className="text-danger" />}</td><td>{i.expiry_date ? new Date(i.expiry_date).toLocaleDateString() : '—'}</td></tr>))}</tbody></Table>}
        </Card.Body>
      </Card>

      {/* Modal: New Visit */}
      <Modal show={showVisitModal} onHide={() => setShowVisitModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: '#f97316', color: '#fff' }}><Modal.Title className="fw-bold d-flex align-items-center"><Bone size={20} className="me-2" /> New Orthopedic Visit</Modal.Title></Modal.Header>
        <Form onSubmit={(e) => { e.preventDefault(); handleCreateVisit(); }}>
          <Modal.Body className="p-4">
            <Row className="g-3">
              <Col md={12}><Form.Group><Form.Label className="fw-bold small">Chief Complaint *</Form.Label><Form.Control type="text" placeholder="e.g., Left knee pain and swelling after fall" value={visitForm.chief_complaint} onChange={e => setVisitForm(prev => ({ ...prev, chief_complaint: e.target.value }))} required /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Joint Affected</Form.Label><Form.Select value={visitForm.joint_affected} onChange={e => setVisitForm(prev => ({ ...prev, joint_affected: e.target.value }))}><option value="">-- Select --</option>{JOINT_OPTIONS.map(j => (<option key={j} value={j}>{j}</option>))}</Form.Select></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Side</Form.Label><Form.Select value={visitForm.side} onChange={e => setVisitForm(prev => ({ ...prev, side: e.target.value }))}>{SIDE_OPTIONS.map(s => (<option key={s} value={s}>{s}</option>))}</Form.Select></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Pain Score (NRS 0-10)</Form.Label><Form.Control type="number" min="0" max="10" value={visitForm.pain_score} onChange={e => setVisitForm(prev => ({ ...prev, pain_score: e.target.value }))} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">Mechanism of Injury</Form.Label><Form.Control type="text" placeholder="e.g., Fall from height, RTA, sports" value={visitForm.mechanism_of_injury} onChange={e => setVisitForm(prev => ({ ...prev, mechanism_of_injury: e.target.value }))} /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label className="fw-bold small">Swelling</Form.Label><Form.Select value={visitForm.swelling} onChange={e => setVisitForm(prev => ({ ...prev, swelling: e.target.value }))}><option value="">-- Select --</option><option value="None">None</option><option value="Mild">Mild</option><option value="Moderate">Moderate</option><option value="Severe">Severe</option></Form.Select></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label className="fw-bold small">Deformity</Form.Label><Form.Select value={visitForm.deformity} onChange={e => setVisitForm(prev => ({ ...prev, deformity: e.target.value }))}><option value="">-- Select --</option><option value="None">None</option><option value="Visible">Visible</option><option value="Gross">Gross</option></Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">X-Ray Findings</Form.Label><Form.Control type="text" placeholder="e.g., Comminuted fracture distal radius" value={visitForm.xray_findings} onChange={e => setVisitForm(prev => ({ ...prev, xray_findings: e.target.value }))} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">MRI Findings</Form.Label><Form.Control type="text" placeholder="e.g., Complete ACL tear" value={visitForm.mri_findings} onChange={e => setVisitForm(prev => ({ ...prev, mri_findings: e.target.value }))} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">Diagnosis</Form.Label><Form.Control type="text" placeholder="e.g., ACL complete tear, Left knee" value={visitForm.diagnosis} onChange={e => setVisitForm(prev => ({ ...prev, diagnosis: e.target.value }))} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">Treatment Plan</Form.Label><Form.Control type="text" placeholder="e.g., Arthroscopic ACL reconstruction" value={visitForm.treatment_plan} onChange={e => setVisitForm(prev => ({ ...prev, treatment_plan: e.target.value }))} /></Form.Group></Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light"><Button variant="secondary" onClick={() => setShowVisitModal(false)}>Cancel</Button><Button type="submit" disabled={submitting} style={{ backgroundColor: '#f97316', borderColor: '#f97316' }}>{submitting ? <Spinner animation="border" size="sm" /> : 'Create Visit'}</Button></Modal.Footer>
        </Form>
      </Modal>

      {/* Modal: Log Procedure */}
      <Modal show={showProcModal} onHide={() => setShowProcModal(false)} centered size="md">
        <Modal.Header closeButton className="bg-success text-white"><Modal.Title className="fw-bold d-flex align-items-center"><DollarSign size={20} className="me-2" /> Log Orthopedic Procedure</Modal.Title></Modal.Header>
        <Form onSubmit={(e) => { e.preventDefault(); handleLogProcedure(); }}>
          <Modal.Body className="p-4">
            <Row className="g-3">
              <Col md={8}><Form.Group><Form.Label className="fw-bold small">Procedure *</Form.Label><Form.Select value={procForm.procedure_code} onChange={e => setProcForm(prev => ({ ...prev, procedure_code: e.target.value }))}><option value="">-- Select --</option>{ORTHO_PROCEDURE_CODES.map(c => (<option key={c.code} value={c.code}>{c.code} — {c.name} (₹{c.fee.toLocaleString()})</option>))}</Form.Select></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Joint</Form.Label><Form.Select value={procForm.joint} onChange={e => setProcForm(prev => ({ ...prev, joint: e.target.value }))}>{JOINT_OPTIONS.map(j => (<option key={j} value={j}>{j}</option>))}</Form.Select></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Side</Form.Label><Form.Select value={procForm.side} onChange={e => setProcForm(prev => ({ ...prev, side: e.target.value }))}>{SIDE_OPTIONS.map(s => (<option key={s} value={s}>{s}</option>))}</Form.Select></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Surgical Approach</Form.Label><Form.Select value={procForm.surgical_approach} onChange={e => setProcForm(prev => ({ ...prev, surgical_approach: e.target.value }))}>{SURGICAL_APPROACHES.map(a => (<option key={a} value={a}>{a}</option>))}</Form.Select></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Tourniquet Time (min)</Form.Label><Form.Control type="number" placeholder="e.g., 45" value={procForm.tourniquet_time_min} onChange={e => setProcForm(prev => ({ ...prev, tourniquet_time_min: e.target.value }))} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Blood Loss (ml)</Form.Label><Form.Control type="number" placeholder="e.g., 150" value={procForm.blood_loss_ml} onChange={e => setProcForm(prev => ({ ...prev, blood_loss_ml: e.target.value }))} /></Form.Group></Col>
              <Col md={8}><Form.Group><Form.Label className="fw-bold small">Complications</Form.Label><Form.Control type="text" placeholder="e.g., None; minimal adhesions" value={procForm.complications} onChange={e => setProcForm(prev => ({ ...prev, complications: e.target.value }))} /></Form.Group></Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light"><Button variant="secondary" onClick={() => setShowProcModal(false)}>Cancel</Button><Button variant="success" type="submit" disabled={submitting}>{submitting ? <Spinner animation="border" size="sm" /> : 'Log Procedure'}</Button></Modal.Footer>
        </Form>
      </Modal>

      {/* Modal: Add Implant */}
      <Modal show={showImplantModal} onHide={() => setShowImplantModal(false)} centered size="md">
        <Modal.Header closeButton style={{ backgroundColor: '#f97316', color: '#fff' }}><Modal.Title className="fw-bold d-flex align-items-center"><Bone size={20} className="me-2" /> Add Implant to Inventory</Modal.Title></Modal.Header>
        <Form onSubmit={(e) => { e.preventDefault(); handleCreateImplant(); }}>
          <Modal.Body className="p-4">
            <Row className="g-3">
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">Implant Type *</Form.Label><Form.Select value={implantForm.implant_type} onChange={e => setImplantForm(prev => ({ ...prev, implant_type: e.target.value }))}><option value="">-- Select --</option>{IMPLANT_TYPES.map(t => (<option key={t} value={t}>{t}</option>))}</Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">Manufacturer</Form.Label><Form.Control type="text" placeholder="e.g., Depuy Synthes" value={implantForm.manufacturer} onChange={e => setImplantForm(prev => ({ ...prev, manufacturer: e.target.value }))} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Model</Form.Label><Form.Control type="text" placeholder="Model name/no" value={implantForm.model} onChange={e => setImplantForm(prev => ({ ...prev, model: e.target.value }))} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Size</Form.Label><Form.Control type="text" placeholder="e.g., 4.5mm x 10" value={implantForm.size} onChange={e => setImplantForm(prev => ({ ...prev, size: e.target.value }))} /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label className="fw-bold small">Material</Form.Label><Form.Control type="text" placeholder="e.g., Titanium, SS316L" value={implantForm.material} onChange={e => setImplantForm(prev => ({ ...prev, material: e.target.value }))} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">Lot / Batch #</Form.Label><Form.Control type="text" placeholder="e.g., LOT-2026-0451" value={implantForm.lot_batch} onChange={e => setImplantForm(prev => ({ ...prev, lot_batch: e.target.value }))} /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label className="fw-bold small">Quantity</Form.Label><Form.Control type="number" min="1" value={implantForm.quantity} onChange={e => setImplantForm(prev => ({ ...prev, quantity: e.target.value }))} /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label className="fw-bold small">Sterile</Form.Label><Form.Check type="switch" checked={implantForm.is_sterile} onChange={e => setImplantForm(prev => ({ ...prev, is_sterile: e.target.checked }))} label={implantForm.is_sterile ? 'Yes' : 'No'} /></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label className="fw-bold small">Expiry Date</Form.Label><Form.Control type="date" value={implantForm.expiry_date} onChange={e => setImplantForm(prev => ({ ...prev, expiry_date: e.target.value }))} /></Form.Group></Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light"><Button variant="secondary" onClick={() => setShowImplantModal(false)}>Cancel</Button><Button type="submit" disabled={submitting} style={{ backgroundColor: '#f97316', borderColor: '#f97316' }}>{submitting ? <Spinner animation="border" size="sm" /> : 'Add Implant'}</Button></Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default OrthopedicDashboard;