
import React from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { Camera, Maximize, Play } from 'lucide-react';

const CAMERAS = [
    { id: 1, name: 'Main Gate', status: 'LIVE', color: 'success' },
    { id: 2, name: 'ER Entrance', status: 'LIVE', color: 'success' },
    { id: 3, name: 'Parking Lot A', status: 'LIVE', color: 'success' },
    { id: 4, name: 'Server Room', status: 'REC', color: 'danger' },
];

const CCTVGrid = () => {
    return (
        <Card className="glass-card h-100">
            <Card.Header className="d-flex justify-content-between align-items-center border-0 bg-transparent text-light">
                <div className="d-flex align-items-center">
                    <Camera className="text-neon-blue me-2" size={20} />
                    <h5 className="mb-0 sec-font">Surveillance Matrix</h5>
                </div>
                <Badge bg="danger" className="pulsing-badge">LIVE</Badge>
            </Card.Header>
            <Card.Body className="p-2">
                <Row className="g-2 h-100">
                    {CAMERAS.map(cam => (
                        <Col xs={6} key={cam.id}>
                            <div className="camera-feed position-relative">
                                {/* Mock Feed Content - Gradient or Pattern */}
                                <div className="feed-content">
                                    <div className="scan-line"></div>
                                    <div className="noise"></div>
                                </div>
                                
                                <div className="overlay-info">
                                    <small className="text-light fw-bold">{cam.name}</small>
                                    <Badge bg={cam.color} className="ms-2" style={{fontSize: '0.6em'}}>{cam.status}</Badge>
                                </div>
                                <div className="timestamp">
                                    {new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        </Col>
                    ))}
                </Row>
            </Card.Body>
            <style jsx>{`
                .glass-card {
                    background: rgba(20, 20, 30, 0.6);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .camera-feed {
                    background: #000;
                    border: 1px solid #333;
                    border-radius: 4px;
                    height: 120px;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .feed-content {
                    width: 100%; height: 100%;
                    background: linear-gradient(45deg, #111 25%, #1a1a1a 25%, #1a1a1a 50%, #111 50%, #111 75%, #1a1a1a 75%, #1a1a1a 100%);
                    background-size: 20px 20px;
                    opacity: 0.5;
                }
                .overlay-info {
                    position: absolute;
                    top: 5px; left: 8px;
                    text-shadow: 1px 1px 2px black;
                }
                .timestamp {
                    position: absolute;
                    bottom: 5px; right: 8px;
                    color: #00ff00;
                    font-family: monospace;
                    font-size: 0.7rem;
                    text-shadow: 1px 1px 1px black;
                }
                .scan-line {
                    position: absolute;
                    width: 100%; height: 2px;
                    background: rgba(0, 255, 0, 0.2);
                    animation: scan 3s linear infinite;
                }
                @keyframes scan { from { top: 0; } to { top: 100%; } }
            `}</style>
        </Card>
    );
};

export default CCTVGrid;
