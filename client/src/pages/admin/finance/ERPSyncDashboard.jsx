import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Button, Badge, Row, Col, Statistic, Alert } from 'antd';
import { SyncOutlined, CloudDownloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
// import axiosInstance from '../../utils/axiosInstance';

const { Title, Text } = Typography;

/**
 * Enterprise ERP Sync Dashboard
 * Styled specifically for Corporate Hospital CFOs
 * using a crisp "Mint Fresh" theme for reading dense table data.
 */
const ERPSyncDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalSynced: 0, pendingSync: 0, lastRun: null });

  // Mock data for immediate visualization without full backend setup
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
    // Real implementation would call /api/v1/erp/sync/init
    setTimeout(() => {
      setLogs([{
        id: `SYNC-${Math.floor(Math.random() * 1000) + 2000}`,
        date: new Date().toLocaleString(),
        status: 'SUCCESS',
        method: 'Manual Download',
        size: '5.2 KB',
        invoices: 45
      }, ...logs]);
      setLoading(false);
    }, 1500);
  };

  const columns = [
    { title: 'Batch ID', dataIndex: 'id', key: 'id', width: 120 },
    { title: 'Execution Date', dataIndex: 'date', key: 'date' },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 'SUCCESS' ? 'success' : 'error'} 
          text={<Text strong style={{ color: status === 'SUCCESS' ? '#52c41a' : '#f5222d' }}>{status}</Text>} 
        />
      )
    },
    { title: 'Invoices Synced', dataIndex: 'invoices', key: 'invoices', align: 'right' },
    { title: 'Delivery Method', dataIndex: 'method', key: 'method' },
    { title: 'Payload Size', dataIndex: 'size', key: 'size', align: 'right' },
    { 
      title: 'Action', 
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<CloudDownloadOutlined />} 
          disabled={record.status !== 'SUCCESS'}
          style={{ color: '#13c2c2' }} // Mint theme color
        >
          Get XML
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f5f5', minHeight: '100vh' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0, color: '#08979c' }}>Tally Prime Sync Console</Title>
          <Text type="secondary">Enterprise Financial Ledger Export system</Text>
        </Col>
        <Col>
          <Button 
            type="primary" 
            size="large" 
            icon={<SyncOutlined />} 
            onClick={handleManualSync}
            loading={loading}
            style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }} // Mint theme
          >
            Force Manual Sync
          </Button>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(19, 194, 194, 0.15)' }}>
            <Statistic title="Total Invoices Synced (MTD)" value={stats.totalSynced} valueStyle={{ color: '#13c2c2' }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(19, 194, 194, 0.15)' }}>
            <Statistic title="Pending End-of-Day Sync" value={stats.pendingSync} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(19, 194, 194, 0.15)' }}>
            <Statistic title="Last Automated Run" value={stats.lastRun} valueStyle={{ fontSize: '18px' }} />
          </Card>
        </Col>
      </Row>

      {logs.some(l => l.status === 'FAILED') && (
        <Alert
          message="Sync Failure Detected"
          description={`The last SFTP push to the local Tally server failed. Reason: ${logs.find(l => l.status === 'FAILED')?.error}`}
          type="error"
          showIcon
          icon={<CloseCircleOutlined />}
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      <Card 
        title={<Text strong style={{ color: '#08979c' }}>Export History & Logs</Text>} 
        bordered={false} 
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(19, 194, 194, 0.15)' }}
      >
        <Table 
          columns={columns} 
          dataSource={logs} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default ERPSyncDashboard;
