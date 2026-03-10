import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Tabs, Tab, Alert, ProgressBar } from 'react-bootstrap';

const EMARDashboard = () => {
  const [activeTab, setActiveTab] = useState('due');
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const dueMedications = [
    { id: 1, patient: 'Rajesh Kumar', bed: 'A-101', mrn: 'MRN-1045', medication: 'Metformin 500mg', route: 'PO', time: '12:00 PM', status: 'Due', dose: '500mg', frequency: 'BD', prescriber: 'Dr. Sharma', barcode: 'MED-MTF-500' },
    { id: 2, patient: 'Rajesh Kumar', bed: 'A-101', mrn: 'MRN-1045', medication: 'Atorvastatin 20mg', route: 'PO', time: '12:00 PM', status: 'Due', dose: '20mg', frequency: 'OD', prescriber: 'Dr. Sharma', barcode: 'MED-ATV-020' },
    { id: 3, patient: 'Anita Desai', bed: 'A-103', mrn: 'MRN-1078', medication: 'Ceftriaxone 1g', route: 'IV', time: '12:00 PM', status: 'Due', dose: '1g', frequency: 'BD', prescriber: 'Dr. Patel', barcode: 'MED-CFX-1000' },
    { id: 4, patient: 'Suresh Menon', bed: 'B-205', mrn: 'MRN-1023', medication: 'Enoxaparin 40mg', route: 'SC', time: '12:00 PM', status: 'Overdue', dose: '40mg', frequency: 'OD', prescriber: 'Dr. Reddy', barcode: 'MED-ENX-040' },
    { id: 5, patient: 'Priya Singh', bed: 'B-208', mrn: 'MRN-1056', medication: 'Pantoprazole 40mg', route: 'IV', time: '12:00 PM', status: 'Due', dose: '40mg', frequency: 'OD', prescriber: 'Dr. Sharma', barcode: 'MED-PNT-040' },
    { id: 6, patient: 'Mohammed Ali', bed: 'ICU-3', mrn: 'MRN-1089', medication: 'Insulin Glargine 10U', route: 'SC', time: '12:00 PM', status: 'Due', dose: '10U', frequency: 'OD', prescriber: 'Dr. Khan', barcode: 'MED-INS-010' },
  ];

  const administeredMeds = [
    { id: 101, patient: 'Rajesh Kumar', medication: 'Metformin 500mg', time: '08:00 AM', nurse: 'Nurse Meera', barcodeVerified: true, status: 'Given', notes: '' },
    { id: 102, patient: 'Anita Desai', medication: 'Ceftriaxone 1g', time: '08:00 AM', nurse: 'Nurse Priya', barcodeVerified: true, status: 'Given', notes: '' },
    { id: 103, patient: 'Lakshmi Nair', medication: 'Paracetamol 1g', time: '08:30 AM', nurse: 'Nurse Ritu', barcodeVerified: true, status: 'Given', notes: '' },
    { id: 104, patient: 'Vikram Iyer', medication: 'Ondansetron 4mg', time: '09:00 AM', nurse: 'Nurse Meera', barcodeVerified: false, status: 'Held', notes: 'Patient vomiting — held per physician' },
    { id: 105, patient: 'Suresh Menon', medication: 'Amlodipine 5mg', time: '08:00 AM', nurse: 'Nurse Priya', barcodeVerified: true, status: 'Given', notes: '' },
  ];

  const prnMeds = [
    { patient: 'Rajesh Kumar', medication: 'Paracetamol 1g PRN', lastGiven: '06:00 AM', nextEligible: '12:00 PM', reason: 'Pain Score > 4' },
    { patient: 'Anita Desai', medication: 'Tramadol 50mg PRN', lastGiven: '10:00 AM', nextEligible: '02:00 PM', reason: 'Post-op pain' },
    { patient: 'Mohammed Ali', medication: 'Insulin Lispro Sliding Scale', lastGiven: '08:00 AM', nextEligible: '12:00 PM', reason: 'CBG > 200' },
  ];

  const statusColor = (s) => s === 'Overdue' ? 'danger' : s === 'Due' ? 'warning' : s === 'Given' ? 'success' : 'secondary';

  const handleBarcodeScan = () => {
    setScanResult({ verified: true, patient: 'Rajesh Kumar', medication: 'Metformin 500mg', dose: '500mg', match: '5 Rights Verified ✅' });
  };

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">💊 Electronic Medication Administration Record (eMAR)</h4>
          <small className="text-muted">Phase 6 S-Tier — Barcode-verified medication administration at bedside</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary" onClick={() => { setShowScanModal(true); setScanResult(null); }}>📱 Barcode Scan</Button>
          <Button variant="outline-warning">⏰ Overdue Meds</Button>
          <Button variant="outline-info">📊 MAR Report</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col md={3}><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{dueMedications.length}</h3><small>Due Now</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{dueMedications.filter(m => m.status === 'Overdue').length}</h3><small>Overdue</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-success"><Card.Body><h3 className="text-success">{administeredMeds.filter(m => m.status === 'Given').length}</h3><small>Administered Today</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-info"><Card.Body><h3 className="text-info">{administeredMeds.filter(m => m.barcodeVerified).length}/{administeredMeds.length}</h3><small>Barcode Verified</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="due" title="⏰ Due Medications">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Bed</th><th>Patient</th><th>Medication</th><th>Dose</th><th>Route</th><th>Freq</th><th>Due Time</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {dueMedications.map(med => (
                    <tr key={med.id} className={med.status === 'Overdue' ? 'table-danger' : ''}>
                      <td><strong>{med.bed}</strong></td>
                      <td>{med.patient}<br/><small className="text-muted">{med.mrn}</small></td>
                      <td><strong>{med.medication}</strong></td>
                      <td>{med.dose}</td>
                      <td><Badge bg={med.route === 'IV' ? 'danger' : med.route === 'SC' ? 'warning' : 'primary'}>{med.route}</Badge></td>
                      <td>{med.frequency}</td>
                      <td>{med.time}</td>
                      <td><Badge bg={statusColor(med.status)}>{med.status}</Badge></td>
                      <td>
                        <Button size="sm" variant="success" className="me-1" title="Administer">💉</Button>
                        <Button size="sm" variant="warning" className="me-1" title="Hold">⏸️</Button>
                        <Button size="sm" variant="danger" title="Refuse">🚫</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="administered" title="✅ Administered">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Patient</th><th>Medication</th><th>Time</th><th>Nurse</th><th>Barcode</th><th>Status</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {administeredMeds.map(med => (
                    <tr key={med.id} className={med.status === 'Held' ? 'table-warning' : ''}>
                      <td>{med.patient}</td>
                      <td>{med.medication}</td>
                      <td>{med.time}</td>
                      <td>{med.nurse}</td>
                      <td>{med.barcodeVerified ? <Badge bg="success">✅ Verified</Badge> : <Badge bg="warning">Manual</Badge>}</td>
                      <td><Badge bg={med.status === 'Given' ? 'success' : 'warning'}>{med.status}</Badge></td>
                      <td><small>{med.notes}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="prn" title="💊 PRN Medications">
          <Card>
            <Card.Body>
              <h5 className="mb-3">As-Needed (PRN) Medications</h5>
              <Table bordered responsive>
                <thead className="table-dark">
                  <tr><th>Patient</th><th>Medication</th><th>Last Given</th><th>Next Eligible</th><th>Reason</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {prnMeds.map((prn, i) => (
                    <tr key={i}>
                      <td>{prn.patient}</td>
                      <td><strong>{prn.medication}</strong></td>
                      <td>{prn.lastGiven}</td>
                      <td><Badge bg={prn.nextEligible === '12:00 PM' ? 'success' : 'warning'}>{prn.nextEligible}</Badge></td>
                      <td>{prn.reason}</td>
                      <td><Button size="sm" variant="outline-primary">Administer</Button></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showScanModal} onHide={() => setShowScanModal(false)}>
        <Modal.Header closeButton className="bg-primary text-white"><Modal.Title>📱 Barcode Verification</Modal.Title></Modal.Header>
        <Modal.Body>
          <div className="text-center mb-3">
            <div className="border rounded p-4 mb-3 bg-light">
              <h1>📱</h1>
              <p className="text-muted">Scan patient wristband barcode, then medication barcode</p>
              <Button variant="primary" onClick={handleBarcodeScan}>Simulate Scan</Button>
            </div>
          </div>
          {scanResult && (
            <Alert variant={scanResult.verified ? 'success' : 'danger'}>
              <Alert.Heading>{scanResult.verified ? '✅ 5-Rights Verified' : '❌ Mismatch Detected'}</Alert.Heading>
              <p className="mb-1"><strong>Patient:</strong> {scanResult.patient}</p>
              <p className="mb-1"><strong>Medication:</strong> {scanResult.medication}</p>
              <p className="mb-1"><strong>Dose:</strong> {scanResult.dose}</p>
              <p className="mb-0"><strong>Result:</strong> {scanResult.match}</p>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          {scanResult?.verified && <Button variant="success">✅ Confirm Administration</Button>}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EMARDashboard;
