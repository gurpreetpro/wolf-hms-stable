import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form } from 'react-bootstrap';

const TreatmentPackageManager = () => {
  const [activeTab, setActiveTab] = useState('catalog');

  const packages = [
    { id: 'PKG-001', name: 'Normal Delivery Package', category: 'Obstetrics', inclusions: 'Room (3D), OB consultant, Pediatrician, Nursing, Medicines, Lab, Diet', price: 'Rs.45,000', validity: '3 days', status: 'Active', assigned: 12 },
    { id: 'PKG-002', name: 'LSCS (C-Section) Package', category: 'Obstetrics', inclusions: 'Room (5D), Surgeon, Anesthetist, OT charges, Medicines, Lab, Diet', price: 'Rs.85,000', validity: '5 days', status: 'Active', assigned: 8 },
    { id: 'PKG-003', name: 'Total Knee Replacement', category: 'Orthopedics', inclusions: 'Room (7D), Surgeon, Anesthetist, Implant, Physio (10), Lab, Medicines', price: 'Rs.2,50,000', validity: '7 days', status: 'Active', assigned: 3 },
    { id: 'PKG-004', name: 'Appendectomy (Lap)', category: 'General Surgery', inclusions: 'Room (2D), Surgeon, Anesthetist, OT, Medicines, Lab', price: 'Rs.65,000', validity: '2 days', status: 'Active', assigned: 5 },
    { id: 'PKG-005', name: 'PTCA + Stenting', category: 'Cardiology', inclusions: 'Cath Lab, Cardiologist, Stent (DES), Room (3D), CCU (1D), Medicines', price: 'Rs.1,80,000', validity: '3 days', status: 'Active', assigned: 2 },
    { id: 'PKG-006', name: 'Cataract Surgery (Phaco)', category: 'Ophthalmology', inclusions: 'Surgeon, OT, IOL Lens, Medicines, Follow-up (2)', price: 'Rs.25,000', validity: 'Day Care', status: 'Active', assigned: 15 },
    { id: 'PKG-007', name: 'Dialysis Session', category: 'Nephrology', inclusions: 'Dialysis unit (4h), Nephrologist consult, Medicines, Monitoring', price: 'Rs.3,500', validity: 'Per Session', status: 'Active', assigned: 45 },
    { id: 'PKG-008', name: 'Full Body Health Checkup', category: 'Preventive', inclusions: '68 tests, ECG, X-Ray, Physician consult, Diet counseling', price: 'Rs.4,999', validity: 'Day Care', status: 'Active', assigned: 120 },
  ];

  const categories = [
    { name: 'Obstetrics', count: 2, revenue: 'Rs.12,30,000', topPackage: 'Normal Delivery' },
    { name: 'Orthopedics', count: 1, revenue: 'Rs.7,50,000', topPackage: 'TKR' },
    { name: 'Cardiology', count: 1, revenue: 'Rs.3,60,000', topPackage: 'PTCA + Stenting' },
    { name: 'General Surgery', count: 1, revenue: 'Rs.3,25,000', topPackage: 'Appendectomy' },
    { name: 'Ophthalmology', count: 1, revenue: 'Rs.3,75,000', topPackage: 'Cataract Phaco' },
    { name: 'Nephrology', count: 1, revenue: 'Rs.1,57,500', topPackage: 'Dialysis Session' },
    { name: 'Preventive', count: 1, revenue: 'Rs.5,99,880', topPackage: 'Full Body Checkup' },
  ];

  const activeAssignments = [
    { patient: 'Meena Devi (P-1078)', package: 'Normal Delivery Package', admDate: '2026-03-01', expiry: '2026-03-04', consumed: 'Rs.32,000', limit: 'Rs.45,000', extras: 'Rs.2,500 (Ultrasound)', status: 'Active' },
    { patient: 'Rajesh Patel (P-1065)', package: 'Total Knee Replacement', admDate: '2026-02-27', expiry: '2026-03-06', consumed: 'Rs.2,10,000', limit: 'Rs.2,50,000', extras: 'Rs.8,000 (Extra physio)', status: 'Active' },
    { patient: 'Sunita Roy (P-1082)', package: 'LSCS Package', admDate: '2026-03-02', expiry: '2026-03-07', consumed: 'Rs.15,000', limit: 'Rs.85,000', extras: 'Rs.0', status: 'Day 1' },
    { patient: 'Arun Nair (P-1090)', package: 'Cataract Phaco', admDate: '2026-03-02', expiry: '2026-03-02', consumed: 'Rs.22,000', limit: 'Rs.25,000', extras: 'Rs.0', status: 'Active' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Treatment Package Manager</h4>
          <small className="text-muted">Phase 12 -- Package catalog, categories, patient assignment & extras tracking</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">+ Create Package</Button>
          <Button variant="outline-success">+ Assign to Patient</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{packages.length}</h3><small>Active Packages</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{categories.length}</h3><small>Categories</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{activeAssignments.length}</h3><small>Active Assignments</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">Rs.37.9L</h3><small>Package Revenue (MTD)</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="catalog" title="Package Catalog">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>ID</th><th>Package Name</th><th>Category</th><th>Inclusions</th><th>Price</th><th>Validity</th><th>Assigned</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {packages.map((p, i) => (
                    <tr key={i}>
                      <td><code>{p.id}</code></td>
                      <td><strong>{p.name}</strong></td>
                      <td><Badge bg="info">{p.category}</Badge></td>
                      <td><small>{p.inclusions}</small></td>
                      <td className="fw-bold text-success">{p.price}</td>
                      <td><small>{p.validity}</small></td>
                      <td className="text-center"><Badge bg="primary">{p.assigned}</Badge></td>
                      <td><Badge bg="success">{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="categories" title="Categories">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Category</th><th>Packages</th><th>Revenue (MTD)</th><th>Top Package</th></tr>
                </thead>
                <tbody>
                  {categories.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.name}</strong></td>
                      <td className="text-center">{c.count}</td>
                      <td className="text-success fw-bold">{c.revenue}</td>
                      <td><small>{c.topPackage}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="assignments" title={<span>Active Assignments <Badge bg="info">{activeAssignments.length}</Badge></span>}>
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Patient</th><th>Package</th><th>Admitted</th><th>Expiry</th><th>Consumed</th><th>Limit</th><th>Extras</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {activeAssignments.map((a, i) => (
                    <tr key={i}>
                      <td><strong>{a.patient}</strong></td>
                      <td><small>{a.package}</small></td>
                      <td><small>{a.admDate}</small></td>
                      <td><small>{a.expiry}</small></td>
                      <td className="text-danger fw-bold">{a.consumed}</td>
                      <td className="text-success">{a.limit}</td>
                      <td>{a.extras !== 'Rs.0' ? <span className="text-warning">{a.extras}</span> : <small className="text-muted">None</small>}</td>
                      <td><Badge bg="success">{a.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default TreatmentPackageManager;
