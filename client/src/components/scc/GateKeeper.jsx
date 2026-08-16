import React from 'react';
import { Card, Row, Col, Badge, Button } from 'react-bootstrap';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';

const GateKeeper = ({ gates = [], onToggleGate }) => {

    const getStatusVariant = (status) => {
        switch (status) {
            case 'OPEN': return 'success';
            case 'LOCKED': return 'danger';
            case 'MAINTENANCE': return 'warning';
            default: return 'secondary';
        }
    };

    return (
        <Card bg="dark" text="white" className="h-100 border-secondary">
            <Card.Body>
                <div className="d-flex align-items-center mb-3">
                    <Card.Title className="flex-grow-1 mb-0" style={{ color: '#00e5ff' }}>
                        GATE KEEPER (IoT)
                    </Card.Title>
                    <Badge bg="primary" className="border border-primary">
                        {gates.length} CONNECTED
                    </Badge>
                </div>

                <Row className="g-2">
                    {gates.map((gate) => (
                        <Col xs={12} key={gate.id}>
                            <div
                                className="d-flex align-items-center justify-content-between p-2 rounded"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    borderLeft: `4px solid ${gate.status === 'OPEN' ? '#00e676' : '#f50057'}`
                                }}
                            >
                                <div>
                                    <div className="fw-bold">{gate.name}</div>
                                    <small className="text-muted">{gate.location}</small>
                                </div>

                                <div className="d-flex align-items-center gap-2">
                                    <Badge bg={getStatusVariant(gate.status)} className="d-flex align-items-center gap-1">
                                        {gate.status === 'OPEN' ? <Unlock size={12} /> : <Lock size={12} />}
                                        {gate.status}
                                    </Badge>

                                    <Button
                                        variant={gate.status === 'OPEN' ? 'outline-danger' : 'outline-success'}
                                        size="sm"
                                        onClick={() => onToggleGate(gate.id, gate.status === 'OPEN' ? 'LOCKED' : 'OPEN')}
                                    >
                                        {gate.status === 'OPEN' ? 'LOCK' : 'OPEN'}
                                    </Button>
                                </div>
                            </div>
                        </Col>
                    ))}

                    {gates.length === 0 && (
                        <Col xs={12}>
                            <div className="text-center text-muted p-4">
                                <AlertTriangle size={32} className="mb-2 opacity-50" />
                                <div>No IoT Gates Detected</div>
                            </div>
                        </Col>
                    )}
                </Row>
            </Card.Body>
        </Card>
    );
};

export default GateKeeper;
