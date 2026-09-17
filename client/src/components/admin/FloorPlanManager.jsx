import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Table, Alert } from 'react-bootstrap';
import { Map, Sliders, RefreshCw, Compass, Shield, Plus, CheckCircle2, Layers } from 'lucide-react';
import { API_BASE } from '../../config';
import FloorPlanStudioModal from '../security/studio/FloorPlanStudioModal';

const FloorPlanManager = ({ onSave }) => {
    const [floorPlans, setFloorPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showStudio, setShowStudio] = useState(false);
    const [studioFloor, setStudioFloor] = useState(1);
    const [notification, setNotification] = useState(null);

    const fetchFloorPlans = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Query known hospital floor levels in parallel
            const floorsToCheck = [-1, 1, 2, 3, 4];
            const promises = floorsToCheck.map(f =>
                fetch(`${API_BASE}/api/security/maps/active?floor=${f}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(r => r.json())
                .catch(() => null)
            );
            const results = await Promise.all(promises);
            const foundPlans = results
                .filter(r => r && r.success && r.data && r.data.id)
                .map(r => r.data);

            const uniqueMap = new Map();
            foundPlans.forEach(p => uniqueMap.set(p.floor_number, p));
            setFloorPlans(Array.from(uniqueMap.values()).sort((a, b) => a.floor_number - b.floor_number));
        } catch (err) {
            console.error('[FloorPlanManager] Error fetching maps:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFloorPlans();
    }, []);

    const handleStudioOpen = (floorNum) => {
        setStudioFloor(floorNum);
        setShowStudio(true);
    };

    const handleSaveSuccess = (savedPlan) => {
        setNotification({ type: 'success', text: `Floor ${savedPlan.floor_number} calibrated & activated.` });
        fetchFloorPlans();
        if (onSave) onSave(savedPlan);
    };

    return (
        <Card className="bg-dark border-secondary text-light h-100" style={{ backgroundColor: '#0c101d', borderColor: '#1e293b' }}>
            <Card.Header className="border-bottom border-secondary d-flex align-items-center justify-content-between" style={{ borderColor: '#1e293b' }}>
                <div className="d-flex align-items-center gap-2">
                    <Map size={18} className="text-info" />
                    <h6 className="mb-0 text-uppercase font-monospace" style={{ letterSpacing: '0.5px' }}>
                        Multi-Floor Architecture & Georeferencing
                    </h6>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        onClick={fetchFloorPlans}
                        disabled={loading}
                        className="d-flex align-items-center gap-1"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button 
                        variant="info" 
                        size="sm" 
                        className="d-flex align-items-center gap-1 fw-bold text-dark"
                        onClick={() => handleStudioOpen(1)}
                        style={{ background: 'linear-gradient(135deg, #00f0ff 0%, #0091ea 100%)', border: 'none' }}
                    >
                        <Sliders size={14} /> OPEN STUDIO
                    </Button>
                </div>
            </Card.Header>

            <Card.Body>
                {notification && (
                    <Alert 
                        variant={notification.type} 
                        onClose={() => setNotification(null)} 
                        dismissible
                        className="bg-dark border-info text-info small py-2"
                    >
                        {notification.text}
                    </Alert>
                )}

                <div className="p-3 mb-4 rounded" style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                    <div className="d-flex align-items-start gap-3">
                        <Compass size={28} className="text-info mt-1" />
                        <div>
                            <h6 className="text-info mb-1 fw-bold">Industrial Georeferencing Engine</h6>
                            <p className="text-muted small mb-2">
                                Align architectural blueprints directly over satellite imagery with 4-corner affine projection. Trace walkable corridors to constrain mobile guard positions using particle filtering.
                            </p>
                            <div className="d-flex gap-2">
                                <Button 
                                    variant="outline-info" 
                                    size="sm"
                                    onClick={() => handleStudioOpen(1)}
                                    className="d-flex align-items-center gap-1 fw-semibold"
                                >
                                    <Sliders size={13} /> Launch Georeferencing Studio
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="text-muted small mb-0 font-monospace">HOSPITAL LEVELS & BLUEPRINTS</h6>
                    <div className="d-flex gap-1">
                        {[-1, 1, 2, 3, 4].map(lvl => (
                            <Button 
                                key={lvl} 
                                variant="outline-secondary" 
                                size="sm" 
                                style={{ fontSize: '11px', padding: '2px 8px' }}
                                onClick={() => handleStudioOpen(lvl)}
                            >
                                + Level {lvl <= 0 ? `B${Math.abs(lvl) + 1}` : `L${lvl}`}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="table-responsive">
                    <Table hover variant="dark" className="border-secondary align-middle small mb-0" style={{ borderColor: '#1e293b' }}>
                        <thead>
                            <tr className="text-muted text-uppercase" style={{ fontSize: '10px' }}>
                                <th>LEVEL</th>
                                <th>BUILDING</th>
                                <th>STATUS</th>
                                <th>ROTATION</th>
                                <th>CORRIDORS</th>
                                <th>ZONES</th>
                                <th className="text-end">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {floorPlans.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-muted">
                                        No active floor blueprints found. Click "Open Studio" to upload and calibrate level 1.
                                    </td>
                                </tr>
                            ) : (
                                floorPlans.map(fp => {
                                    const fl = fp.floor_number;
                                    const floorLabel = fl <= 0 ? `Basement ${Math.abs(fl) + 1}` : `Floor ${fl}`;
                                    const isCalibrated = fp.calibration_status === 'calibrated' || fp.calibration_status === 'fine_tuned';
                                    const corridorCount = fp.walkable_graph?.nodes?.length || 0;
                                    const zoneCount = fp.zones?.length || 0;

                                    return (
                                        <tr key={fp.id}>
                                            <td className="fw-bold font-monospace text-info">{floorLabel}</td>
                                            <td>{fp.building_name || 'Main Complex'}</td>
                                            <td>
                                                <Badge bg={isCalibrated ? 'success' : 'warning'} className="text-uppercase" style={{ fontSize: '10px' }}>
                                                    {fp.calibration_status || 'uncalibrated'}
                                                </Badge>
                                            </td>
                                            <td className="font-monospace">
                                                {fp.rotation_deg != null ? `${parseFloat(fp.rotation_deg).toFixed(1)}°` : '0.0°'}
                                            </td>
                                            <td>
                                                <Badge bg={corridorCount > 0 ? 'info' : 'secondary'} className="text-dark">
                                                    {corridorCount} nodes
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge bg={zoneCount > 0 ? 'primary' : 'secondary'}>
                                                    {zoneCount} zones
                                                </Badge>
                                            </td>
                                            <td className="text-end">
                                                <Button 
                                                    variant="outline-info" 
                                                    size="sm"
                                                    onClick={() => handleStudioOpen(fl)}
                                                    style={{ fontSize: '11px', padding: '2px 8px' }}
                                                >
                                                    <Sliders size={12} className="me-1" /> Calibrate
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>

            {/* Studio Modal */}
            <FloorPlanStudioModal 
                isOpen={showStudio} 
                onClose={() => setShowStudio(false)} 
                initialFloor={studioFloor}
                onSaveSuccess={handleSaveSuccess}
            />
        </Card>
    );
};

export default FloorPlanManager;
