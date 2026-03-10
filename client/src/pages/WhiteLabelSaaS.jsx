import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, Button, Modal, Form } from 'react-bootstrap';

const WhiteLabelSaaS = () => {
    const [activeTab, setActiveTab] = useState('tenants');
    const [showNewTenant, setShowNewTenant] = useState(false);

    const tenants = [
        { id: 'tenant-wolf', name: 'Wolf HMS (Master)', domain: 'app.wolfhms.in', plan: 'Enterprise', users: 85, status: 'Active', color: '#1a1a2e', logo: '🐺', beds: 200, since: '2025-01' },
        { id: 'tenant-city', name: 'City Care Hospital', domain: 'citycare.wolfhms.in', plan: 'Professional', users: 42, status: 'Active', color: '#0d6efd', logo: '🏥', beds: 120, since: '2025-06' },
        { id: 'tenant-sunrise', name: 'Sunrise Medical Center', domain: 'sunrise.wolfhms.in', plan: 'Professional', users: 28, status: 'Active', color: '#fd7e14', logo: '🌅', beds: 75, since: '2025-09' },
        { id: 'tenant-green', name: 'Green Valley Clinic', domain: 'greenvalley.wolfhms.in', plan: 'Starter', users: 12, status: 'Active', color: '#198754', logo: '🌿', beds: 30, since: '2025-11' },
        { id: 'tenant-demo', name: 'Demo Hospital', domain: 'demo.wolfhms.in', plan: 'Trial', users: 5, status: 'Trial', color: '#6c757d', logo: '🧪', beds: 10, since: '2026-02' },
    ];

    const plans = [
        { name: 'Starter', price: '₹15,000/mo', beds: 'Up to 50', users: 15, modules: 'Core (OPD/IPD/Billing/Pharmacy)', support: 'Email', sla: '99%' },
        { name: 'Professional', price: '₹45,000/mo', beds: 'Up to 200', users: 50, modules: 'All Standard + Lab + Blood Bank + OT', support: 'Email + Phone', sla: '99.5%' },
        { name: 'Enterprise', price: '₹1,20,000/mo', beds: 'Unlimited', users: 'Unlimited', modules: 'All Modules + AI + Analytics + Guard', support: '24/7 Dedicated', sla: '99.9%' },
    ];

    const branding = [
        { setting: 'Primary Color', desc: 'Main theme color for sidebar, buttons', type: 'color' },
        { setting: 'Logo', desc: 'Hospital logo (PNG/SVG, 200x60px)', type: 'file' },
        { setting: 'Favicon', desc: 'Browser tab icon (32x32px)', type: 'file' },
        { setting: 'Hospital Name', desc: 'Displayed in header and reports', type: 'text' },
        { setting: 'Custom Domain', desc: 'e.g., ehr.yourhospital.com', type: 'text' },
        { setting: 'Login Background', desc: 'Login page background image', type: 'file' },
        { setting: 'Report Header', desc: 'Letterhead for printed reports', type: 'file' },
        { setting: 'Footer Text', desc: 'Disclaimer/copyright in reports', type: 'text' },
    ];

    const statusColor = (s) => ({ Active: 'success', Trial: 'warning', Suspended: 'danger' }[s] || 'secondary');

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">☁️ White-Label SaaS Platform</h3>
                <Button variant="primary" onClick={() => setShowNewTenant(true)}>➕ New Tenant</Button>
            </div>

            <Row className="mb-4 g-3">
                {[
                    { t: 'Active Tenants', v: tenants.filter(t => t.status === 'Active').length, c: 'success' },
                    { t: 'Total Users', v: tenants.reduce((s, t) => s + t.users, 0), c: 'primary' },
                    { t: 'Total Beds', v: tenants.reduce((s, t) => s + t.beds, 0), c: 'info' },
                    { t: 'MRR', v: '₹2,40,000', c: 'success' },
                ].map((k, i) => (
                    <Col md={3} key={i}><Card className="border-0 shadow-sm text-center"><Card.Body className="py-3"><small className="text-muted">{k.t}</small><h4 className={`fw-bold text-${k.c} mb-0`}>{k.v}</h4></Card.Body></Card></Col>
                ))}
            </Row>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                <Tab eventKey="tenants" title="🏢 Tenants">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>Hospital</th><th>Domain</th><th>Plan</th><th>Users</th><th>Beds</th><th>Since</th><th>Status</th><th>Brand</th></tr></thead>
                        <tbody>{tenants.map(t => (
                            <tr key={t.id}>
                                <td><strong>{t.logo} {t.name}</strong></td>
                                <td><code className="small">{t.domain}</code></td>
                                <td><Badge bg={t.plan === 'Enterprise' ? 'primary' : t.plan === 'Professional' ? 'info' : t.plan === 'Starter' ? 'success' : 'secondary'}>{t.plan}</Badge></td>
                                <td>{t.users}</td><td>{t.beds}</td>
                                <td><small>{t.since}</small></td>
                                <td><Badge bg={statusColor(t.status)}>● {t.status}</Badge></td>
                                <td><div style={{ width: 24, height: 24, borderRadius: 4, background: t.color }} /></td>
                            </tr>
                        ))}</tbody>
                    </Table></Card>
                </Tab>

                <Tab eventKey="plans" title="💰 Plans & Pricing">
                    <Row className="g-3">{plans.map(p => (
                        <Col md={4} key={p.name}>
                            <Card className={`shadow-sm border-0 h-100 ${p.name === 'Enterprise' ? 'border-primary border-2' : ''}`}>
                                <Card.Header className={`text-center ${p.name === 'Enterprise' ? 'bg-primary text-white' : 'bg-light'}`}>
                                    <h5 className="fw-bold mb-0">{p.name}</h5>
                                </Card.Header>
                                <Card.Body className="text-center">
                                    <h3 className="fw-bold text-primary mb-3">{p.price}</h3>
                                    <Table size="sm" borderless><tbody>
                                        <tr><td className="text-muted">Beds</td><td className="fw-bold">{p.beds}</td></tr>
                                        <tr><td className="text-muted">Users</td><td className="fw-bold">{p.users}</td></tr>
                                        <tr><td className="text-muted">Modules</td><td><small>{p.modules}</small></td></tr>
                                        <tr><td className="text-muted">Support</td><td>{p.support}</td></tr>
                                        <tr><td className="text-muted">SLA</td><td className="fw-bold">{p.sla}</td></tr>
                                    </tbody></Table>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}</Row>
                </Tab>

                <Tab eventKey="branding" title="🎨 Branding Config">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>Setting</th><th>Description</th><th>Type</th><th>Action</th></tr></thead>
                        <tbody>{branding.map(b => (
                            <tr key={b.setting}>
                                <td><strong>{b.setting}</strong></td><td><small>{b.desc}</small></td>
                                <td><Badge bg="secondary">{b.type}</Badge></td>
                                <td>{b.type === 'color' ? <Form.Control type="color" size="sm" style={{ width: 40 }} /> : b.type === 'file' ? <Button size="sm" variant="outline-primary">📁 Upload</Button> : <Form.Control size="sm" placeholder={b.desc} style={{ width: 200 }} />}</td>
                            </tr>
                        ))}</tbody>
                    </Table></Card>
                </Tab>
            </Tabs>

            <Modal show={showNewTenant} onHide={() => setShowNewTenant(false)} size="lg">
                <Modal.Header closeButton className="bg-primary text-white"><Modal.Title>🏢 Onboard New Hospital</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Hospital Name</Form.Label><Form.Control placeholder="e.g. Apollo Hospital" /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Subdomain</Form.Label><Form.Control placeholder="apollo.wolfhms.in" /></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Plan</Form.Label><Form.Select>{plans.map(p => <option key={p.name}>{p.name}</option>)}</Form.Select></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Bed Capacity</Form.Label><Form.Control type="number" placeholder="100" /></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Primary Color</Form.Label><Form.Control type="color" defaultValue="#0d6efd" /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Admin Email</Form.Label><Form.Control type="email" placeholder="admin@hospital.com" /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Admin Phone</Form.Label><Form.Control placeholder="+91 XXXXX XXXXX" /></Form.Group></Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowNewTenant(false)}>Cancel</Button><Button variant="primary" onClick={() => { alert('✅ Tenant provisioned!'); setShowNewTenant(false); }}>🚀 Provision Tenant</Button></Modal.Footer>
            </Modal>
        </Container>
    );
};

export default WhiteLabelSaaS;
