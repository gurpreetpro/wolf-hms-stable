import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Alert, Spinner } from 'react-bootstrap';

/**
 * Enterprise ERP Sync Dashboard
 * Styled specifically for Corporate Hospital CFOs
 * using a crisp "Mint Fresh" theme for reading dense table data.
 */
const ERPSyncDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalSynced: 0, pendingSync: 0, lastRun: null });

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setStats({
        totalSynced: 12450,
        pendingSync: 142,
        lastRun: new Date(Date.now() - 3600000).toLocaleString()
      });
      setLogs([
        { id: 'SYNC-1004', date: new Date().toLocaleString(), status: 'SUCCESS', method: 'SFTP Push', size: '24.5 KB', invoices: 142 },
        { id: 'SYNC-1003', date: new Date(Date.now() - 86400000).toLocaleString(), status: 'SUCCESS', method: 'Email', size: '21.2 KB', invoices: 130 },
        { id: 'SYNC-1002', date: new Date(Date.now() - 172800000).toLocaleString(), status: 'FAILED', method: 'SFTP Push', size: '0 KB', invoices: 0, error: 'Connection Refused by Tally Server' },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  const handleManualSync = () => {
    setLoading(true);
    setTimeout(() => {
      setLogs(prev => [{
        id: `SYNC-${Math.floor(Math.random() * 1000) + 2000}`,
        date: new Date().toLocaleString(),
        status: 'SUCCESS',
        method: 'Manual Download',
        size: '5.2 KB',
        invoices: 45
      }, ...prev]);
      setLoading(false);
    }, 1500);
  };

  const failedLog = logs.find(l => l.status === 'FAILED');

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f5f5', minHeight: '100vh' }}>
      <Row className="justify-content-between align-items-center mb-4">
        <Col>
          <h2 style={{ margin: 0, color: '#08979c' }}>Tally Prime Sync Console</h2>
          <small className="text-muted">Enterprise Financial Ledger Export system</small>
        </Col>
        <Col xs="auto">
          <Button
            variant="info"
            size="lg"
            onClick={handleManualSync}
            disabled={loading}
            style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2', color: '#fff' }}
          >
            {loading ? <Spinner size="sm" className="me-2" /> : '🔄 '}
            Force Manual Sync
          </Button>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col xs={12} sm={4}>
          <Card className="border-0" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(19, 194, 194, 0.15)' }}>
            <Card.Body className="text-center">
              <div className="text-muted small">Total Invoices Synced (MTD)</div>
              <div className="fs-2 fw-bold" style={{ color: '#13c2c2' }}>✅ {stats.totalSynced.toLocaleString()}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card className="border-0" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(19, 194, 194, 0.15)' }}>
            <Card.Body className="text-center">
              <div className="text-muted small">Pending End-of-Day Sync</div>
              <div className="fs-2 fw-bold" style={{ color: '#faad14' }}>{stats.pendingSync}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={4}>
          <Card className="border-0" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(19, 194, 194, 0.15)' }}>
            <Card.Body className="text-center">
              <div className="text-muted small">Last Automated Run</div>
              <div className="fs-5 fw-bold">{stats.lastRun || '—'}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {failedLog && (
        <Alert variant="danger" className="mb-4" style={{ borderRadius: 8 }}>
          <Alert.Heading>❌ Sync Failure Detected</Alert.Heading>
          <p className="mb-0">The last SFTP push to the local Tally server failed. Reason: {failedLog.error}</p>
        </Alert>
      )}

      <Card className="border-0" style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(19, 194, 194, 0.15)' }}>
        <Card.Header className="bg-white border-0">
          <strong style={{ color: '#08979c' }}>Export History & Logs</strong>
        </Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Execution Date</th>
                <th>Status</th>
                <th className="text-end">Invoices Synced</th>
                <th>Delivery Method</th>
                <th className="text-end">Payload Size</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.date}</td>
                  <td>
                    <Badge bg={log.status === 'SUCCESS' ? 'success' : 'danger'}>{log.status}</Badge>
                  </td>
                  <td className="text-end">{log.invoices}</td>
                  <td>{log.method}</td>
                  <td className="text-end">{log.size}</td>
                  <td>
                    <Button
                      variant="link"
                      size="sm"
                      disabled={log.status !== 'SUCCESS'}
                      style={{ color: '#13c2c2' }}
                    >
                      📥 Get XML
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ERPSyncDashboard;
