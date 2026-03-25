import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form, Spinner, Alert, ProgressBar, InputGroup, Accordion } from 'react-bootstrap';
import api from '../services/api';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TREATMENT PACKAGE MANAGER — Phase 7 Upgrade
// CFO-Grade Package Builder with Boundary Rules
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const EMPTY_INCLUSIONS = {
  max_room_days: 0,
  included_room_type: 'General Ward',
  pharmacy_cap_amount: 0,
  included_tests: [],
  itemized_limits: {},
};

const EMPTY_PACKAGE = {
  code: '', name: '', category: '', specialty: '', description: '',
  base_price: '', gst_percent: 18, stay_days: '', room_type: 'General Ward', icu_days: 0,
  inclusions: { ...EMPTY_INCLUSIONS },
  exclusions: [],
  tpa_eligible: true, pmjay_code: '', valid_from: '', valid_until: '',
};

const ROOM_TYPES = ['General Ward', 'Semi-Private', 'Private', 'Deluxe', 'Suite', 'ICU', 'HDU', 'NICU'];
const CATEGORIES = ['Obstetrics', 'Orthopedics', 'Cardiology', 'General Surgery', 'Ophthalmology', 'Nephrology', 'Preventive', 'Oncology', 'Neurology', 'Urology', 'Pediatrics', 'ENT'];

const TreatmentPackageManager = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(null);

  // Form state
  const [formData, setFormData] = useState({ ...EMPTY_PACKAGE });
  const [assignData, setAssignData] = useState({ patient_id: '', admission_id: '', package_id: '', discount_percent: 0, advance_paid: 0, notes: '' });
  const [saving, setSaving] = useState(false);

  // Inclusion builder helpers
  const [newTest, setNewTest] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemLimit, setNewItemLimit] = useState('');

  // Patient package tracking
  const [activeAssignments, setActiveAssignments] = useState([]);

  // ─ Data Fetching ─
  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/treatment-packages');
      setPackages(res.data || []);
    } catch (err) {
      console.error('[PackageManager] Fetch error:', err);
      setError('Failed to load packages. Using demo data.');
      // Fallback to demo data so the page is never empty
      setPackages([
        { id: 1, code: 'PKG-001', name: 'Normal Delivery Package', category: 'Obstetrics', base_price: 45000, stay_days: 3, room_type: 'General Ward', is_active: true, inclusions: { max_room_days: 3, included_room_type: 'General Ward', pharmacy_cap_amount: 5000, included_tests: ['CBC','Hemoglobin','Urine R/M'], itemized_limits: { 'Paracetamol IV': 10, 'Syringe 5ml': 5 } } },
        { id: 2, code: 'PKG-002', name: 'LSCS (C-Section) Package', category: 'Obstetrics', base_price: 85000, stay_days: 5, room_type: 'Semi-Private', is_active: true, inclusions: { max_room_days: 5, included_room_type: 'Semi-Private', pharmacy_cap_amount: 12000, included_tests: ['CBC','PT/INR','Blood Group','Hemoglobin'], itemized_limits: { 'Paracetamol IV': 20, 'Surgical Dressing Kit': 3 } } },
        { id: 3, code: 'PKG-003', name: 'Total Knee Replacement', category: 'Orthopedics', base_price: 250000, stay_days: 7, room_type: 'Private', is_active: true, inclusions: { max_room_days: 7, included_room_type: 'Private', pharmacy_cap_amount: 25000, included_tests: ['CBC','PT/INR','X-Ray Knee','ECG'], itemized_limits: { 'Physio Session': 10, 'Crepe Bandage': 4 } } },
        { id: 4, code: 'PKG-004', name: 'Appendectomy (Lap)', category: 'General Surgery', base_price: 65000, stay_days: 2, room_type: 'General Ward', is_active: true, inclusions: { max_room_days: 2, included_room_type: 'General Ward', pharmacy_cap_amount: 8000, included_tests: ['CBC','USG Abdomen'], itemized_limits: {} } },
        { id: 5, code: 'PKG-005', name: 'PTCA + Stenting', category: 'Cardiology', base_price: 180000, stay_days: 3, room_type: 'Private', is_active: true, inclusions: { max_room_days: 3, included_room_type: 'Private', pharmacy_cap_amount: 20000, included_tests: ['CBC','Troponin','ECG','2D Echo','Lipid Profile'], itemized_limits: { 'DES Stent': 1 } } },
        { id: 6, code: 'PKG-006', name: 'Cataract Surgery (Phaco)', category: 'Ophthalmology', base_price: 25000, stay_days: 0, room_type: 'Day Care', is_active: true, inclusions: { max_room_days: 0, included_room_type: 'Day Care', pharmacy_cap_amount: 3000, included_tests: ['Blood Sugar'], itemized_limits: { 'IOL Lens': 1 } } },
        { id: 7, code: 'PKG-007', name: 'Dialysis Session', category: 'Nephrology', base_price: 3500, stay_days: 0, room_type: 'Day Care', is_active: true, inclusions: { max_room_days: 0, included_room_type: 'Day Care', pharmacy_cap_amount: 500, included_tests: ['Creatinine','BUN'], itemized_limits: { 'Dialyzer': 1 } } },
        { id: 8, code: 'PKG-008', name: 'Full Body Health Checkup', category: 'Preventive', base_price: 4999, stay_days: 0, room_type: 'Day Care', is_active: true, inclusions: { max_room_days: 0, included_room_type: 'Day Care', pharmacy_cap_amount: 0, included_tests: ['CBC','Lipid Profile','HbA1c','Thyroid Panel','Liver Function','Kidney Function','Urine R/M','ECG','X-Ray Chest'], itemized_limits: {} } },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  // ─ Handlers ─
  const handleCreatePackage = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        base_price: parseFloat(formData.base_price),
        stay_days: parseInt(formData.stay_days) || 0,
        icu_days: parseInt(formData.icu_days) || 0,
        gst_percent: parseFloat(formData.gst_percent) || 0,
        inclusions: formData.inclusions,
      };
      await api.post('/treatment-packages', payload);
      setShowCreateModal(false);
      setFormData({ ...EMPTY_PACKAGE });
      fetchPackages();
    } catch (err) {
      console.error('[PackageManager] Create error:', err);
      alert('Error creating package: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignPackage = async () => {
    setSaving(true);
    try {
      await api.post('/treatment-packages/assign', assignData);
      setShowAssignModal(false);
      setAssignData({ patient_id: '', admission_id: '', package_id: '', discount_percent: 0, advance_paid: 0, notes: '' });
      alert('Package assigned successfully!');
    } catch (err) {
      console.error('[PackageManager] Assign error:', err);
      alert('Error assigning package: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePkg = async (id) => {
    if (!window.confirm('Deactivate this package?')) return;
    try {
      await api.delete(`/treatment-packages/${id}`);
      fetchPackages();
    } catch (err) {
      alert('Error deactivating: ' + err.message);
    }
  };

  // ─ Inclusion Helpers ─
  const addTest = () => {
    if (!newTest.trim()) return;
    setFormData(prev => ({ ...prev, inclusions: { ...prev.inclusions, included_tests: [...(prev.inclusions.included_tests || []), newTest.trim()] } }));
    setNewTest('');
  };

  const removeTest = (idx) => {
    setFormData(prev => ({ ...prev, inclusions: { ...prev.inclusions, included_tests: prev.inclusions.included_tests.filter((_, i) => i !== idx) } }));
  };

  const addItemLimit = () => {
    if (!newItemName.trim() || !newItemLimit) return;
    setFormData(prev => ({ ...prev, inclusions: { ...prev.inclusions, itemized_limits: { ...prev.inclusions.itemized_limits, [newItemName.trim()]: parseInt(newItemLimit) } } }));
    setNewItemName('');
    setNewItemLimit('');
  };

  const removeItemLimit = (key) => {
    setFormData(prev => {
      const copy = { ...prev.inclusions.itemized_limits };
      delete copy[key];
      return { ...prev, inclusions: { ...prev.inclusions, itemized_limits: copy } };
    });
  };

  // ─ Computed Values ─
  const activePackages = packages.filter(p => p.is_active);
  const categoryCounts = activePackages.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {});

  const formatCurrency = (v) => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

  const parseInclusions = (inc) => {
    if (!inc) return EMPTY_INCLUSIONS;
    if (typeof inc === 'string') try { return JSON.parse(inc); } catch { return EMPTY_INCLUSIONS; }
    return inc;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <Container fluid className="py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">🏥 Treatment Package Builder</h4>
          <small className="text-muted">Phase 7 — CFO-Grade Package Rules Engine with Billing Interceptor</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary" onClick={() => { setFormData({ ...EMPTY_PACKAGE }); setShowCreateModal(true); }}>+ Create Package</Button>
          <Button variant="outline-success" onClick={() => setShowAssignModal(true)}>+ Assign to Patient</Button>
        </div>
      </div>

      {error && <Alert variant="warning" dismissible onClose={() => setError(null)}>{error}</Alert>}

      {/* KPI Cards */}
      <Row className="mb-3 g-2">
        <Col sm={3}><Card className="text-center border-primary h-100"><Card.Body><h3 className="text-primary mb-0">{activePackages.length}</h3><small className="text-muted">Active Packages</small></Card.Body></Card></Col>
        <Col sm={3}><Card className="text-center border-success h-100"><Card.Body><h3 className="text-success mb-0">{Object.keys(categoryCounts).length}</h3><small className="text-muted">Categories</small></Card.Body></Card></Col>
        <Col sm={3}><Card className="text-center border-info h-100"><Card.Body><h3 className="text-info mb-0">{activePackages.reduce((s,p) => s + (parseInclusions(p.inclusions).included_tests?.length || 0), 0)}</h3><small className="text-muted">Total Included Tests</small></Card.Body></Card></Col>
        <Col sm={3}><Card className="text-center border-warning h-100"><Card.Body><h3 className="text-warning mb-0">{formatCurrency(activePackages.reduce((s,p) => s + Number(p.base_price || 0), 0) / (activePackages.length || 1))}</h3><small className="text-muted">Avg Package Price</small></Card.Body></Card></Col>
      </Row>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" variant="primary" /><p className="mt-2 text-muted">Loading packages...</p></div>
      ) : (
        <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
          {/* ── TAB 1: Package Catalog ── */}
          <Tab eventKey="catalog" title={<span>📦 Package Catalog <Badge bg="primary">{activePackages.length}</Badge></span>}>
            <Card>
              <Card.Body className="p-0">
                <Table striped hover responsive size="sm" className="mb-0">
                  <thead className="table-dark">
                    <tr><th>Code</th><th>Package Name</th><th>Category</th><th>Price</th><th>Room Days</th><th>Room Type</th><th>Pharm Cap</th><th>Tests</th><th>Item Limits</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {packages.map((p) => {
                      const inc = parseInclusions(p.inclusions);
                      return (
                        <tr key={p.id}>
                          <td><code>{p.code}</code></td>
                          <td><strong className="text-primary" style={{cursor:'pointer'}} onClick={() => { setSelectedPkg(p); setShowDetailModal(true); }}>{p.name}</strong></td>
                          <td><Badge bg="info">{p.category}</Badge></td>
                          <td className="fw-bold text-success">{formatCurrency(p.base_price)}</td>
                          <td className="text-center"><Badge bg="secondary">{inc.max_room_days || p.stay_days || 0}d</Badge></td>
                          <td><small>{inc.included_room_type || p.room_type}</small></td>
                          <td className="text-warning fw-bold">{formatCurrency(inc.pharmacy_cap_amount)}</td>
                          <td className="text-center"><Badge bg="outline-info" className="border border-info text-info">{inc.included_tests?.length || 0}</Badge></td>
                          <td className="text-center"><Badge bg="outline-danger" className="border border-danger text-danger">{Object.keys(inc.itemized_limits || {}).length}</Badge></td>
                          <td>{p.is_active ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}</td>
                          <td>
                            <Button size="sm" variant="outline-info" className="me-1" onClick={() => { setSelectedPkg(p); setShowDetailModal(true); }}>👁</Button>
                            <Button size="sm" variant="outline-danger" onClick={() => handleDeletePkg(p.id)}>✕</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab>

          {/* ── TAB 2: Boundary Rules Overview ── */}
          <Tab eventKey="rules" title={<span>🛡️ Boundary Rules <Badge bg="danger">{activePackages.length}</Badge></span>}>
            <Card>
              <Card.Header className="bg-dark text-white">
                <strong>Billing Interceptor Rules Engine</strong>
                <small className="d-block text-light opacity-75">These strict boundaries are enforced in real-time when any charge is added. Overages auto-bill as "Out of Package" extras.</small>
              </Card.Header>
              <Card.Body className="p-0">
                <Table bordered hover responsive size="sm" className="mb-0">
                  <thead className="table-warning">
                    <tr>
                      <th>Package</th>
                      <th>🛏️ Room Limit</th>
                      <th>💊 Pharmacy Cap</th>
                      <th>🧪 Included Tests</th>
                      <th>📋 Itemized Limits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePackages.map((p) => {
                      const inc = parseInclusions(p.inclusions);
                      return (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong><br/>
                            <small className="text-muted">{p.code}</small>
                          </td>
                          <td>
                            <Badge bg="info">{inc.max_room_days || 0} days</Badge>{' '}
                            <small className="text-muted">{inc.included_room_type || 'Any'}</small>
                            <br/><small className="text-danger">⚠ Upgrade auto-billed</small>
                          </td>
                          <td>
                            <span className="fw-bold text-success">{formatCurrency(inc.pharmacy_cap_amount)}</span>
                            <br/><small className="text-danger">⚠ Overspend billed as extra</small>
                          </td>
                          <td>
                            {(inc.included_tests || []).map((t, i) => (
                              <Badge key={i} bg="light" className="text-dark border me-1 mb-1">{t}</Badge>
                            ))}
                            {(!inc.included_tests || inc.included_tests.length === 0) && <small className="text-muted">None</small>}
                          </td>
                          <td>
                            {Object.entries(inc.itemized_limits || {}).map(([k, v]) => (
                              <div key={k}><small><strong>{k}</strong>: max <Badge bg="danger">{v}</Badge></small></div>
                            ))}
                            {Object.keys(inc.itemized_limits || {}).length === 0 && <small className="text-muted">No limits</small>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab>

          {/* ── TAB 3: Categories ── */}
          <Tab eventKey="categories" title={<span>📁 Categories <Badge bg="info">{Object.keys(categoryCounts).length}</Badge></span>}>
            <Card>
              <Card.Body>
                <Row className="g-3">
                  {Object.entries(categoryCounts).map(([cat, count]) => {
                    const catPkgs = activePackages.filter(p => p.category === cat);
                    const avgPrice = catPkgs.reduce((s, p) => s + Number(p.base_price || 0), 0) / count;
                    return (
                      <Col sm={6} md={4} lg={3} key={cat}>
                        <Card className="h-100 border-start border-4 border-primary">
                          <Card.Body>
                            <h6 className="text-primary">{cat}</h6>
                            <div className="d-flex justify-content-between">
                              <small className="text-muted">{count} package{count > 1 ? 's' : ''}</small>
                              <small className="fw-bold text-success">{formatCurrency(avgPrice)} avg</small>
                            </div>
                            <hr className="my-2"/>
                            {catPkgs.map(p => (
                              <div key={p.id} className="d-flex justify-content-between">
                                <small>{p.name}</small>
                                <small className="text-muted">{formatCurrency(p.base_price)}</small>
                              </div>
                            ))}
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: CREATE / EDIT PACKAGE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="xl" scrollable>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>🏗️ Package Builder — Strict Boundary Rules</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            {/* Left: Basic Info */}
            <Col md={6}>
              <h6 className="text-primary border-bottom pb-1 mb-3">Basic Information</h6>
              <Row className="g-2">
                <Col sm={4}>
                  <Form.Group><Form.Label className="small fw-bold">Code</Form.Label>
                    <Form.Control size="sm" placeholder="PKG-XXX" value={formData.code} onChange={e => setFormData(p => ({...p, code: e.target.value}))} />
                  </Form.Group>
                </Col>
                <Col sm={8}>
                  <Form.Group><Form.Label className="small fw-bold">Package Name</Form.Label>
                    <Form.Control size="sm" placeholder="Normal Delivery Package" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} />
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Group><Form.Label className="small fw-bold">Category</Form.Label>
                    <Form.Select size="sm" value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value}))}>
                      <option value="">Select...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Group><Form.Label className="small fw-bold">Specialty</Form.Label>
                    <Form.Control size="sm" placeholder="Sub-specialty" value={formData.specialty || ''} onChange={e => setFormData(p => ({...p, specialty: e.target.value}))} />
                  </Form.Group>
                </Col>
                <Col sm={4}>
                  <Form.Group><Form.Label className="small fw-bold">Base Price (₹)</Form.Label>
                    <Form.Control size="sm" type="number" placeholder="45000" value={formData.base_price} onChange={e => setFormData(p => ({...p, base_price: e.target.value}))} />
                  </Form.Group>
                </Col>
                <Col sm={4}>
                  <Form.Group><Form.Label className="small fw-bold">GST %</Form.Label>
                    <Form.Control size="sm" type="number" value={formData.gst_percent} onChange={e => setFormData(p => ({...p, gst_percent: e.target.value}))} />
                  </Form.Group>
                </Col>
                <Col sm={4}>
                  <Form.Group><Form.Label className="small fw-bold">ICU Days</Form.Label>
                    <Form.Control size="sm" type="number" value={formData.icu_days} onChange={e => setFormData(p => ({...p, icu_days: e.target.value}))} />
                  </Form.Group>
                </Col>
                <Col sm={12}>
                  <Form.Group><Form.Label className="small fw-bold">Description</Form.Label>
                    <Form.Control as="textarea" size="sm" rows={2} value={formData.description || ''} onChange={e => setFormData(p => ({...p, description: e.target.value}))} />
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Check type="switch" label="TPA Eligible" checked={formData.tpa_eligible} onChange={e => setFormData(p => ({...p, tpa_eligible: e.target.checked}))} />
                </Col>
                <Col sm={6}>
                  <Form.Group><Form.Label className="small fw-bold">PMJAY Code</Form.Label>
                    <Form.Control size="sm" placeholder="Optional" value={formData.pmjay_code || ''} onChange={e => setFormData(p => ({...p, pmjay_code: e.target.value}))} />
                  </Form.Group>
                </Col>
              </Row>
            </Col>

            {/* Right: BOUNDARY RULES — The CFO cares about this */}
            <Col md={6}>
              <h6 className="text-danger border-bottom border-danger pb-1 mb-3">🛡️ Strict Boundary Rules (Billing Interceptor)</h6>
              <Alert variant="warning" className="py-1 px-2 small">
                <strong>⚡ Revenue Protection:</strong> These limits are enforced in real-time by the Billing Interceptor. Any overage is automatically billed as an "Out of Package" extra charge.
              </Alert>

              {/* Room Rules */}
              <Card className="mb-2 border-info">
                <Card.Header className="py-1 px-2 bg-info bg-opacity-10"><small className="fw-bold">🛏️ Room Charge Rules</small></Card.Header>
                <Card.Body className="p-2">
                  <Row className="g-2">
                    <Col sm={6}>
                      <Form.Group><Form.Label className="small">Max Stay Days</Form.Label>
                        <Form.Control size="sm" type="number" value={formData.inclusions.max_room_days} onChange={e => setFormData(p => ({...p, stay_days: e.target.value, inclusions: {...p.inclusions, max_room_days: parseInt(e.target.value) || 0}}))} />
                      </Form.Group>
                    </Col>
                    <Col sm={6}>
                      <Form.Group><Form.Label className="small">Included Room Type</Form.Label>
                        <Form.Select size="sm" value={formData.inclusions.included_room_type} onChange={e => setFormData(p => ({...p, room_type: e.target.value, inclusions: {...p.inclusions, included_room_type: e.target.value}}))}>
                          {ROOM_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <small className="text-muted mt-1 d-block">Upgrade from {formData.inclusions.included_room_type} → Private will bill the difference automatically.</small>
                </Card.Body>
              </Card>

              {/* Pharmacy Cap */}
              <Card className="mb-2 border-warning">
                <Card.Header className="py-1 px-2 bg-warning bg-opacity-10"><small className="fw-bold">💊 Pharmacy Cap</small></Card.Header>
                <Card.Body className="p-2">
                  <Form.Group>
                    <Form.Label className="small">Maximum Pharmacy Spend (₹)</Form.Label>
                    <Form.Control size="sm" type="number" placeholder="5000" value={formData.inclusions.pharmacy_cap_amount} onChange={e => setFormData(p => ({...p, inclusions: {...p.inclusions, pharmacy_cap_amount: parseInt(e.target.value) || 0}}))} />
                  </Form.Group>
                  <small className="text-muted">When cumulative pharmacy spend hits this cap, further meds are billed as extras.</small>
                </Card.Body>
              </Card>

              {/* Included Diagnostic Tests */}
              <Card className="mb-2 border-success">
                <Card.Header className="py-1 px-2 bg-success bg-opacity-10"><small className="fw-bold">🧪 Included Diagnostic Tests</small></Card.Header>
                <Card.Body className="p-2">
                  <div className="mb-2">
                    {(formData.inclusions.included_tests || []).map((t, i) => (
                      <Badge key={i} bg="success" className="me-1 mb-1" style={{cursor:'pointer'}} onClick={() => removeTest(i)}>{t} ✕</Badge>
                    ))}
                    {formData.inclusions.included_tests?.length === 0 && <small className="text-muted">No tests added yet</small>}
                  </div>
                  <InputGroup size="sm">
                    <Form.Control placeholder="CBC, Hemoglobin, X-Ray..." value={newTest} onChange={e => setNewTest(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTest())} />
                    <Button variant="success" onClick={addTest}>Add</Button>
                  </InputGroup>
                  <small className="text-muted">Only these tests are covered. Any other test triggers a standard invoice charge.</small>
                </Card.Body>
              </Card>

              {/* Itemized Limits */}
              <Card className="mb-2 border-danger">
                <Card.Header className="py-1 px-2 bg-danger bg-opacity-10"><small className="fw-bold">📋 Itemized Quantity Limits</small></Card.Header>
                <Card.Body className="p-2">
                  <div className="mb-2">
                    {Object.entries(formData.inclusions.itemized_limits || {}).map(([k, v]) => (
                      <div key={k} className="d-flex justify-content-between align-items-center mb-1">
                        <span><strong>{k}</strong>: max <Badge bg="danger">{v}</Badge></span>
                        <Button size="sm" variant="outline-danger" className="py-0" onClick={() => removeItemLimit(k)}>✕</Button>
                      </div>
                    ))}
                    {Object.keys(formData.inclusions.itemized_limits || {}).length === 0 && <small className="text-muted">No item limits yet</small>}
                  </div>
                  <InputGroup size="sm">
                    <Form.Control placeholder="Item name (e.g. Paracetamol IV)" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                    <Form.Control type="number" placeholder="Max qty" style={{maxWidth: 80}} value={newItemLimit} onChange={e => setNewItemLimit(e.target.value)} />
                    <Button variant="danger" onClick={addItemLimit}>Add</Button>
                  </InputGroup>
                  <small className="text-muted">When the nurse scans the 6th syringe and the limit is 5, the billing engine catches it.</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreatePackage} disabled={saving || !formData.code || !formData.name || !formData.base_price}>
            {saving ? <><Spinner size="sm" className="me-1" />Saving...</> : '✅ Create Package'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: ASSIGN PACKAGE TO PATIENT
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} size="md">
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>Assign Package to Patient</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2"><Form.Label className="small fw-bold">Patient ID (UUID)</Form.Label>
            <Form.Control size="sm" placeholder="Patient UUID" value={assignData.patient_id} onChange={e => setAssignData(p => ({...p, patient_id: e.target.value}))} />
          </Form.Group>
          <Form.Group className="mb-2"><Form.Label className="small fw-bold">Admission ID (optional)</Form.Label>
            <Form.Control size="sm" type="number" value={assignData.admission_id} onChange={e => setAssignData(p => ({...p, admission_id: e.target.value}))} />
          </Form.Group>
          <Form.Group className="mb-2"><Form.Label className="small fw-bold">Package</Form.Label>
            <Form.Select size="sm" value={assignData.package_id} onChange={e => setAssignData(p => ({...p, package_id: e.target.value}))}>
              <option value="">Select Package...</option>
              {packages.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.base_price)})</option>)}
            </Form.Select>
          </Form.Group>
          <Row className="g-2">
            <Col><Form.Group><Form.Label className="small fw-bold">Discount %</Form.Label>
              <Form.Control size="sm" type="number" value={assignData.discount_percent} onChange={e => setAssignData(p => ({...p, discount_percent: e.target.value}))} />
            </Form.Group></Col>
            <Col><Form.Group><Form.Label className="small fw-bold">Advance Paid (₹)</Form.Label>
              <Form.Control size="sm" type="number" value={assignData.advance_paid} onChange={e => setAssignData(p => ({...p, advance_paid: e.target.value}))} />
            </Form.Group></Col>
          </Row>
          <Form.Group className="mt-2"><Form.Label className="small fw-bold">Notes</Form.Label>
            <Form.Control as="textarea" size="sm" rows={2} value={assignData.notes} onChange={e => setAssignData(p => ({...p, notes: e.target.value}))} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
          <Button variant="success" onClick={handleAssignPackage} disabled={saving || !assignData.patient_id || !assignData.package_id}>
            {saving ? <><Spinner size="sm" className="me-1" />Assigning...</> : 'Assign Package'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MODAL: PACKAGE DETAIL / BOUNDARY RULES VIEW
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton className="bg-dark text-white">
          <Modal.Title>{selectedPkg?.name || 'Package Detail'}</Modal.Title>
        </Modal.Header>
        {selectedPkg && (() => {
          const inc = parseInclusions(selectedPkg.inclusions);
          return (
            <Modal.Body>
              <Row className="g-3">
                <Col md={6}>
                  <h6 className="text-primary">📋 Package Info</h6>
                  <Table bordered size="sm">
                    <tbody>
                      <tr><td className="fw-bold">Code</td><td><code>{selectedPkg.code}</code></td></tr>
                      <tr><td className="fw-bold">Category</td><td><Badge bg="info">{selectedPkg.category}</Badge></td></tr>
                      <tr><td className="fw-bold">Base Price</td><td className="text-success fw-bold">{formatCurrency(selectedPkg.base_price)}</td></tr>
                      <tr><td className="fw-bold">Stay Days</td><td>{selectedPkg.stay_days || 0}</td></tr>
                      <tr><td className="fw-bold">Room Type</td><td>{selectedPkg.room_type}</td></tr>
                      <tr><td className="fw-bold">Status</td><td>{selectedPkg.is_active ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Inactive</Badge>}</td></tr>
                    </tbody>
                  </Table>
                </Col>
                <Col md={6}>
                  <h6 className="text-danger">🛡️ Billing Interceptor Rules</h6>
                  <Card className="mb-2 border-info">
                    <Card.Body className="p-2">
                      <small className="fw-bold">🛏️ Room:</small> {inc.max_room_days} days in <Badge bg="info">{inc.included_room_type}</Badge>
                      <br/><small className="text-danger">Upgrade or overstay → auto-billed</small>
                    </Card.Body>
                  </Card>
                  <Card className="mb-2 border-warning">
                    <Card.Body className="p-2">
                      <small className="fw-bold">💊 Pharmacy Cap:</small> <span className="text-success fw-bold">{formatCurrency(inc.pharmacy_cap_amount)}</span>
                      <br/><small className="text-danger">Beyond cap → extra charge</small>
                    </Card.Body>
                  </Card>
                  <Card className="mb-2 border-success">
                    <Card.Body className="p-2">
                      <small className="fw-bold">🧪 Tests ({(inc.included_tests || []).length}):</small><br/>
                      {(inc.included_tests || []).map((t, i) => <Badge key={i} bg="light" className="text-dark border me-1 mb-1">{t}</Badge>)}
                      {(!inc.included_tests || inc.included_tests.length === 0) && <small className="text-muted">None</small>}
                    </Card.Body>
                  </Card>
                  <Card className="mb-2 border-danger">
                    <Card.Body className="p-2">
                      <small className="fw-bold">📋 Item Limits:</small>
                      {Object.entries(inc.itemized_limits || {}).map(([k, v]) => (
                        <div key={k}><small>{k}: max <Badge bg="danger">{v}</Badge></small></div>
                      ))}
                      {Object.keys(inc.itemized_limits || {}).length === 0 && <small className="text-muted">No limits</small>}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Modal.Body>
          );
        })()}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TreatmentPackageManager;
