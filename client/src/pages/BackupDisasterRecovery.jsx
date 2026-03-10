import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const BackupDisasterRecovery = () => {
  const [activeTab, setActiveTab] = useState('backups');

  const backups = [
    { id: 'BK-2026-0302-01', type: 'Full', size: '48.2 GB', started: '2026-03-02 02:00', completed: '2026-03-02 02:45', duration: '45 min', status: 'Completed', location: 'AWS S3 (Mumbai)', encrypted: true, verified: true },
    { id: 'BK-2026-0302-02', type: 'Incremental', size: '2.1 GB', started: '2026-03-02 08:00', completed: '2026-03-02 08:08', duration: '8 min', status: 'Completed', location: 'AWS S3 (Mumbai)', encrypted: true, verified: true },
    { id: 'BK-2026-0302-03', type: 'Incremental', size: '1.8 GB', started: '2026-03-02 10:00', completed: '2026-03-02 10:06', duration: '6 min', status: 'Completed', location: 'AWS S3 (Mumbai)', encrypted: true, verified: true },
    { id: 'BK-2026-0301-01', type: 'Full', size: '47.8 GB', started: '2026-03-01 02:00', completed: '2026-03-01 02:43', duration: '43 min', status: 'Completed', location: 'AWS S3 + Azure (DR)', encrypted: true, verified: true },
    { id: 'BK-2026-0228-01', type: 'Full', size: '47.5 GB', started: '2026-02-28 02:00', completed: '2026-02-28 02:42', duration: '42 min', status: 'Completed', location: 'AWS S3 + Azure (DR)', encrypted: true, verified: true },
  ];

  const drMetrics = {
    rto: { target: '4 hours', actual: '2.5 hours', status: 'Met' },
    rpo: { target: '1 hour', actual: '30 min', status: 'Met' },
    lastDrDrill: '2026-02-15',
    nextDrDrill: '2026-03-15',
    drSite: 'Azure West India (Pune)',
    replicationType: 'Async (near real-time)',
    replicationLag: '12 seconds',
    failoverMode: 'Automated with manual approval',
  };

  const drDrills = [
    { date: '2026-02-15', type: 'Full Failover Drill', duration: '2.5 hours', rtoAchieved: '2.5h', rpoAchieved: '28 min', dataLoss: '0 records', result: 'Pass', participants: 8 },
    { date: '2026-01-15', type: 'Partial Failover (DB only)', duration: '1.2 hours', rtoAchieved: '1.2h', rpoAchieved: '15 min', dataLoss: '0 records', result: 'Pass', participants: 5 },
    { date: '2025-12-15', type: 'Full Failover Drill', duration: '3.1 hours', rtoAchieved: '3.1h', rpoAchieved: '45 min', dataLoss: '0 records', result: 'Pass', participants: 10 },
    { date: '2025-11-15', type: 'Restore Test (Point-in-Time)', duration: '55 min', rtoAchieved: '55 min', rpoAchieved: '10 min', dataLoss: '0 records', result: 'Pass', participants: 4 },
  ];

  const retentionPolicy = [
    { type: 'Daily Incremental', retention: '30 days', copies: 30, location: 'AWS S3 Mumbai' },
    { type: 'Daily Full', retention: '14 days', copies: 14, location: 'AWS S3 Mumbai' },
    { type: 'Weekly Full', retention: '12 weeks', copies: 12, location: 'AWS S3 + Azure DR' },
    { type: 'Monthly Full', retention: '24 months', copies: 24, location: 'AWS S3 + Azure DR + Glacier' },
    { type: 'Annual Full', retention: '7 years', copies: 7, location: 'AWS Glacier Deep Archive' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Backup & Disaster Recovery</h4>
          <small className="text-muted">Phase 10 S-Tier -- Automated backups, RTO/RPO tracking & DR drills</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">Run Manual Backup</Button>
          <Button variant="outline-danger">Initiate DR Drill</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col md={3}>
          <Card className="text-center border-success h-100">
            <Card.Body>
              <h6>RTO (Recovery Time)</h6>
              <h2 className="text-success">{drMetrics.rto.actual}</h2>
              <small>Target: {drMetrics.rto.target}</small><br/>
              <Badge bg="success">{drMetrics.rto.status}</Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-primary h-100">
            <Card.Body>
              <h6>RPO (Recovery Point)</h6>
              <h2 className="text-primary">{drMetrics.rpo.actual}</h2>
              <small>Target: {drMetrics.rpo.target}</small><br/>
              <Badge bg="success">{drMetrics.rpo.status}</Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-info h-100">
            <Card.Body>
              <h6>Replication Lag</h6>
              <h2 className="text-info">{drMetrics.replicationLag}</h2>
              <small>{drMetrics.replicationType}</small><br/>
              <Badge bg="success">Healthy</Badge>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-warning h-100">
            <Card.Body>
              <h6>Next DR Drill</h6>
              <h2 className="text-warning" style={{fontSize:'1.4rem'}}>{drMetrics.nextDrDrill}</h2>
              <small>DR Site: {drMetrics.drSite}</small><br/>
              <Badge bg="info">{drMetrics.failoverMode}</Badge>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="backups" title="Backup History">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>ID</th><th>Type</th><th>Size</th><th>Started</th><th>Duration</th><th>Location</th><th>Encrypted</th><th>Verified</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {backups.map(b => (
                    <tr key={b.id}>
                      <td><code>{b.id}</code></td>
                      <td><Badge bg={b.type === 'Full' ? 'primary' : 'info'}>{b.type}</Badge></td>
                      <td><strong>{b.size}</strong></td>
                      <td><small>{b.started}</small></td>
                      <td>{b.duration}</td>
                      <td><small>{b.location}</small></td>
                      <td><Badge bg="success">AES-256</Badge></td>
                      <td><Badge bg="success">Verified</Badge></td>
                      <td><Badge bg="success">{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="drills" title="DR Drills">
          <Card>
            <Card.Body>
              <Alert variant="info">
                DR drills are conducted monthly per HIPAA/NABH requirements. All drills have passed with zero data loss.
              </Alert>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Date</th><th>Type</th><th>Duration</th><th>RTO Achieved</th><th>RPO Achieved</th><th>Data Loss</th><th>Participants</th><th>Result</th></tr>
                </thead>
                <tbody>
                  {drDrills.map((d, i) => (
                    <tr key={i}>
                      <td><strong>{d.date}</strong></td>
                      <td>{d.type}</td>
                      <td>{d.duration}</td>
                      <td>{d.rtoAchieved}</td>
                      <td>{d.rpoAchieved}</td>
                      <td><Badge bg="success">{d.dataLoss}</Badge></td>
                      <td>{d.participants}</td>
                      <td><Badge bg="success" className="fs-6">{d.result}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="retention" title="Retention Policy">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Backup Type</th><th>Retention</th><th>Active Copies</th><th>Storage Location</th></tr>
                </thead>
                <tbody>
                  {retentionPolicy.map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.type}</strong></td>
                      <td><Badge bg="info">{r.retention}</Badge></td>
                      <td>{r.copies}</td>
                      <td><small>{r.location}</small></td>
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

export default BackupDisasterRecovery;
