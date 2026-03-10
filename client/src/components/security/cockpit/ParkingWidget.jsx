import React, { useState, useEffect } from 'react';
import { Card, Spinner, Table, Badge } from 'react-bootstrap';
import { Car, IndianRupee } from 'lucide-react';
import axios from 'axios';

const ParkingWidget = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // In a real app, use the configured baseURL
                const res = await axios.get('/api/parking/stats');
                if (res.data.success) {
                    setStats(res.data.data);
                }
            } catch (error) {
                console.error("Parking Stats Error", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <Card className="bg-dark border-secondary h-100"><Card.Body className="d-flex justify-content-center align-items-center"><Spinner variant="info"/></Card.Body></Card>;

    return (
        <Card className="bg-dark border-secondary h-100 text-white">
            <Card.Header className="bg-transparent border-bottom border-secondary d-flex justify-content-between align-items-center">
                <h6 className="mb-0 sec-font"><Car size={18} className="me-2 text-warning"/>PARKING DECK</h6>
                <Badge bg="info" className="text-dark">LEVEL 1</Badge>
            </Card.Header>
            <Card.Body>
                <div className="d-flex justify-content-between mb-4">
                    <div className="text-center">
                        <h2 className="display-6 fw-bold text-success mb-0">{stats?.occupancy || 0}</h2>
                        <small className="text-muted">VEHICLES</small>
                    </div>
                    <div className="text-center border-start border-secondary ps-4">
                        <h2 className="display-6 fw-bold text-warning mb-0">₹{stats?.revenue_today || 0}</h2>
                        <small className="text-muted">REVENUE</small>
                    </div>
                </div>

                <h6 className="text-muted small mb-2">RECENT ENTRIES</h6>
                <div style={{maxHeight: '150px', overflowY: 'auto'}}>
                    <Table size="sm" variant="dark" hover className="small mb-0">
                        <tbody>
                            {stats?.active_sessions?.slice(0, 5).map(session => (
                                <tr key={session.id}>
                                    <td><span className="font-monospace text-info">{session.vehicle_no}</span></td>
                                    <td>{session.vehicle_type}</td>
                                    <td className="text-end text-muted">{new Date(session.entry_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                                </tr>
                            ))}
                            {(!stats?.active_sessions || stats.active_sessions.length === 0) && (
                                <tr><td colSpan="3" className="text-center text-muted">No active sessions</td></tr>
                            )}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>
        </Card>
    );
};

export default ParkingWidget;
