import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Spinner, Alert, Form, InputGroup } from 'react-bootstrap';

/**
 * Security Dashboard — Enterprise Login Security Console
 * Phase 9B: Account Lockout, Audit Trail, Session Management
 */

const SecurityDashboard = () => {
    const [stats, setStats] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [error, setError] = useState(null);

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsRes, logsRes, sessionsRes] = await Promise.all([
                fetch('/api/security/stats', { headers }),
                fetch(`/api/security/audit-log?limit=100${actionFilter ? `&action=${actionFilter}` : ''}`, { headers }),
                fetch('/api/security/sessions', { headers })
            ]);

            if (!statsRes.ok || !logsRes.ok || !sessionsRes.ok) {
                throw new Error('Failed to load security data. Run the migration first.');
            }

            const statsData = await statsRes.json();
            const logsData = await logsRes.json();
            const sessionsData = await sessionsRes.json();

            setStats(statsData.data);
            setAuditLogs(logsData.data || []);
            setSessions(sessionsData.data || []);
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    }, [actionFilter]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const revokeSession = async (id) => {
        if (!window.confirm('Revoke this session? The user will be logged out.')) return;
        await fetch(`/api/security/sessions/${id}/revoke`, { method: 'POST', headers });
        fetchAll();
    };

    const unlockUser = async (userId) => {
        await fetch(`/api/security/users/${userId}/unlock`, { method: 'POST', headers });
        fetchAll();
    };

    const revokeAllSessions = async (userId) => {
        if (!window.confirm('Revoke ALL sessions for this user?')) return;
        await fetch(`/api/security/users/${userId}/revoke-all`, { method: 'POST', headers });
        fetchAll();
    };

    const runMigration = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/test/migrate-login-security');
            const data = await res.json();
            if (data.success) {
                setError(null);
                fetchAll();
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const getActionBadge = (action) => {
        const map = {
            'LOGIN_SUCCESS': 'success',
            'LOGIN_FAILED': 'danger',
            'LOCKOUT': 'dark',
            'SUSPICIOUS': 'warning',
            'LOGOUT': 'secondary',
            'TOKEN_REFRESH': 'info',
            'SESSION_REVOKED': 'primary',
            'ACCOUNT_UNLOCKED': 'success'
        };
        return map[action] || 'light';
    };

    const parseUA = (ua) => {
        if (!ua) return '—';
        if (ua.includes('Chrome')) return '🌐 Chrome';
        if (ua.includes('Firefox')) return '🦊 Firefox';
        if (ua.includes('Safari')) return '🧭 Safari';
        if (ua.includes('Edge')) return '📘 Edge';
        if (ua.includes('Mobile')) return '📱 Mobile';
        return '💻 Other';
    };

    if (loading && !stats) {
        return (
            <Container className="py-4 text-center">
                <Spinner animation="border" variant="info" />
                <p className="mt-2">Loading Security Dashboard...</p>
            </Container>
        );
    }

    return (
        <div style={{ padding: '24px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#e2e8f0' }}>
            <Row className="align-items-center mb-4">
                <Col>
                    <h2 style={{ margin: 0 }}>🛡️ Security Command Center</h2>
                    <small className="text-muted">Enterprise Login Security • Phase 9B</small>
                </Col>
                <Col xs="auto">
                    <Button variant="outline-light" size="sm" onClick={fetchAll} disabled={loading}>
                        {loading ? <Spinner size="sm" /> : '🔄'} Refresh
                    </Button>
                </Col>
            </Row>

            {error && (
                <Alert variant="danger" className="mb-4">
                    <strong>⚠️ Error:</strong> {error}
                    <Button variant="warning" size="sm" className="ms-3" onClick={runMigration}>
                        🔧 Run Migration
                    </Button>
                </Alert>
            )}

            {/* Stats Cards */}
            {stats && (
                <Row className="g-3 mb-4">
                    {[
                        { label: 'Successful Logins (24h)', value: stats.successful_logins_24h, color: '#22c55e', icon: '✅' },
                        { label: 'Failed Logins (24h)', value: stats.failed_logins_24h, color: '#ef4444', icon: '❌' },
                        { label: 'Suspicious Events', value: stats.suspicious_events_24h, color: '#f59e0b', icon: '🚨' },
                        { label: 'Locked Accounts', value: stats.locked_accounts, color: '#8b5cf6', icon: '🔒' },
                        { label: 'Active Sessions', value: stats.active_sessions, color: '#06b6d4', icon: '🟢' },
                    ].map((s, i) => (
                        <Col key={i} xs={6} md>
                            <Card style={{ backgroundColor: '#1e293b', borderColor: s.color + '40', borderWidth: 2, borderRadius: 12 }}>
                                <Card.Body className="text-center py-3">
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.icon} {s.label}</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            <Tabs defaultActiveKey="audit" className="mb-4" variant="pills" style={{ '--bs-nav-pills-link-active-bg': '#0ea5e9' }}>
                {/* ── AUDIT LOG ── */}
                <Tab eventKey="audit" title="📋 Audit Log">
                    <Card style={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12 }}>
                        <Card.Header className="border-0 d-flex justify-content-between align-items-center" style={{ backgroundColor: 'transparent' }}>
                            <strong>Login Event History</strong>
                            <Form.Select
                                size="sm" style={{ width: 200, backgroundColor: '#0f172a', color: '#e2e8f0', borderColor: '#334155' }}
                                value={actionFilter} onChange={e => setActionFilter(e.target.value)}
                            >
                                <option value="">All Events</option>
                                <option value="LOGIN_SUCCESS">✅ Successful</option>
                                <option value="LOGIN_FAILED">❌ Failed</option>
                                <option value="LOCKOUT">🔒 Lockout</option>
                                <option value="SUSPICIOUS">🚨 Suspicious</option>
                            </Form.Select>
                        </Card.Header>
                        <Card.Body>
                            <Table responsive hover variant="dark" size="sm">
                                <thead>
                                    <tr style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <th>Time</th>
                                        <th>User</th>
                                        <th>Event</th>
                                        <th>IP Address</th>
                                        <th>Device</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map(log => (
                                        <tr key={log.id}>
                                            <td style={{ fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                                            <td>{log.username || '—'}</td>
                                            <td><Badge bg={getActionBadge(log.action)}>{log.action}</Badge></td>
                                            <td><code style={{ color: '#38bdf8' }}>{log.ip_address || '—'}</code></td>
                                            <td>{parseUA(log.user_agent)}</td>
                                            <td style={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {log.details ? JSON.stringify(log.details) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    {auditLogs.length === 0 && (
                                        <tr><td colSpan={6} className="text-center text-muted py-4">No login events recorded yet</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* ── ACTIVE SESSIONS ── */}
                <Tab eventKey="sessions" title="🟢 Active Sessions">
                    <Card style={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12 }}>
                        <Card.Body>
                            <Table responsive hover variant="dark" size="sm">
                                <thead>
                                    <tr style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Created</th>
                                        <th>Expires</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessions.map(s => (
                                        <tr key={s.id}>
                                            <td><strong>{s.username}</strong></td>
                                            <td><Badge bg="info">{s.role}</Badge></td>
                                            <td style={{ fontSize: '0.8rem' }}>{new Date(s.created_at).toLocaleString()}</td>
                                            <td style={{ fontSize: '0.8rem' }}>{new Date(s.expires_at).toLocaleString()}</td>
                                            <td>
                                                <Button variant="outline-danger" size="sm" onClick={() => revokeSession(s.id)}>
                                                    Force Logout
                                                </Button>
                                                <Button variant="outline-warning" size="sm" className="ms-1" onClick={() => revokeAllSessions(s.user_id)}>
                                                    Revoke All
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {sessions.length === 0 && (
                                        <tr><td colSpan={5} className="text-center text-muted py-4">No active sessions</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* ── PASSWORD CHECKER ── */}
                <Tab eventKey="password" title="🔑 Password Checker">
                    <PasswordStrengthChecker headers={headers} />
                </Tab>
            </Tabs>
        </div>
    );
};

/** Password Strength Checker Sub-Component */
const PasswordStrengthChecker = ({ headers }) => {
    const [password, setPassword] = useState('');
    const [result, setResult] = useState(null);

    const check = async () => {
        if (!password) return;
        const res = await fetch('/api/security/validate-password', {
            method: 'POST', headers, body: JSON.stringify({ password })
        });
        const data = await res.json();
        setResult(data.data);
    };

    const strengthColor = { STRONG: '#22c55e', MEDIUM: '#f59e0b', WEAK: '#ef4444' };

    return (
        <Card style={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 12, maxWidth: 500 }}>
            <Card.Body>
                <h5>Password Strength Validator</h5>
                <p className="text-muted small">Test password compliance before assigning to staff</p>
                <InputGroup className="mb-3">
                    <Form.Control
                        type="text" placeholder="Enter password to test..."
                        value={password} onChange={e => setPassword(e.target.value)}
                        style={{ backgroundColor: '#0f172a', color: '#e2e8f0', borderColor: '#334155' }}
                    />
                    <Button variant="info" onClick={check}>Check</Button>
                </InputGroup>
                {result && (
                    <div>
                        <div className="mb-2" style={{ fontSize: '1.2rem', fontWeight: 700, color: strengthColor[result.strength] }}>
                            {result.strength === 'STRONG' ? '✅' : result.strength === 'MEDIUM' ? '⚠️' : '❌'} {result.strength}
                        </div>
                        <div style={{
                            height: 8, borderRadius: 4, backgroundColor: '#334155',
                            overflow: 'hidden', marginBottom: 12
                        }}>
                            <div style={{
                                height: '100%', borderRadius: 4,
                                backgroundColor: strengthColor[result.strength],
                                width: result.strength === 'STRONG' ? '100%' : result.strength === 'MEDIUM' ? '60%' : '25%',
                                transition: 'width 0.3s'
                            }} />
                        </div>
                        {result.errors && result.errors.length > 0 && (
                            <ul className="text-danger small">
                                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        )}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default SecurityDashboard;
