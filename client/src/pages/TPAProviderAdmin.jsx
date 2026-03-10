import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form } from 'react-bootstrap';

const TPAProviderAdmin = () => {
  const [activeTab, setActiveTab] = useState('providers');

  const providers = [
    { code: 'STAR', name: 'Star Health Insurance', type: 'TPA', plansMapped: 12, patientsActive: 34, claimsThisMonth: 18, settlementRate: '92%', avgTAT: '14 days', apiStatus: 'Connected', lastSync: '5 min ago' },
    { code: 'ICICI', name: 'ICICI Lombard', type: 'TPA', plansMapped: 8, patientsActive: 22, claimsThisMonth: 11, settlementRate: '88%', avgTAT: '18 days', apiStatus: 'Connected', lastSync: '12 min ago' },
    { code: 'HDFC', name: 'HDFC ERGO Health', type: 'TPA', plansMapped: 6, patientsActive: 15, claimsThisMonth: 7, settlementRate: '95%', avgTAT: '12 days', apiStatus: 'Connected', lastSync: '8 min ago' },
    { code: 'NIVA', name: 'Niva Bupa (Max Bupa)', type: 'TPA', plansMapped: 5, patientsActive: 11, claimsThisMonth: 5, settlementRate: '90%', avgTAT: '15 days', apiStatus: 'Connected', lastSync: '20 min ago' },
    { code: 'PMJAY', name: 'Ayushman Bharat - PMJAY', type: 'Government', plansMapped: 1, patientsActive: 48, claimsThisMonth: 32, settlementRate: '78%', avgTAT: '45 days', apiStatus: 'NHCX Linked', lastSync: '2 min ago' },
    { code: 'ESI', name: 'ESI Corporation', type: 'Government', plansMapped: 1, patientsActive: 28, claimsThisMonth: 15, settlementRate: '85%', avgTAT: '30 days', apiStatus: 'Manual', lastSync: 'N/A' },
    { code: 'CGHS', name: 'CGHS (Central Govt Health)', type: 'Government', plansMapped: 149, patientsActive: 8, claimsThisMonth: 4, settlementRate: '82%', avgTAT: '60 days', apiStatus: 'Rate Engine', lastSync: 'Live' },
    { code: 'ECHS', name: 'ECHS (Ex-Servicemen)', type: 'Government', plansMapped: 149, patientsActive: 6, claimsThisMonth: 3, settlementRate: '80%', avgTAT: '55 days', apiStatus: 'Rate Engine', lastSync: 'Live' },
    { code: 'CAPF', name: 'CAPF (Armed Police Forces)', type: 'Government', plansMapped: 149, patientsActive: 4, claimsThisMonth: 2, settlementRate: '85%', avgTAT: '45 days', apiStatus: 'Rate Engine', lastSync: 'Live' },
    { code: 'RSBY', name: 'Rashtriya Swasthya Bima', type: 'Government', plansMapped: 1, patientsActive: 5, claimsThisMonth: 2, settlementRate: '75%', avgTAT: '90 days', apiStatus: 'Offline', lastSync: 'N/A' },
  ];

  const eligibilityChecks = [
    { patient: 'Ramesh Gupta (P-1045)', provider: 'Star Health', policyNo: 'SH-2026-78432', status: 'Eligible', coverage: 'Rs.5,00,000', copay: '10%', preExisting: '2yr waiting', checkedAt: '16:05' },
    { patient: 'Meena Devi (P-1078)', provider: 'PMJAY', policyNo: 'PMJAY-MH-45678', status: 'Eligible', coverage: 'Rs.5,00,000', copay: '0%', preExisting: 'Covered', checkedAt: '15:30' },
    { patient: 'Suresh Patel (P-987)', provider: 'ICICI Lombard', policyNo: 'IL-2025-99123', status: 'Not Eligible', coverage: '-', copay: '-', preExisting: 'Policy Expired', checkedAt: '14:20' },
    { patient: 'Fatima Khan (P-1012)', provider: 'HDFC ERGO', policyNo: 'HE-2026-55789', status: 'Eligible', coverage: 'Rs.10,00,000', copay: '0%', preExisting: '4yr waiting', checkedAt: '13:10' },
  ];

  const pmjayBeneficiaries = [
    { name: 'Lakshmi Devi', hhid: 'RSBY-MH-2026-001234', aadhar: '****-****-5678', familySize: 5, eligCard: 'Golden Card', district: 'Pune', status: 'Verified', lastVerified: '2026-03-01' },
    { name: 'Raju Yadav', hhid: 'RSBY-MH-2026-005678', aadhar: '****-****-9012', familySize: 4, eligCard: 'Golden Card', district: 'Nashik', status: 'Verified', lastVerified: '2026-03-02' },
    { name: 'Kamla Bai', hhid: 'RSBY-MH-2026-009012', aadhar: '****-****-3456', familySize: 6, eligCard: 'Pending', district: 'Nagpur', status: 'OTP Sent', lastVerified: '-' },
  ];

  const claimsStatus = [
    { claimId: 'CLM-4521', patient: 'Vikram Singh', provider: 'Star Health', amount: 'Rs.1,20,000', submitted: '2026-02-20', status: 'Approved', approved: 'Rs.1,15,000', TAT: '10 days' },
    { claimId: 'CLM-4520', patient: 'Priya Sen', provider: 'ICICI Lombard', amount: 'Rs.85,000', submitted: '2026-02-18', status: 'Under Review', approved: '-', TAT: '12 days' },
    { claimId: 'CLM-4519', patient: 'Amit Verma', provider: 'PMJAY', amount: 'Rs.45,000', submitted: '2026-02-15', status: 'Approved', approved: 'Rs.45,000', TAT: '15 days' },
    { claimId: 'CLM-4518', patient: 'Neha Sharma', provider: 'HDFC ERGO', amount: 'Rs.2,30,000', submitted: '2026-02-12', status: 'Partially Approved', approved: 'Rs.1,90,000', TAT: '18 days' },
    { claimId: 'CLM-4517', patient: 'Rekha Jain', provider: 'Niva Bupa', amount: 'Rs.55,000', submitted: '2026-02-10', status: 'Denied', approved: 'Rs.0', TAT: '20 days' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">TPA & Insurance Provider Administration</h4>
          <small className="text-muted">Phase 12 -- Provider onboarding, eligibility, PMJAY integration, claims tracking</small>
        </div>
        <Button variant="primary">+ Add Provider</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{providers.length}</h3><small>Registered Providers</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">171</h3><small>Active Patients</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">94</h3><small>Claims This Month</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">87%</h3><small>Avg Settlement Rate</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3>29d</h3><small>Avg TAT</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="providers" title="Insurance Providers">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Code</th><th>Provider</th><th>Type</th><th>Plans</th><th>Active Patients</th><th>Claims/Mo</th><th>Settlement</th><th>Avg TAT</th><th>API</th><th>Last Sync</th></tr>
                </thead>
                <tbody>
                  {providers.map((p, i) => (
                    <tr key={i}>
                      <td><code>{p.code}</code></td>
                      <td><strong>{p.name}</strong></td>
                      <td><Badge bg={p.type === 'Government' ? 'success' : 'primary'}>{p.type}</Badge></td>
                      <td className="text-center">{p.plansMapped}</td>
                      <td className="text-center">{p.patientsActive}</td>
                      <td className="text-center">{p.claimsThisMonth}</td>
                      <td><Badge bg={parseInt(p.settlementRate) >= 90 ? 'success' : parseInt(p.settlementRate) >= 80 ? 'warning' : 'danger'}>{p.settlementRate}</Badge></td>
                      <td><small>{p.avgTAT}</small></td>
                      <td><Badge bg={p.apiStatus === 'Connected' ? 'success' : p.apiStatus === 'NHCX Linked' ? 'info' : p.apiStatus === 'Manual' ? 'secondary' : 'danger'}>{p.apiStatus}</Badge></td>
                      <td><small>{p.lastSync}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="eligibility" title="Eligibility Checks">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Patient</th><th>Provider</th><th>Policy No</th><th>Status</th><th>Coverage</th><th>Copay</th><th>Pre-Existing</th><th>Checked</th></tr>
                </thead>
                <tbody>
                  {eligibilityChecks.map((e, i) => (
                    <tr key={i}>
                      <td><strong>{e.patient}</strong></td>
                      <td>{e.provider}</td>
                      <td><code>{e.policyNo}</code></td>
                      <td><Badge bg={e.status === 'Eligible' ? 'success' : 'danger'}>{e.status}</Badge></td>
                      <td className="text-success fw-bold">{e.coverage}</td>
                      <td>{e.copay}</td>
                      <td><small>{e.preExisting}</small></td>
                      <td><small>{e.checkedAt}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="pmjay" title="PMJAY Integration">
          <Card>
            <Card.Body>
              <div className="mb-3 p-3 bg-light rounded d-flex align-items-center gap-3">
                <Form.Control placeholder="Search by Aadhaar / HHID / Name" style={{maxWidth:'400px'}} />
                <Button variant="success">Search Beneficiary</Button>
                <Button variant="outline-primary">Send OTP</Button>
                <Button variant="outline-info">Verify</Button>
              </div>
              <Table bordered hover responsive>
                <thead className="table-success">
                  <tr><th>Name</th><th>HHID</th><th>Aadhaar</th><th>Family</th><th>Card</th><th>District</th><th>Status</th><th>Verified</th></tr>
                </thead>
                <tbody>
                  {pmjayBeneficiaries.map((b, i) => (
                    <tr key={i}>
                      <td><strong>{b.name}</strong></td>
                      <td><code>{b.hhid}</code></td>
                      <td>{b.aadhar}</td>
                      <td className="text-center">{b.familySize}</td>
                      <td><Badge bg={b.eligCard === 'Golden Card' ? 'warning' : 'secondary'} text="dark">{b.eligCard}</Badge></td>
                      <td>{b.district}</td>
                      <td><Badge bg={b.status === 'Verified' ? 'success' : 'info'}>{b.status}</Badge></td>
                      <td><small>{b.lastVerified}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="claims" title="Claims Tracker">
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>Claim ID</th><th>Patient</th><th>Provider</th><th>Claimed</th><th>Submitted</th><th>Status</th><th>Approved</th><th>TAT</th></tr>
                </thead>
                <tbody>
                  {claimsStatus.map((c, i) => (
                    <tr key={i}>
                      <td><code>{c.claimId}</code></td>
                      <td><strong>{c.patient}</strong></td>
                      <td>{c.provider}</td>
                      <td className="fw-bold">{c.amount}</td>
                      <td><small>{c.submitted}</small></td>
                      <td><Badge bg={c.status === 'Approved' ? 'success' : c.status === 'Under Review' ? 'warning' : c.status === 'Partially Approved' ? 'info' : 'danger'}>{c.status}</Badge></td>
                      <td className={c.approved === 'Rs.0' ? 'text-danger' : 'text-success fw-bold'}>{c.approved}</td>
                      <td><small>{c.TAT}</small></td>
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

export default TPAProviderAdmin;
