
import React from 'react';
import { Card, Table, Badge } from 'react-bootstrap';
import { Users, Clock, LogIn } from 'lucide-react';

const VisitorsLog = ({ visitors }) => {
    return (
        <Card className="h-100 shadow-sm wolf-card">
            <Card.Header className="bg-transparent border-0 d-flex justify-content-between align-items-center pt-3 pb-0">
                <h5 className="text-white mb-0 d-flex align-items-center">
                    <Users size={20} className="me-2 text-primary" />
                    Visitor Log
                </h5>
                <Badge bg="primary" className="text-white">Today</Badge>
            </Card.Header>
            <Card.Body className="p-0">
                <Table hover variant="dark" className="mb-0 align-middle small" style={{ backgroundColor: 'transparent' }}>
                    <thead>
                        <tr className="text-muted text-uppercase">
                            <th className="ps-4">Visitor</th>
                            <th>Time</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visitors && visitors.length > 0 ? (
                            visitors.map((visitor) => (
                                <tr key={visitor.id}>
                                    <td className="ps-4 fw-bold">{visitor.full_name}</td>
                                    <td className="text-muted">
                                        <Clock size={12} className="me-1" />
                                        {new Date(visitor.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td>
                                        <Badge bg={visitor.status === 'Checked In' ? 'success' : 'secondary'}>
                                            {visitor.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" className="text-center py-4 text-muted fst-italic">
                                    No recent visitors.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
};

export default VisitorsLog;
