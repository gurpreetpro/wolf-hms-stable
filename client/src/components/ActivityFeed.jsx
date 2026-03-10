import React, { useState, useEffect } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { Clock, User } from 'lucide-react';
import axios from 'axios';

const ActivityFeed = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/logs?limit=10', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(res.data.logs || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching logs', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading && logs.length === 0) {
        return <div className="text-center py-3"><Spinner size="sm" /></div>;
    }

    return (
        <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 py-3">
                <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                    <Clock size={16} className="text-primary" />
                    Live Activity Feed
                </h6>
            </Card.Header>
            <Card.Body className="p-0" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {logs.length === 0 ? (
                    <div className="text-center text-muted py-4 small">No recent activity</div>
                ) : (
                    <div className="list-group list-group-flush">
                        {logs.map((log) => (
                            <div key={log.id} className="list-group-item px-3 py-2 border-0 border-bottom" style={{ fontSize: '0.85rem' }}>
                                <div className="d-flex justify-content-between align-items-start mb-1">
                                    <span className="fw-bold text-dark">{log.action}</span>
                                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </small>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted text-truncate" style={{ maxWidth: '200px' }}>
                                        {log.details || 'No details'}
                                    </span>
                                    <small className="text-primary d-flex align-items-center gap-1">
                                        <User size={10} />
                                        {log.username || 'System'}
                                    </small>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default ActivityFeed;
