import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Alert, InputGroup } from 'react-bootstrap';
import { Upload, Save, Map, Crosshair } from 'lucide-react';
import { API_BASE } from '../../config';

const FloorPlanManager = ({ onSave }) => {
    const [imageUrl, setImageUrl] = useState('');
    const [bounds, setBounds] = useState({
        north: '',
        south: '',
        east: '',
        west: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);

    // Load active map on mount
    React.useEffect(() => {
        const fetchActiveMap = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/api/security/maps/active`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.data) {
                    setImageUrl(data.data.image_url);
                    // Parse bounds if string, or use directly if object
                    const b = typeof data.data.bounds === 'string' ? JSON.parse(data.data.bounds) : data.data.bounds;
                    // b is [[N, W], [S, E]]
                    setBounds({
                        north: b[0][0],
                        west: b[0][1],
                        south: b[1][0],
                        east: b[1][1]
                    });
                }
            } catch (err) {
                console.error("Failed to load map:", err);
            }
        };
        fetchActiveMap();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setSuccess(null);
        try {
            const token = localStorage.getItem('token');
            const floorPlanData = {
                image_url: imageUrl,
                bounds: [
                    [parseFloat(bounds.north), parseFloat(bounds.west)], // TopLeft
                    [parseFloat(bounds.south), parseFloat(bounds.east)]  // BottomRight
                ]
            };

            const res = await fetch(`${API_BASE}/api/security/maps`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(floorPlanData)
            });
            
            const result = await res.json();
            
            if (result.success) {
                setSuccess('Floor plan calibrated & saved active.');
                if (onSave) onSave(result.data);
            } else {
                throw new Error(result.message || 'Save failed');
            }
        } catch (error) {
            console.error(error);
            setSuccess('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="bg-dark border-secondary text-light h-100">
            <Card.Header className="border-bottom border-secondary d-flex align-items-center">
                <Map size={18} className="text-info me-2" />
                <h6 className="mb-0 text-uppercase font-monospace">Floor Plan Calibration</h6>
            </Card.Header>
            <Card.Body>
                {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}
                
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label className="text-muted small">IMAGE URL (BLUEPRINT)</Form.Label>
                        <InputGroup>
                            <InputGroup.Text className="bg-secondary border-secondary text-light"><Upload size={16}/></InputGroup.Text>
                            <Form.Control 
                                type="text" 
                                placeholder="https://..." 
                                className="bg-black border-secondary text-light"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                            />
                        </InputGroup>
                        <Form.Text className="text-muted">Upload a raster image of the floor plan.</Form.Text>
                    </Form.Group>

                    <h6 className="text-muted small mt-4 mb-3 border-bottom border-secondary pb-2">GPS CALIBRATION (WGS84)</h6>
                    
                    <Row className="g-3 mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="text-muted small">NORTH LATITUDE</Form.Label>
                                <Form.Control 
                                    type="number" step="0.000001"
                                    className="bg-black border-secondary text-light font-monospace"
                                    value={bounds.north}
                                    onChange={(e) => setBounds({...bounds, north: e.target.value})}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="text-muted small">WEST LONGITUDE</Form.Label>
                                <Form.Control 
                                    type="number" step="0.000001"
                                    className="bg-black border-secondary text-light font-monospace"
                                    value={bounds.west}
                                    onChange={(e) => setBounds({...bounds, west: e.target.value})}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    
                    <Row className="g-3 mb-4">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="text-muted small">SOUTH LATITUDE</Form.Label>
                                <Form.Control 
                                    type="number" step="0.000001"
                                    className="bg-black border-secondary text-light font-monospace"
                                    value={bounds.south}
                                    onChange={(e) => setBounds({...bounds, south: e.target.value})}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="text-muted small">EAST LONGITUDE</Form.Label>
                                <Form.Control 
                                    type="number" step="0.000001"
                                    className="bg-black border-secondary text-light font-monospace"
                                    value={bounds.east}
                                    onChange={(e) => setBounds({...bounds, east: e.target.value})}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Button 
                        variant="info" 
                        className="w-100 d-flex align-items-center justify-content-center fw-bold"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? 'CALIBRATING...' : <><Crosshair size={18} className="me-2"/> CALIBRATE & SAVE</>}
                    </Button>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default FloorPlanManager;
