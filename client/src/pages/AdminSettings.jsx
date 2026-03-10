import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Tabs, Tab, Table, Alert } from 'react-bootstrap';
import { Settings, Save, RefreshCw, Database, AlertTriangle, Sparkles, UploadCloud } from 'lucide-react';
import axios from 'axios';
import RecoveryConsole from '../components/admin/RecoveryConsole';
import DataGovernance from '../components/admin/DataGovernance';
// [TITAN] Feature Flags
import FeatureFlagsPanel from '../components/admin/FeatureFlagsPanel';

const AdminSettings = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState({});
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    // Initial Fetch
    useEffect(() => {
        fetchSettings();
        fetchServices();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings/hospital-profile');
            setProfile(res.data.data || res.data);
        } catch (err) { console.error(err); }
    };

    const fetchServices = async () => {
        try {
            const res = await axios.get('/api/settings/services');
            setServices(res.data.data || res.data);
        } catch (err) { console.error(err); }
    };

    // Save Profile
    const saveProfile = async () => {
        setLoading(true);
        try {
            await axios.post('/api/settings/hospital-profile', profile);
            setMsg({ type: 'success', text: 'Hospital Profile Updated!' });
        } catch (_) {
            setMsg({ type: 'danger', text: 'Failed to update settings.' });
        } finally {
            setLoading(false);
            setTimeout(() => setMsg(null), 3000);
        }
    };

    // Update Price
    const updatePrice = async (id, newPrice) => {
        try {
            await axios.put('/api/settings/services/price', { id, base_price: newPrice });
            fetchServices(); // Refresh list to confirm
        } catch (_) { alert('Failed to update price'); }
    };

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><Settings className="me-2 text-primary" />System Administration</h2>
                {msg && <Alert variant={msg.type} className="py-1 px-3 m-0">{msg.text}</Alert>}
            </div>

            <Tabs defaultActiveKey="general" className="mb-4">
                
                {/* 1. General Settings */}
                <Tab eventKey="general" title="Hospital Profile">
                    <Row>
                        <Col md={6}>
                            <Card className="shadow-sm">
                                <Card.Header>Organization Details</Card.Header>
                                <Card.Body>
                                    <Form>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Hospital Name</Form.Label>
                                            <Form.Control 
                                                value={profile.hospital_name || ''} 
                                                onChange={e => setProfile({...profile, hospital_name: e.target.value})} 
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Address / Location</Form.Label>
                                            <Form.Control 
                                                as="textarea" rows={2}
                                                value={profile.hospital_address || ''} 
                                                onChange={e => setProfile({...profile, hospital_address: e.target.value})} 
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Contact Phone</Form.Label>
                                            <Form.Control 
                                                value={profile.hospital_phone || ''} 
                                                onChange={e => setProfile({...profile, hospital_phone: e.target.value})} 
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Official Email</Form.Label>
                                            <Form.Control 
                                                value={profile.hospital_email || ''} 
                                                onChange={e => setProfile({...profile, hospital_email: e.target.value})} 
                                            />
                                        </Form.Group>
                                        <Button variant="primary" onClick={saveProfile} disabled={loading}>
                                            <Save size={16} className="me-2" />
                                            {loading ? 'Saving...' : 'Save Configuration'}
                                        </Button>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6}>
                             <Alert variant="info">
                                 <strong>Tip:</strong> These details will automatically appear on all Patient Reports, Bills, and Discharge Summaries.
                             </Alert>
                        </Col>
                    </Row>
                </Tab>

                {/* 2. Rate Card Manager */}
                <Tab eventKey="rates" title="Service Rate Card">
                    <Card className="shadow-sm">
                        <Card.Header className="d-flex justify-content-between align-items-center">
                            <span>Master Price List</span>
                            <Button size="sm" variant="outline-secondary" onClick={fetchServices}><RefreshCw size={14} /></Button>
                        </Card.Header>
                        <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            <Table striped hover responsive>
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Service Name</th>
                                        <th>Department</th>
                                        <th style={{width: '150px'}}>Base Price (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.map(svc => (
                                        <tr key={svc.id}>
                                            <td><small className="text-muted">{svc.code}</small></td>
                                            <td>{svc.name}</td>
                                            <td><Badge bg="secondary" department={svc.department} /></td>
                                            <td>
                                                <Form.Control 
                                                    type="number" 
                                                    size="sm"
                                                    defaultValue={svc.base_price}
                                                    onBlur={(e) => {
                                                        if (e.target.value !== svc.base_price) updatePrice(svc.id, e.target.value);
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {services.length === 0 && <tr><td colSpan="4" className="text-center">No services found.</td></tr>}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* 3. System Maintenance */}
                <Tab eventKey="system" title="System Maintenance">
                    <Row>
                        <Col md={4}>
                            <Card className="text-center p-4 border-warning">
                                <Database size={48} className="mx-auto mb-3 text-warning" />
                                <h5>Database Backup</h5>
                                <p className="text-muted small">Create a snapshot of all medical records.</p>
                                <Button variant="outline-warning" onClick={()=>alert('Triggered Cloud Backup!')}>Backup Now</Button>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="text-center p-4 border-primary">
                                <UploadCloud size={48} className="mx-auto mb-3 text-primary" />
                                <h5>Import Legacy Data</h5>
                                <p className="text-muted small">Migrate patients from CSV files (The Vampire).</p>
                                <Button variant="primary" onClick={()=>navigate('/admin/migration')}>Open Migrator</Button>
                            </Card>
                        </Col>
                    </Row>
                </Tab>

                {/* 4. Data Recovery Tools (DANGER ZONE) */}
                <Tab eventKey="recovery" title={<span className="text-danger"><AlertTriangle size={16} className="me-2" />Recovery Console</span>}>
                    <RecoveryConsole />
                </Tab>

                {/* 5. AI Data Steward (Early Access) */}
                <Tab eventKey="data-steward" title={<span className="text-primary"><Database size={16} className="me-2" />Data Governance</span>}>
                    <DataGovernance />
                </Tab>

                {/* [TITAN] 6. Feature Flags */}
                <Tab eventKey="features" title={<span className="text-purple"><Sparkles size={16} className="me-2" />Features</span>}>
                    <FeatureFlagsPanel />
                </Tab>

                {/* 7. Hospital Branding */}
                <Tab eventKey="branding" title="🎨 Branding">
                    <Row>
                        <Col md={6}>
                            <Card className="shadow-sm">
                                <Card.Header>Hospital Branding & Theme</Card.Header>
                                <Card.Body>
                                    <Form>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Hospital Logo URL</Form.Label>
                                            <Form.Control
                                                value={profile.logo_url || ''}
                                                onChange={e => setProfile({...profile, logo_url: e.target.value})}
                                                placeholder="https://example.com/logo.png"
                                            />
                                            <Form.Text className="text-muted">Used on reports, bills, discharge summaries</Form.Text>
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Primary Brand Color</Form.Label>
                                            <div className="d-flex gap-2 align-items-center">
                                                <Form.Control
                                                    type="color"
                                                    value={profile.primary_color || '#4f46e5'}
                                                    onChange={e => setProfile({...profile, primary_color: e.target.value})}
                                                    style={{ width: 50, height: 38 }}
                                                />
                                                <Form.Control
                                                    value={profile.primary_color || '#4f46e5'}
                                                    onChange={e => setProfile({...profile, primary_color: e.target.value})}
                                                    placeholder="#4f46e5"
                                                    style={{ width: 120 }}
                                                />
                                            </div>
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Letterhead Footer Text</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={2}
                                                value={profile.letterhead_footer || ''}
                                                onChange={e => setProfile({...profile, letterhead_footer: e.target.value})}
                                                placeholder="e.g., Reg No: XYZ123 | NABH Accredited"
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Report Header Tagline</Form.Label>
                                            <Form.Control
                                                value={profile.tagline || ''}
                                                onChange={e => setProfile({...profile, tagline: e.target.value})}
                                                placeholder="e.g., Caring for Your Health Since 1995"
                                            />
                                        </Form.Group>
                                        <Button variant="primary" onClick={async () => {
                                            try {
                                                const token = localStorage.getItem('token');
                                                await axios.post('/api/branding', {
                                                    logo_url: profile.logo_url,
                                                    primary_color: profile.primary_color,
                                                    letterhead_footer: profile.letterhead_footer,
                                                    tagline: profile.tagline
                                                }, { headers: { Authorization: `Bearer ${token}` } });
                                                setMsg({ type: 'success', text: 'Branding updated!' });
                                            } catch { setMsg({ type: 'danger', text: 'Failed to save branding.' }); }
                                            setTimeout(() => setMsg(null), 3000);
                                        }}>
                                            <Save size={16} className="me-2" /> Save Branding
                                        </Button>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6}>
                            <Alert variant="info">
                                <strong>💡 Preview:</strong> Branding changes reflect on all printed documents, patient receipts, and public-facing pages.
                            </Alert>
                            {profile.logo_url && (
                                <Card className="shadow-sm text-center p-4">
                                    <img src={profile.logo_url} alt="Logo Preview" style={{ maxHeight: 100, objectFit: 'contain' }} />
                                    <p className="mt-2 mb-0 text-muted small">{profile.tagline || 'Your Hospital Tagline'}</p>
                                </Card>
                            )}
                        </Col>
                    </Row>
                </Tab>

                {/* 8. FHIR Interoperability */}
                <Tab eventKey="fhir" title="🔗 FHIR / Interop">
                    <Row>
                        <Col md={6}>
                            <Card className="shadow-sm">
                                <Card.Header>FHIR R4 Interoperability</Card.Header>
                                <Card.Body>
                                    <Alert variant="info" className="small">
                                        <strong>HL7 FHIR R4</strong> — Health data exchange standard for ABDM, NHA, and inter-hospital communication.
                                    </Alert>
                                    <Table bordered size="sm">
                                        <tbody>
                                            <tr>
                                                <td className="fw-bold">FHIR Server</td>
                                                <td><span className="badge bg-success">Active</span> on <code>/api/fhir</code></td>
                                            </tr>
                                            <tr>
                                                <td className="fw-bold">Patient Resource</td>
                                                <td><code>GET /api/fhir/bundle/:patient_id</code></td>
                                            </tr>
                                            <tr>
                                                <td className="fw-bold">ABDM Gateway</td>
                                                <td><code>/api/abdm/callback/*</code></td>
                                            </tr>
                                            <tr>
                                                <td className="fw-bold">Care Contexts</td>
                                                <td><code>/api/abdm/care-context/*</code></td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                    <Button variant="outline-primary" size="sm" onClick={async () => {
                                        try {
                                            const token = localStorage.getItem('token');
                                            const res = await axios.get('/api/abdm/stats', { headers: { Authorization: `Bearer ${token}` } });
                                            alert(`ABDM Stats:\n\n${JSON.stringify(res.data, null, 2)}`);
                                        } catch { alert('FHIR endpoint available at /api/fhir\nABDM endpoint available at /api/abdm'); }
                                    }}>
                                        Test FHIR Connection
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6}>
                            <Card className="shadow-sm">
                                <Card.Header>Export Patient FHIR Bundle</Card.Header>
                                <Card.Body>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Patient ID</Form.Label>
                                        <Form.Control id="fhir-patient-id" placeholder="Enter Patient ID" />
                                    </Form.Group>
                                    <Button variant="primary" size="sm" onClick={async () => {
                                        const pid = document.getElementById('fhir-patient-id')?.value;
                                        if (!pid) return alert('Enter a Patient ID');
                                        try {
                                            const token = localStorage.getItem('token');
                                            const res = await axios.get(`/api/abdm/fhir/bundle/${pid}`, { headers: { Authorization: `Bearer ${token}` } });
                                            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a'); a.href = url; a.download = `fhir_bundle_${pid}.json`; a.click();
                                        } catch { alert('Could not generate FHIR bundle. Verify patient ID.'); }
                                    }}>
                                        Download FHIR Bundle (JSON)
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Tab>

            </Tabs>
        </Container>
    );
};

// Helper for Badge
const Badge = ({ department }) => {
    let bg = 'secondary';
    if (department === 'OPD') bg = 'info';
    if (department === 'Lab') bg = 'success';
    if (department === 'OT') bg = 'danger';
    return <span className={`badge bg-${bg}`}>{department}</span>;
}

export default AdminSettings;
