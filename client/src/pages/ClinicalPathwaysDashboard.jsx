import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Tabs, Tab, ProgressBar } from 'react-bootstrap';
import { GitBranch, CheckCircle, Clock, AlertTriangle, Plus, FileText } from 'lucide-react';
import api from '../utils/axiosInstance';

export default function ClinicalPathwaysDashboard() {
  const [pathways, setPathways] = useState([]);
  const [activePatients, setActivePatients] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/clinical-pathways');
        setPathways(res.data.pathways || []);
        setActivePatients(res.data.patients || []);
      } catch {
        setPathways([
          { id: 1, name: 'Elective Knee Replacement', category: 'Orthopedic', steps: 12, avgLOS: 5, active: 3, compliance: 92 },
          { id: 2, name: 'Acute MI Protocol', category: 'Cardiology', steps: 8, avgLOS: 7, active: 2, compliance: 88 },
          { id: 3, name: 'Normal Delivery Pathway', category: 'Obstetrics', steps: 10, avgLOS: 3, active: 5, compliance: 95 },
          { id: 4, name: 'LSCS Recovery', category: 'Obstetrics', steps: 11, avgLOS: 5, active: 2, compliance: 90 },
          { id: 5, name: 'Pneumonia (Community)', category: 'Medicine', steps: 7, avgLOS: 5, active: 4, compliance: 85 },
          { id: 6, name: 'Diabetic Ketoacidosis', category: 'Emergency', steps: 9, avgLOS: 4, active: 1, compliance: 91 }
        ]);
        setActivePatients([
          { id: 1, patient: 'Rajesh Kumar', pathway: 'Elective Knee Replacement', currentStep: 'Day 2: Physiotherapy Started', progress: 40, status: 'On Track', doctor: 'Dr. Vikram Singh' },
          { id: 2, patient: 'Priya Sharma', pathway: 'Normal Delivery Pathway', currentStep: 'Day 1: Postpartum Care', progress: 30, status: 'On Track', doctor: 'Dr. Sunita Verma' },
          { id: 3, patient: 'Anil Kumar', pathway: 'Acute MI Protocol', currentStep: 'Day 3: Cardiac Rehab', progress: 60, status: 'Delayed', doctor: 'Dr. Anil Kumar' },
          { id: 4, patient: 'Meena Devi', pathway: 'Pneumonia (Community)', currentStep: 'Day 4: Antibiotic De-escalation', progress: 70, status: 'On Track', doctor: 'Dr. Sunita Verma' }
        ]);
      }
    };
    fetchData();
  }, []);

  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><GitBranch className="me-2 text-primary" />Clinical Pathways</h2>
          <p className="text-muted">Standardized Care Protocols & Progress Tracking</p>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}><Card className="border-0 bg-primary bg-opacity-10 text-center p-3"><h3 className="fw-bold text-primary">{pathways.length}</h3><small className="text-muted">Active Pathways</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-success bg-opacity-10 text-center p-3"><h3 className="fw-bold text-success">{activePatients.length}</h3><small className="text-muted">Patients on Pathway</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-info bg-opacity-10 text-center p-3"><h3 className="fw-bold text-info">{pathways.length > 0 ? Math.round(pathways.reduce((s,p) => s+p.compliance, 0) / pathways.length) : 0}%</h3><small className="text-muted">Avg Compliance</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-warning bg-opacity-10 text-center p-3"><h3 className="fw-bold text-warning">{activePatients.filter(p => p.status === 'Delayed').length}</h3><small className="text-muted">Delayed</small></Card></Col>
      </Row>

      <Tabs defaultActiveKey="active" className="mb-3">
        <Tab eventKey="active" title="🏥 Active Patient Pathways">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table bordered hover responsive size="sm" className="align-middle">
                <thead className="bg-light">
                  <tr><th>Patient</th><th>Pathway</th><th>Current Step</th><th>Progress</th><th>Doctor</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {activePatients.map(p => (
                    <tr key={p.id} className={p.status === 'Delayed' ? 'table-warning' : ''}>
                      <td className="fw-bold">{p.patient}</td>
                      <td><Badge bg="light" text="dark">{p.pathway}</Badge></td>
                      <td><small>{p.currentStep}</small></td>
                      <td style={{ width: 150 }}>
                        <ProgressBar now={p.progress} variant={p.status === 'Delayed' ? 'warning' : 'success'} style={{ height: 10 }} />
                        <small className="text-muted">{p.progress}%</small>
                      </td>
                      <td>{p.doctor}</td>
                      <td><Badge bg={p.status === 'On Track' ? 'success' : 'warning'}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="library" title="📚 Pathway Library">
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white fw-bold">Standardized Clinical Pathways</Card.Header>
            <Card.Body>
              <Table bordered hover size="sm" className="align-middle">
                <thead className="bg-light">
                  <tr><th>Pathway Name</th><th>Category</th><th>Steps</th><th>Avg LOS</th><th>Active Patients</th><th>Compliance</th></tr>
                </thead>
                <tbody>
                  {pathways.map(p => (
                    <tr key={p.id}>
                      <td className="fw-bold">{p.name}</td>
                      <td><Badge bg="light" text="dark">{p.category}</Badge></td>
                      <td>{p.steps}</td>
                      <td>{p.avgLOS} days</td>
                      <td><Badge bg="primary">{p.active}</Badge></td>
                      <td>
                        <ProgressBar now={p.compliance} variant={p.compliance >= 90 ? 'success' : p.compliance >= 80 ? 'warning' : 'danger'} style={{ height: 10 }} />
                        <small>{p.compliance}%</small>
                      </td>
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
}
