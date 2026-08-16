import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Row, Col, Card, Button, Badge, Form, Table,
  Modal, Alert, Spinner, InputGroup, Tabs, Tab, Toast, ToastContainer,
  ListGroup, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import {
  Stethoscope, Search, Plus, Save, XCircle, CheckCircle2,
  Clock, FileText, DollarSign, FlaskConical, AlertTriangle,
  ChevronRight, User, Calendar, Activity, RefreshCw,
  ClipboardCheck, ShoppingCart, LogOut, Trash2,
  ArrowRightLeft, PenTool, Zap, Filter
} from 'lucide-react';
import api from '../../utils/axiosInstance';
import StatsCard from '../../components/ui/StatsCard';

// ─── Dental procedure codes catalog (ADA CDT codes common in India) ───
const DENTAL_PROCEDURE_CODES = [
  { code: 'D0120', name: 'Periodic Oral Evaluation', fee: 500, category: 'Diagnostic' },
  { code: 'D0140', name: 'Limited Oral Exam – Problem Focused', fee: 400, category: 'Diagnostic' },
  { code: 'D0150', name: 'Comprehensive Oral Exam', fee: 800, category: 'Diagnostic' },
  { code: 'D0210', name: 'Intraoral – Periapical Radiograph', fee: 250, category: 'Radiology' },
  { code: 'D0220', name: 'Intraoral – Periapical (each additional)', fee: 150, category: 'Radiology' },
  { code: 'D0272', name: 'Bitewings – Two Films', fee: 450, category: 'Radiology' },
  { code: 'D0330', name: 'Panoramic Radiograph (OPG)', fee: 700, category: 'Radiology' },
  { code: 'D0367', name: 'Cone Beam CT (CBCT)', fee: 2500, category: 'Radiology' },
  { code: 'D1110', name: 'Prophylaxis – Adult (Scaling)', fee: 1200, category: 'Preventive' },
  { code: 'D1120', name: 'Prophylaxis – Child', fee: 700, category: 'Preventive' },
  { code: 'D1208', name: 'Topical Fluoride Application', fee: 400, category: 'Preventive' },
  { code: 'D1351', name: 'Sealant – per tooth', fee: 600, category: 'Preventive' },
  { code: 'D2140', name: 'Amalgam Restoration – 1 Surface', fee: 1000, category: 'Restorative' },
  { code: 'D2150', name: 'Amalgam Restoration – 2 Surfaces', fee: 1400, category: 'Restorative' },
  { code: 'D2160', name: 'Amalgam Restoration – 3 Surfaces', fee: 1800, category: 'Restorative' },
  { code: 'D2330', name: 'Composite Restoration – 1 Surface', fee: 1500, category: 'Restorative' },
  { code: 'D2391', name: 'Composite Restoration – 3 Surfaces', fee: 2400, category: 'Restorative' },
  { code: 'D2751', name: 'Crown – PFM (Porcelain Fused to Metal)', fee: 6000, category: 'Prosthodontic' },
  { code: 'D2740', name: 'Crown – All Ceramic (Zirconia)', fee: 10000, category: 'Prosthodontic' },
  { code: 'D3310', name: 'Root Canal Therapy – Anterior', fee: 3000, category: 'Endodontic' },
  { code: 'D3320', name: 'Root Canal Therapy – Bicuspid', fee: 4000, category: 'Endodontic' },
  { code: 'D3330', name: 'Root Canal Therapy – Molar', fee: 6000, category: 'Endodontic' },
  { code: 'D4341', name: 'Periodontal Scaling & Root Planing (per quad)', fee: 1800, category: 'Periodontic' },
  { code: 'D7140', name: 'Simple Extraction', fee: 800, category: 'Oral Surgery' },
  { code: 'D7210', name: 'Surgical Extraction', fee: 2500, category: 'Oral Surgery' },
  { code: 'D7240', name: 'Impacted Tooth Removal', fee: 4500, category: 'Oral Surgery' },
  { code: 'D5110', name: 'Complete Upper Denture', fee: 12000, category: 'Prosthodontic' },
  { code: 'D5120', name: 'Complete Lower Denture', fee: 12000, category: 'Prosthodontic' },
  { code: 'D5211', name: 'Partial Upper Denture (Cast)', fee: 9000, category: 'Prosthodontic' },
  { code: 'D6010', name: 'Implant – Surgical Placement (per fixture)', fee: 20000, category: 'Implantology' },
  { code: 'D6056', name: 'Implant Abutment', fee: 5000, category: 'Implantology' },
  { code: 'D7953', name: 'Bone Graft (per site)', fee: 8000, category: 'Oral Surgery' },
  { code: 'D9110', name: 'Palliative (Emergency) Treatment', fee: 500, category: 'Adjunctive' },
  { code: 'D9310', name: 'Consultation / Second Opinion', fee: 600, category: 'Diagnostic' },
];

// ─── Tooth condition colors for odontogram ───
const CONDITION_CONFIG = {
  healthy: { label: 'Healthy', color: '#86efac', textColor: '#14532d', icon: CheckCircle2 },
  caries: { label: 'Caries / Decay', color: '#f87171', textColor: '#7f1d1d', icon: AlertTriangle },
  missing: { label: 'Missing', color: '#e5e7eb', textColor: '#374151', icon: XCircle },
  root_canal: { label: 'Root Canal Treated', color: '#fbbf24', textColor: '#78350f', icon: Zap },
  restoration: { label: 'Restoration / Filling', color: '#67e8f9', textColor: '#164e63', icon: PenTool },
  crown_bridge: { label: 'Crown / Bridge', color: '#c084fc', textColor: '#4c1d95', icon: ArrowRightLeft },
  implant: { label: 'Implant', color: '#a3a3a3', textColor: '#171717', icon: Activity },
  extraction_pending: { label: 'Extraction Advised', color: '#fb923c', textColor: '#7c2d12', icon: Trash2 },
};

// ─── FDI tooth numbering quadrants ───
const QUADRANTS = {
  upperRight: { label: 'Upper Right (UR)', fdiStart: 11, fdiEnd: 18, teeth: [11, 12, 13, 14, 15, 16, 17, 18], quadrant: 'UR' },
  upperLeft: { label: 'Upper Left (UL)', fdiStart: 21, fdiEnd: 28, teeth: [21, 22, 23, 24, 25, 26, 27, 28], quadrant: 'UL' },
  lowerRight: { label: 'Lower Right (LR)', fdiStart: 41, fdiEnd: 48, teeth: [41, 42, 43, 44, 45, 46, 47, 48], quadrant: 'LR' },
  lowerLeft: { label: 'Lower Left (LL)', fdiStart: 31, fdiEnd: 38, teeth: [31, 32, 33, 34, 35, 36, 37, 38], quadrant: 'LL' },
};

// ─── Restauration type options for lab orders ───
const RESTORATION_TYPES = ['PFM Crown', 'Zirconia Crown', 'Emax Crown', 'Full Metal Crown', 'Bridge - 3 Unit', 'Bridge - 4 Unit', 'Partial Denture (Cast)', 'Complete Denture', 'Flexible Denture', 'Custom Abutment', 'Implant Bar', 'Surgical Stent', 'Night Guard', 'Study Model'];

// ─── Tooth shade options (VITA Classical) ───
const SHADE_OPTIONS = ['A1', 'A2', 'A3', 'A3.5', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D2', 'D3', 'D4', 'OM1', 'OM2'];

// ─── Component ───
const DentalDashboard = () => {
  // ── Core visit state ──
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [activeVisit, setActiveVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // ── Odontogram state ──
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [odontogramData, setOdontogramData] = useState({});    // { fdiNumber: conditionKey }
  const [chartFormCondition, setChartFormCondition] = useState('healthy');
  const [chartFormNotes, setChartFormNotes] = useState('');

  // ── Procedures log state ──
  const [proceduresLog, setProceduresLog] = useState([]);
  const [showProcModal, setShowProcModal] = useState(false);
  const [selectedProcCode, setSelectedProcCode] = useState('');
  const [selectedProcTooth, setSelectedProcTooth] = useState('');
  const [procFee, setProcFee] = useState(0);
  const [procDiscount, setProcDiscount] = useState(0);
  const [procNotes, setProcNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Lab orders state ──
  const [labOrders, setLabOrders] = useState([]);
  const [showLabModal, setShowLabModal] = useState(false);
  const [labForm, setLabForm] = useState({
    restoration_type: 'PFM Crown',
    shade: 'A2',
    teeth: [],
    lab_instructions: '',
    due_date: '',
    preferred_lab: '',
  });

  // ── Visit creation modal ──
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState({
    patient_id: '',
    chief_complaint: '',
    diagnosis: '',
    treatment_plan: '',
    notes: '',
  });

  // ── Toast & messaging ──
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  // ── Stats ──
  const [stats, setStats] = useState({
    activeVisits: 0,
    proceduresToday: 0,
    labOrdersPending: 0,
    totalFeesToday: 0,
  });

  // ── ── ── Fetch helpers ── ── ──
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
      const res = await api.get(`/api/dental/visits?patient_id=${patientId}`);
      const data = res.data?.data || res.data || [];
      setVisits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load dental visits', err);
    }
  }, []);

  const fetchProcedures = useCallback(async (visitId) => {
    if (!visitId) return;
    try {
      const res = await api.get(`/api/dental/procedures?visit_id=${visitId}`);
      const data = res.data?.data || res.data || [];
      setProceduresLog(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load procedures', err);
      setProceduresLog([]);
    }
  }, []);

  const fetchLabOrders = useCallback(async (patientId) => {
    if (!patientId) return;
    try {
      const res = await api.get(`/api/dental/lab-orders?patient_id=${patientId}`);
      const data = res.data?.data || res.data || [];
      setLabOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load lab orders', err);
      setLabOrders([]);
    }
  }, []);

  const recalcStats = useCallback(() => {
    const active = visits.filter(v => v.status !== 'Completed' && v.status !== 'Cancelled').length;
    const today = new Date().toISOString().slice(0, 10);
    const procsToday = proceduresLog.filter(p => p.created_at && p.created_at.startsWith(today)).length;
    const labsPending = labOrders.filter(o => o.status === 'Pending' || o.status === 'In Progress').length;
    const fees = proceduresLog.reduce((sum, p) => sum + (parseFloat(p.fee) || 0) - (parseFloat(p.discount) || 0), 0);
    setStats({
      activeVisits: active,
      proceduresToday: procsToday,
      labOrdersPending: labsPending,
      totalFeesToday: fees,
    });
  }, [visits, proceduresLog, labOrders]);

  // ── Load on mount ──
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
      fetchLabOrders(selectedPatient.id);
    }
  }, [selectedPatient, fetchVisits, fetchLabOrders]);

  useEffect(() => {
    if (activeVisit) {
      fetchProcedures(activeVisit.id);
      // Restore odontogram from visit data
      const stored = activeVisit.odontogram;
      if (stored && typeof stored === 'object') {
        setOdontogramData(stored);
      } else {
        setOdontogramData({});
      }
      setSelectedTooth(null);
    }
  }, [activeVisit, fetchProcedures]);

  useEffect(() => {
    recalcStats();
  }, [recalcStats]);

  // ── ── ── Handlers ── ── ──

  // Select a patient
  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setActiveVisit(null);
    setProceduresLog([]);
    setOdontogramData({});
    setSelectedTooth(null);
  };

  // Create new dental visit
  const handleCreateVisit = async () => {
    if (!selectedPatient || !visitForm.chief_complaint) {
      showToast('Please select a patient and enter chief complaint.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        patient_id: selectedPatient.id,
        chief_complaint: visitForm.chief_complaint,
        diagnosis: visitForm.diagnosis,
        treatment_plan: visitForm.treatment_plan,
        notes: visitForm.notes,
        odontogram: odontogramData,
      };
      const res = await api.post('/api/dental/visits', payload);
      showToast('Dental visit created successfully!');
      setShowVisitModal(false);
      setVisitForm({ patient_id: '', chief_complaint: '', diagnosis: '', treatment_plan: '', notes: '' });
      setActiveVisit(res.data?.data || res.data);
      fetchVisits(selectedPatient.id);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create visit', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Start a visit (set active)
  const handleStartVisit = (visit) => {
    setActiveVisit(visit);
  };

  // Save odontogram condition to a tooth
  const handleSaveToothCondition = () => {
    if (!selectedTooth) {
      showToast('Select a tooth on the odontogram first.', 'warning');
      return;
    }
    setOdontogramData(prev => ({
      ...prev,
      [selectedTooth]: {
        condition: chartFormCondition,
        notes: chartFormNotes,
        updated_at: new Date().toISOString(),
      },
    }));
    showToast(`Tooth ${selectedTooth} marked as "${CONDITION_CONFIG[chartFormCondition]?.label}".`);
    setChartFormNotes('');
  };

  // Log a dental procedure
  const handleLogProcedure = async () => {
    if (!activeVisit || !selectedProcCode) {
      showToast('Select an active visit and procedure code.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        visit_id: activeVisit.id,
        procedure_code: selectedProcCode,
        tooth: selectedProcTooth || null,
        quadrant: null,
        surface: null,
        fee: procFee,
        discount: procDiscount,
        notes: procNotes,
      };
      const res = await api.post('/api/dental/procedures', payload);
      const newProc = res.data?.data || res.data;
      setProceduresLog(prev => [newProc, ...prev]);
      showToast(`Procedure ${selectedProcCode} logged successfully!`);
      setShowProcModal(false);
      setSelectedProcCode('');
      setSelectedProcTooth('');
      setProcFee(0);
      setProcDiscount(0);
      setProcNotes('');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to log procedure', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Create lab order
  const handleCreateLabOrder = async () => {
    if (!selectedPatient || !labForm.restoration_type) {
      showToast('Patient and restoration type required.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const teethToSend = labForm.teeth.length > 0 ? labForm.teeth : (selectedTooth ? [selectedTooth] : []);
      const payload = {
        patient_id: selectedPatient.id,
        restoration_type: labForm.restoration_type,
        shade: labForm.shade,
        teeth: teethToSend,
        lab_instructions: labForm.lab_instructions,
        due_date: labForm.due_date,
        preferred_lab: labForm.preferred_lab,
      };
      const res = await api.post('/api/dental/lab-orders', payload);
      showToast('Lab order created successfully!');
      setShowLabModal(false);
      setLabForm({ restoration_type: 'PFM Crown', shade: 'A2', teeth: [], lab_instructions: '', due_date: '', preferred_lab: '' });
      fetchLabOrders(selectedPatient.id);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create lab order', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // When procedure code changes auto-fill fee
  const handleProcCodeChange = (code) => {
    setSelectedProcCode(code);
    const match = DENTAL_PROCEDURE_CODES.find(c => c.code === code);
    setProcFee(match ? match.fee : 0);
  };

  // ── ── ── Render helpers ── ── ──
  const getToothCondition = (fdiNumber) => {
    return odontogramData[fdiNumber]?.condition || 'healthy';
  };

  const getToothStyle = (fdiNumber) => {
    const cond = getToothCondition(fdiNumber);
    const cfg = CONDITION_CONFIG[cond] || CONDITION_CONFIG.healthy;
    const isSelected = selectedTooth === fdiNumber;
    return {
      backgroundColor: cfg.color,
      color: cfg.textColor,
      border: isSelected ? '3px solid #0f766e' : '1px solid rgba(0,0,0,0.12)',
      boxShadow: isSelected ? '0 0 0 3px rgba(15,118,110,0.3)' : '0 1px 2px rgba(0,0,0,0.06)',
      transform: isSelected ? 'scale(1.12)' : 'scale(1)',
      transition: 'all 0.15s ease',
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: '0.8rem',
      borderRadius: '8px',
    };
  };

  // ── ── ── JSX ── ── ──
  if (loading) {
    return (
      <Container fluid className="py-5 text-center bg-light min-vh-100">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading dental module...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 px-3 px-md-4 bg-light min-vh-100" style={{ '--mint-500': '#14b8a6', '--mint-600': '#0d9488', '--mint-50': '#f0fdfa' }}>
      {/* ── Toast ── */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast show={toast.show} onClose={() => setToast(prev => ({ ...prev, show: false }))} delay={4500} autohide bg={toast.variant}>
          <Toast.Header><strong className="me-auto">{toast.variant === 'danger' ? 'Error' : 'Notification'}</strong></Toast.Header>
          <Toast.Body className={toast.variant === 'danger' ? 'text-dark' : ''}>{toast.message}</Toast.Body>
        </Toast>
      </ToastContainer>

      {/* ── Header ── */}
      <Row className="align-items-center mb-4 g-3">
        <Col md={6}>
          <div className="d-flex align-items-center">
            <div className="rounded-3 p-3 me-3 shadow-sm d-flex align-items-center justify-content-center"
              style={{ width: 54, height: 54, backgroundColor: 'var(--mint-500)', color: '#fff' }}>
              <Stethoscope size={28} />
            </div>
            <div>
              <h3 className="fw-bold mb-0 text-dark">Dental Suite Command Center</h3>
              <p className="text-muted small mb-0">Odontogram charting • Procedure codes • Lab worklist</p>
            </div>
          </div>
        </Col>
        <Col md={6}>
          <div className="d-flex flex-wrap justify-content-md-end gap-2">
            <Form.Select
              size="sm"
              style={{ maxWidth: 260 }}
              value={selectedPatient?.id || ''}
              onChange={(e) => {
                const p = patients.find(pt => String(pt.id) === e.target.value);
                if (p) handlePatientSelect(p);
              }}
              className="shadow-sm border-mint"
            >
              <option value="">-- Select Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name || `Patient #${p.id}`} ({p.uhid || p.id})</option>
              ))}
            </Form.Select>
            <Button variant="outline-secondary" size="sm" onClick={() => { if (selectedPatient) { fetchVisits(selectedPatient.id); fetchLabOrders(selectedPatient.id); } }} className="shadow-sm d-flex align-items-center gap-1">
              <RefreshCw size={15} /> Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedPatient}
              onClick={() => setShowVisitModal(true)}
              className="shadow-sm d-flex align-items-center gap-1"
              style={{ backgroundColor: 'var(--mint-500)', borderColor: 'var(--mint-500)' }}
            >
              <Plus size={15} /> New Visit
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              disabled={!selectedPatient}
              onClick={() => setShowLabModal(true)}
              className="shadow-sm d-flex align-items-center gap-1"
              style={{ borderColor: 'var(--mint-500)', color: 'var(--mint-600)' }}
            >
              <FlaskConical size={15} /> Lab Order
            </Button>
            <Button
              variant="success"
              size="sm"
              disabled={!activeVisit}
              onClick={() => setShowProcModal(true)}
              className="shadow-sm d-flex align-items-center gap-1"
            >
              <DollarSign size={15} /> Log Procedure
            </Button>
          </div>
        </Col>
      </Row>

      {/* ── Stats strips ── */}
      <Row className="g-3 mb-4">
        <Col md={3} sm={6}>
          <StatsCard title="Active Visits" value={stats.activeVisits} icon={<Stethoscope />} variant="info" />
        </Col>
        <Col md={3} sm={6}>
          <StatsCard title="Procedures Today" value={stats.proceduresToday} icon={<DollarSign />} variant="success" />
        </Col>
        <Col md={3} sm={6}>
          <StatsCard title="Lab Orders Pending" value={stats.labOrdersPending} icon={<FlaskConical />} variant="warning" />
        </Col>
        <Col md={3} sm={6}>
          <StatsCard title="Fees Today (₹)" value={`₹${stats.totalFeesToday.toLocaleString()}`} icon={<ShoppingCart />} variant="purple" />
        </Col>
      </Row>

      {/* ── Patient info bar ── */}
      {selectedPatient && (
        <Card className="border-0 shadow-sm mb-4 rounded-3 bg-white" style={{ borderLeft: '5px solid var(--mint-500)' }}>
          <Card.Body className="py-3 px-4">
            <Row className="align-items-center g-3">
              <Col md={3}>
                <div className="d-flex align-items-center">
                  <User size={20} className="me-2" style={{ color: 'var(--mint-600)' }} />
                  <div>
                    <div className="text-uppercase text-muted small fw-bold">Patient</div>
                    <div className="fw-bold text-dark">{selectedPatient.name || `Patient #${selectedPatient.id}`}</div>
                  </div>
                </div>
              </Col>
              <Col md={2}>
                <div className="d-flex align-items-center">
                  <FileText size={20} className="me-2 text-secondary" />
                  <div>
                    <div className="text-uppercase text-muted small fw-bold">UHID</div>
                    <div className="fw-bold font-monospace text-dark">{selectedPatient.uhid || `ID:${selectedPatient.id}`}</div>
                  </div>
                </div>
              </Col>
              <Col md={3}>
                <div className="d-flex align-items-center">
                  <Calendar size={20} className="me-2 text-secondary" />
                  <div>
                    <div className="text-uppercase text-muted small fw-bold">DOB / Age</div>
                    <div className="fw-semibold text-dark">{selectedPatient.dob ? new Date(selectedPatient.dob).toLocaleDateString() : '—'} {selectedPatient.age ? `(${selectedPatient.age} yrs)` : ''}</div>
                  </div>
                </div>
              </Col>
              <Col md={4} className="text-md-end">
                {activeVisit ? (
                  <Badge bg="success" className="px-3 py-2 fs-6 rounded-pill">
                    <CheckCircle2 size={14} className="me-1" /> Active Visit: {activeVisit.chief_complaint?.slice(0, 28) || `#${activeVisit.id}`}
                  </Badge>
                ) : (
                  <Badge bg="secondary" className="px-3 py-2 fs-6 rounded-pill">No active visit selected</Badge>
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* ── Main two-column layout ── */}
      <Row className="g-4 mb-4">
        {/* ── Left: Odontogram Matrix + Charting Form ── */}
        <Col xl={7} lg={12}>
          <Card className="border-0 shadow-sm rounded-3 bg-white h-100">
            <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom" style={{ borderColor: 'rgba(20,184,166,0.2)' }}>
              <div>
                <h5 className="fw-bold mb-0 text-dark d-flex align-items-center">
                  <Stethoscope size={20} className="me-2" style={{ color: 'var(--mint-500)' }} /> Odontogram Chart (FDI Notation)
                </h5>
                <small className="text-muted">Click a tooth to select it for charting or procedures</small>
              </div>
              {selectedTooth && (
                <Badge bg="light" className="text-dark border px-3 py-2 fs-6 rounded-pill">
                  Selected: <strong>Tooth {selectedTooth}</strong>
                  <Button variant="link" size="sm" className="ms-2 p-0 text-danger" onClick={() => setSelectedTooth(null)}>
                    <XCircle size={16} />
                  </Button>
                </Badge>
              )}
            </Card.Header>
            <Card.Body className="p-3 p-md-4">
              {/* Quadrant grid */}
              <Row className="g-3 mb-4">
                {[QUADRANTS.upperRight, QUADRANTS.upperLeft].map(q => (
                  <Col md={6} key={q.quadrant}>
                    <div className="rounded-3 p-3" style={{ background: '#f8fafc', border: '1px dashed rgba(20,184,166,0.35)' }}>
                      <div className="fw-bold small text-uppercase text-muted mb-2 text-center">{q.label}</div>
                      <div className="d-flex justify-content-center gap-1 flex-wrap">
                        {q.teeth.map(fdi => (
                          <OverlayTrigger key={fdi} placement="top" overlay={<Tooltip id={`tip-${fdi}`}>Tooth {fdi}: {CONDITION_CONFIG[getToothCondition(fdi)]?.label}</Tooltip>}>
                            <div
                              onClick={() => setSelectedTooth(fdi === selectedTooth ? null : fdi)}
                              style={{
                                ...getToothStyle(fdi),
                                width: 40,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                userSelect: 'none',
                              }}
                              title={`Tooth ${fdi}`}
                            >
                              {fdi}
                            </div>
                          </OverlayTrigger>
                        ))}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
              <Row className="g-3">
                {[QUADRANTS.lowerRight, QUADRANTS.lowerLeft].map(q => (
                  <Col md={6} key={q.quadrant}>
                    <div className="rounded-3 p-3" style={{ background: '#f8fafc', border: '1px dashed rgba(20,184,166,0.35)' }}>
                      <div className="fw-bold small text-uppercase text-muted mb-2 text-center">{q.label}</div>
                      <div className="d-flex justify-content-center gap-1 flex-wrap">
                        {q.teeth.map(fdi => (
                          <OverlayTrigger key={fdi} placement="bottom" overlay={<Tooltip id={`tip-${fdi}`}>Tooth {fdi}: {CONDITION_CONFIG[getToothCondition(fdi)]?.label}</Tooltip>}>
                            <div
                              onClick={() => setSelectedTooth(fdi === selectedTooth ? null : fdi)}
                              style={{
                                ...getToothStyle(fdi),
                                width: 40,
                                height: 40,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                userSelect: 'none',
                              }}
                              title={`Tooth ${fdi}`}
                            >
                              {fdi}
                            </div>
                          </OverlayTrigger>
                        ))}
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>

              {/* Legend */}
              <div className="mt-3 d-flex flex-wrap gap-2 justify-content-center">
                {Object.entries(CONDITION_CONFIG).map(([key, cfg]) => (
                  <Badge
                    key={key}
                    className="px-2 py-1 rounded-pill d-flex align-items-center gap-1"
                    style={{ backgroundColor: cfg.color, color: cfg.textColor, border: '1px solid rgba(0,0,0,0.1)', fontSize: '0.7rem', cursor: 'pointer', transition: 'transform 0.1s' }}
                    onClick={() => { setChartFormCondition(key); }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title={`Click to select "${cfg.label}" for charting`}
                  >
                    <cfg.icon size={12} /> {cfg.label}
                  </Badge>
                ))}
              </div>

              {/* Charting form */}
              {selectedTooth && (
                <Card className="mt-4 border" style={{ borderColor: 'rgba(20,184,166,0.4)', backgroundColor: 'var(--mint-50)' }}>
                  <Card.Body className="p-3">
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center">
                      <ClipboardCheck size={18} className="me-2" style={{ color: 'var(--mint-600)' }} />
                      Chart Tooth #{selectedTooth}
                    </h6>
                    <Row className="g-3 align-items-end">
                      <Col md={5}>
                        <Form.Label className="small fw-bold">Condition</Form.Label>
                        <Form.Select
                          size="sm"
                          value={chartFormCondition}
                          onChange={e => setChartFormCondition(e.target.value)}
                        >
                          {Object.entries(CONDITION_CONFIG).map(([k, c]) => (
                            <option key={k} value={k}>{c.label}</option>
                          ))}
                        </Form.Select>
                      </Col>
                      <Col md={5}>
                        <Form.Label className="small fw-bold">Clinical Note</Form.Label>
                        <Form.Control
                          size="sm"
                          type="text"
                          placeholder="e.g., Mesial caries depth moderate"
                          value={chartFormNotes}
                          onChange={e => setChartFormNotes(e.target.value)}
                        />
                      </Col>
                      <Col md={2} className="d-grid">
                        <Button
                          size="sm"
                          style={{ backgroundColor: 'var(--mint-500)', borderColor: 'var(--mint-500)' }}
                          onClick={handleSaveToothCondition}
                        >
                          <Save size={14} className="me-1" /> Save
                        </Button>
                      </Col>
                    </Row>
                    {/* Show applied conditions summary */}
                    {Object.keys(odontogramData).length > 0 && (
                      <div className="mt-3">
                        <small className="text-muted fw-bold">Charting Summary:</small>
                        <div className="d-flex flex-wrap gap-1 mt-1">
                          {Object.entries(odontogramData).map(([tooth, data]) => (
                            <Badge
                              key={tooth}
                              className="px-2 py-1 rounded-pill"
                              style={{
                                backgroundColor: CONDITION_CONFIG[data.condition]?.color || '#e5e7eb',
                                color: CONDITION_CONFIG[data.condition]?.textColor || '#374151',
                                fontSize: '0.7rem',
                              }}
                            >
                              #{tooth}: {CONDITION_CONFIG[data.condition]?.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* ── Right: Visit List + Procedures Log ── */}
        <Col xl={5} lg={12}>
          {/* Visit selector */}
          <Card className="border-0 shadow-sm rounded-3 bg-white mb-4">
            <Card.Header className="bg-white py-3 px-4 border-bottom" style={{ borderColor: 'rgba(20,184,166,0.2)' }}>
              <h5 className="fw-bold mb-0 text-dark d-flex align-items-center">
                <Stethoscope size={20} className="me-2" style={{ color: 'var(--mint-500)' }} /> Dental Visits
              </h5>
            </Card.Header>
            <Card.Body className="p-0" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {!selectedPatient ? (
                <div className="text-center py-4 text-muted">
                  <User size={32} className="mb-2 opacity-50" />
                  <p className="small">Select a patient to view visits.</p>
                </div>
              ) : visits.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <FileText size={32} className="mb-2 opacity-50" />
                  <p className="small">No dental visits recorded yet.</p>
                  <Button variant="link" size="sm" onClick={() => setShowVisitModal(true)}>Create First Visit</Button>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {visits.map(v => (
                    <ListGroup.Item
                      key={v.id}
                      action
                      active={activeVisit?.id === v.id}
                      onClick={() => handleStartVisit(v)}
                      className="d-flex justify-content-between align-items-center px-3 py-2"
                      style={{
                        borderLeft: activeVisit?.id === v.id ? '4px solid var(--mint-500)' : '4px solid transparent',
                        backgroundColor: activeVisit?.id === v.id ? 'var(--mint-50)' : 'transparent',
                      }}
                    >
                      <div>
                        <div className="fw-semibold text-dark small">{v.chief_complaint?.slice(0, 40) || `Visit #${v.id}`}</div>
                        <div className="text-muted small d-flex align-items-center gap-2">
                          <Clock size={12} /> {v.created_at ? new Date(v.created_at).toLocaleDateString() : '—'}
                          <span className="ms-1">· Dr. {v.doctor_name || '—'}</span>
                        </div>
                      </div>
                      <Badge bg={v.status === 'Completed' ? 'success' : 'warning'} className="rounded-pill small">
                        {v.status || 'Active'}
                      </Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>

          {/* Procedures log */}
          <Card className="border-0 shadow-sm rounded-3 bg-white">
            <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom" style={{ borderColor: 'rgba(20,184,166,0.2)' }}>
              <h5 className="fw-bold mb-0 text-dark d-flex align-items-center">
                <DollarSign size={20} className="me-2" style={{ color: 'var(--mint-500)' }} /> Procedures Logged
              </h5>
              {activeVisit && (
                <Button size="sm" variant="success" className="d-flex align-items-center gap-1 shadow-sm" onClick={() => setShowProcModal(true)}>
                  <Plus size={14} /> Add
                </Button>
              )}
            </Card.Header>
            <Card.Body className="p-0" style={{ maxHeight: 360, overflowY: 'auto' }}>
              {!activeVisit ? (
                <div className="text-center py-4 text-muted">
                  <ClipboardCheck size={32} className="mb-2 opacity-50" />
                  <p className="small">Select or create a dental visit to log procedures.</p>
                </div>
              ) : proceduresLog.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <DollarSign size={32} className="mb-2 opacity-50" />
                  <p className="small">No procedures logged for this visit yet.</p>
                </div>
              ) : (
                <Table hover responsive className="align-middle mb-0 small">
                  <thead className="bg-light text-muted text-uppercase small">
                    <tr>
                      <th className="ps-3">Code</th>
                      <th>Tooth</th>
                      <th>Fee</th>
                      <th className="pe-3 text-end">Discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proceduresLog.map(p => (
                      <tr key={p.id}>
                        <td className="ps-3 fw-semibold font-monospace">{p.procedure_code}</td>
                        <td>{p.tooth ? `#${p.tooth}` : '—'}</td>
                        <td className="fw-bold" style={{ color: 'var(--mint-600)' }}>₹{(parseFloat(p.fee) || 0).toLocaleString()}</td>
                        <td className="pe-3 text-end">{p.discount > 0 ? `-₹${parseFloat(p.discount).toLocaleString()}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Lab Worklist ── */}
      <Card className="border-0 shadow-sm rounded-3 bg-white">
        <Card.Header className="bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom" style={{ borderColor: 'rgba(20,184,166,0.2)' }}>
          <div>
            <h5 className="fw-bold mb-0 text-dark d-flex align-items-center">
              <FlaskConical size={20} className="me-2" style={{ color: 'var(--mint-500)' }} /> Dental Lab Worklist
            </h5>
            <small className="text-muted">Active laboratory orders for crowns, bridges, dentures & appliances</small>
          </div>
          <Button
            size="sm"
            disabled={!selectedPatient}
            onClick={() => setShowLabModal(true)}
            className="shadow-sm d-flex align-items-center gap-1"
            style={{ backgroundColor: 'var(--mint-500)', borderColor: 'var(--mint-500)' }}
          >
            <Plus size={14} /> New Lab Order
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          {!selectedPatient ? (
            <div className="text-center py-5 text-muted">
              <FlaskConical size={36} className="mb-2 opacity-50" />
              <p>Select a patient to view dental lab orders.</p>
            </div>
          ) : labOrders.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FlaskConical size={36} className="mb-2 opacity-50" />
              <p>No lab orders pending for this patient.</p>
            </div>
          ) : (
            <Table hover responsive className="align-middle mb-0">
              <thead className="bg-light text-muted text-uppercase small">
                <tr>
                  <th className="ps-4">Restoration</th>
                  <th>Teeth</th>
                  <th>Shade</th>
                  <th>Lab</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th className="pe-4 text-end">Ordered</th>
                </tr>
              </thead>
              <tbody>
                {labOrders.map(o => (
                  <tr key={o.id}>
                    <td className="ps-4 fw-semibold">{o.restoration_type}</td>
                    <td className="font-monospace small">
                      {Array.isArray(o.teeth) ? o.teeth.join(', ') : (o.teeth || '—')}
                    </td>
                    <td>
                      <span
                        className="px-2 py-1 rounded-pill small fw-bold"
                        style={{
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          border: '1px solid #fbbf24',
                          fontSize: '0.75rem',
                        }}
                      >
                        {o.shade || '—'}
                      </span>
                    </td>
                    <td>{o.preferred_lab || 'Default Lab'}</td>
                    <td>{o.due_date ? new Date(o.due_date).toLocaleDateString() : '—'}</td>
                    <td>
                      <Badge
                        bg={
                          o.status === 'Completed' ? 'success' :
                            o.status === 'In Progress' ? 'info' :
                              o.status === 'Shipped' ? 'primary' :
                                'warning'
                        }
                        className="rounded-pill"
                      >
                        {o.status || 'Pending'}
                      </Badge>
                    </td>
                    <td className="pe-4 text-end text-muted small">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* ── ── ── Modals ── ── ── */}

      {/* Modal: New Visit */}
      <Modal show={showVisitModal} onHide={() => setShowVisitModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: 'var(--mint-500)', color: '#fff' }}>
          <Modal.Title className="fw-bold d-flex align-items-center fs-5">
            <Stethoscope size={20} className="me-2" /> New Dental Visit
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => { e.preventDefault(); handleCreateVisit(); }}
        >
          <Modal.Body className="p-4">
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Patient</Form.Label>
                  <Form.Control
                    value={selectedPatient ? `${selectedPatient.name || `Patient #${selectedPatient.id}`} (${selectedPatient.uhid || ''})` : ''}
                    disabled
                    className="bg-light"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Chief Complaint *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Pain in lower right molar since 3 days"
                    value={visitForm.chief_complaint}
                    onChange={e => setVisitForm(prev => ({ ...prev, chief_complaint: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Diagnosis</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Acute apical periodontitis #46"
                    value={visitForm.diagnosis}
                    onChange={e => setVisitForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Treatment Plan</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., RCT #46 followed by PFM crown"
                    value={visitForm.treatment_plan}
                    onChange={e => setVisitForm(prev => ({ ...prev, treatment_plan: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Additional Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Clinical observations, medical history alerts..."
                    value={visitForm.notes}
                    onChange={e => setVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowVisitModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !visitForm.chief_complaint}
              style={{ backgroundColor: 'var(--mint-500)', borderColor: 'var(--mint-500)' }}>
              {submitting ? <Spinner animation="border" size="sm" /> : 'Create Visit'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal: Log Procedure */}
      <Modal show={showProcModal} onHide={() => setShowProcModal(false)} centered size="lg">
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title className="fw-bold d-flex align-items-center fs-5">
            <DollarSign size={20} className="me-2" /> Log Dental Procedure
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={(e) => { e.preventDefault(); handleLogProcedure(); }}>
          <Modal.Body className="p-4">
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Procedure Code *</Form.Label>
                  <Form.Select value={selectedProcCode} onChange={e => handleProcCodeChange(e.target.value)}>
                    <option value="">-- Select Code --</option>
                    {DENTAL_PROCEDURE_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} — {c.name} (₹{c.fee.toLocaleString()})</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Tooth # (optional)</Form.Label>
                  <Form.Control
                    type="number"
                    min={11}
                    max={48}
                    placeholder="e.g., 46"
                    value={selectedProcTooth}
                    onChange={e => setSelectedProcTooth(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Fee (₹)</Form.Label>
                  <Form.Control type="number" value={procFee} onChange={e => setProcFee(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Discount (₹)</Form.Label>
                  <Form.Control type="number" min={0} value={procDiscount} onChange={e => setProcDiscount(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Notes</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Quadrant/surface details..."
                    value={procNotes}
                    onChange={e => setProcNotes(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
            {/* Net fee preview */}
            {selectedProcCode && (
              <Alert variant="light" className="mt-3 mb-0 border text-end" style={{ borderColor: 'var(--mint-200)' }}>
                <small className="text-muted">Net Fee:</small>{' '}
                <span className="fw-bold fs-5" style={{ color: 'var(--mint-600)' }}>
                  ₹{((procFee || 0) - (procDiscount || 0)).toLocaleString()}
                </span>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowProcModal(false)}>Cancel</Button>
            <Button variant="success" type="submit" disabled={submitting || !selectedProcCode}>
              {submitting ? <Spinner animation="border" size="sm" /> : 'Log Procedure'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal: Lab Order */}
      <Modal show={showLabModal} onHide={() => setShowLabModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ backgroundColor: 'var(--mint-500)', color: '#fff' }}>
          <Modal.Title className="fw-bold d-flex align-items-center fs-5">
            <FlaskConical size={20} className="me-2" /> Create Dental Lab Order
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={(e) => { e.preventDefault(); handleCreateLabOrder(); }}>
          <Modal.Body className="p-4">
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Restoration Type *</Form.Label>
                  <Form.Select
                    value={labForm.restoration_type}
                    onChange={e => setLabForm(prev => ({ ...prev, restoration_type: e.target.value }))}
                  >
                    {RESTORATION_TYPES.map(rt => (
                      <option key={rt} value={rt}>{rt}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Shade *</Form.Label>
                  <Form.Select
                    value={labForm.shade}
                    onChange={e => setLabForm(prev => ({ ...prev, shade: e.target.value }))}
                  >
                    {SHADE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Due Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={labForm.due_date}
                    onChange={e => setLabForm(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Teeth (comma-separated)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., 11,12,13 or leave empty"
                    value={labForm.teeth.join(',')}
                    onChange={e => setLabForm(prev => ({ ...prev, teeth: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Preferred Dental Lab</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Ceramicraft Dental Lab"
                    value={labForm.preferred_lab}
                    onChange={e => setLabForm(prev => ({ ...prev, preferred_lab: e.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-bold small">Lab Instructions / Special Requests</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="e.g., Contour as per opposing cast; include stump shade photo"
                    value={labForm.lab_instructions}
                    onChange={e => setLabForm(prev => ({ ...prev, lab_instructions: e.target.value }))}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowLabModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}
              style={{ backgroundColor: 'var(--mint-500)', borderColor: 'var(--mint-500)' }}>
              {submitting ? <Spinner animation="border" size="sm" /> : 'Create Lab Order'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default DentalDashboard;