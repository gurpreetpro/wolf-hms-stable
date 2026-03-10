import React from 'react';
import { Table, Badge } from 'react-bootstrap';
import { MapPin, Navigation, Clock } from 'lucide-react';

const PatrolTracker = ({ patrols }) => {
    return (
        <div className="glass-panel h-100 d-flex flex-column">
            <div className="p-3 d-flex justify-content-between align-items-center border-bottom border-light" style={{ borderColor: 'var(--sec-glass-border)' }}>
                <h5 className="sec-font-header mb-0 d-flex align-items-center text-neon-blue">
                    <Navigation size={20} className="me-2" />
                    Patrol Tracker ('Wolf Guard')
                </h5>
                <Badge bg="info" className="text-dark d-flex align-items-center">
                    <span className="pulse-dot bg-dark me-1" style={{width: 6, height: 6}}></span> 
                    LIVE
                </Badge>
            </div>
            
            <div className="flex-grow-1 overflow-auto">
                <Table className="mb-0 sec-table align-middle text-nowrap">
                    <thead>
                        <tr>
                            <th className="ps-4">Officer</th>
                            <th>Start Time</th>
                            <th>Status</th>
                            <th className="text-end pe-4">Last Checkpoint</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patrols && patrols.length > 0 ? (
                            patrols.map((patrol) => (
                                <tr key={patrol.id}>
                                    <td className="ps-4 fw-bold text-neon-blue">
                                        {patrol.guard_name || 'Unknown Officer'}
                                    </td>
                                    <td className="text-muted">
                                        <Clock size={14} className="me-1" />
                                        {new Date(patrol.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td>
                                        <span className="d-flex align-items-center text-neon-green">
                                            <span className="pulse-dot"></span>
                                            Active
                                        </span>
                                    </td>
                                    <td className="text-end pe-4 text-white">
                                        <div className="d-flex justify-content-end align-items-center">
                                            <MapPin size={14} className="text-muted me-1" />
                                            <span className="opacity-50">--</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center py-5 text-muted fst-italic">
                                    <div className="opacity-50 mb-2"><Navigation size={32} /></div>
                                    No active patrols detected.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
            
            {/* Recent Checkpoints Feed */}
            <div className="p-3" style={{ borderTop: 'var(--sec-glass-border)' }}>
                <h6 className="text-muted small text-uppercase mb-3 sec-font-header">Recent Scans</h6>
                <div className="d-flex align-items-start mb-1 opacity-75">
                    <div className="me-2 mt-1">
                        <span className="pulse-dot" style={{ background: 'var(--sec-primary)' }}></span>
                    </div>
                    <div>
                        <small className="d-block text-white">System Monitor Active</small>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Listening for realtime events...</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatrolTracker;
