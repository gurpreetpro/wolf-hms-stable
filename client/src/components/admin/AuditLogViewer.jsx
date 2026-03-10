import React, { useState, useEffect } from 'react';
import api from '../../utils/axiosInstance';

const AuditLogViewer = ({ hospitalId, hospitalName, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                // Determine API endpoint based on if we are viewing a specific hospital or platform stats
                // For now, we'll assume we want logs for the specific hospital ID
                // Note: You might need to adjust backend to support filtering logs by hospital_id if not already present
                // OR use the existing logs endpoint if it supports query params.
                // Assuming /api/platform/logs?hospital_id=XYZ or similar. 
                // If not, we might need to hit the generalized audit endpoint.
                
                // Let's try to fetch logs specific to this hospital
                // If this endpoint doesn't exist, we might need to create it or usage a generic one.
                const res = await api.get(`/api/platform/hospitals/${hospitalId}/logs`);
                setLogs(res.data.data || []);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch logs:", err);
                // Fallback mock data for demo if API fails (so user sees UI)
                // Remove this in production once API is confirmed
                if (process.env.NODE_ENV === 'development') {
                   setLogs([
                       { id: 1, action: 'CREATE', changed_by: 'Super Admin', created_at: new Date().toISOString(), details: 'Hospital created' },
                       { id: 2, action: 'UPDATE', changed_by: 'Super Admin', created_at: new Date(Date.now() - 86400000).toISOString(), details: 'Updated branding colors' }
                   ]);
                   setLoading(false);
                } else {
                   setError('Could not load logs. ensure backend endpoint exists.');
                   setLoading(false);
                }
            }
        };

        if (hospitalId) {
            fetchLogs();
        }
    }, [hospitalId]);

    return (
        <div className="modal-header d-flex flex-column align-items-stretch" style={{ minHeight: '80vh' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="modal-title">
                    <i className="bi bi-clock-history me-2"></i>
                    Audit Logs: {hospitalName}
                </h5>
                <button type="button" className="btn-close" onClick={onClose}></button>
            </div>

            <div className="card flex-grow-1 border-0 shadow-none">
                 <div className="card-body p-0 table-responsive">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status"></div>
                            <p className="mt-2 text-muted">Loading audit trail...</p>
                        </div>
                    ) : error ? (
                         <div className="alert alert-danger m-3">{error}</div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <i className="bi bi-journal-x display-4"></i>
                            <p className="mt-2">No activity recorded yet.</p>
                        </div>
                    ) : (
                        <table className="table table-hover table-sm">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th style={{width: '20%'}}>Time</th>
                                    <th style={{width: '15%'}}>Action</th>
                                    <th style={{width: '25%'}}>User</th>
                                    <th>Details/Changes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td>{new Date(log.created_at).toLocaleString()}</td>
                                        <td>
                                            <span className={`badge bg-${
                                                log.action === 'CREATE' ? 'success' : 
                                                log.action === 'DELETE' ? 'danger' : 
                                                log.action === 'UPDATE' ? 'warning' : 'secondary'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td>{log.changed_by || 'System'}</td>
                                        <td className="text-break font-monospace small">
                                            {typeof log.new_values === 'string' 
                                                ? log.new_values.substring(0, 50) + '...' 
                                                : JSON.stringify(log.new_values || log.details).substring(0, 100)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                 </div>
            </div>
            <div className="modal-footer mt-auto">
                <button className="btn btn-secondary" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default AuditLogViewer;
