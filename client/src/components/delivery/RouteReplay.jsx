/**
 * Wolf HMS - Route Replay Panel
 * 
 * Admin component to visualize completed delivery/collection GPS trails
 * Uses Leaflet (same as LiveOverwatchMap) for consistency
 * 
 * Features:
 * - Staff/date/job selection dropdowns
 * - Animated polyline playback with play/pause/speed controls
 * - Stats: total distance, avg speed, time elapsed
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Form, Button, ButtonGroup, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, Pause, SkipForward, SkipBack, Clock, Navigation, Zap, MapPin } from 'lucide-react';

// Fix Leaflet default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

const API_BASE = '';

// Custom runner icon
const createRunnerIcon = () => L.divIcon({
    html: `<div style="
        width:32px;height:32px;border-radius:50%;
        background:linear-gradient(135deg,#F59E0B,#D97706);
        border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:14px;
    ">🏃</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

// Map bounds controller
function FitBounds({ points }) {
    const map = useMap();
    useEffect(() => {
        if (points.length > 1) {
            const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
            map.fitBounds(bounds, { padding: [40, 40] });
        } else if (points.length === 1) {
            map.setView([points[0].latitude, points[0].longitude], 15);
        }
    }, [points, map]);
    return null;
}

// Haversine distance between two GPS points (km)
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const RouteReplay = () => {
    // Form state
    const [staffId, setStaffId] = useState('');
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
    
    // Data
    const [trail, setTrail] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Playback
    const [playing, setPlaying] = useState(false);
    const [playIndex, setPlayIndex] = useState(0);
    const [speed, setSpeed] = useState(1);
    const intervalRef = useRef(null);
    
    const fetchTrail = async () => {
        if (!staffId) return;
        setLoading(true);
        setError('');
        setPlaying(false);
        setPlayIndex(0);
        
        try {
            const params = new URLSearchParams({ limit: '1000' });
            if (dateFrom) params.set('from', `${dateFrom}T00:00:00Z`);
            if (dateTo) params.set('to', `${dateTo}T23:59:59Z`);
            
            const res = await fetch(`${API_BASE}/api/locations/trail/${staffId}?${params}`);
            const data = await res.json();
            
            if (data.success && data.trail.length > 0) {
                setTrail(data.trail);
            } else {
                setTrail([]);
                setError(data.trail?.length === 0 ? 'No location data for this period' : 'Failed to fetch trail');
            }
        } catch (err) {
            setError('API request failed');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    // Playback controls
    useEffect(() => {
        if (playing && trail.length > 0) {
            intervalRef.current = setInterval(() => {
                setPlayIndex(prev => {
                    if (prev >= trail.length - 1) {
                        setPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 500 / speed);
        }
        return () => clearInterval(intervalRef.current);
    }, [playing, speed, trail.length]);
    
    // Calculate stats
    const stats = useMemo(() => {
        if (trail.length < 2) return { distance: 0, avgSpeed: 0, duration: 0 };
        
        let totalDist = 0;
        for (let i = 1; i < trail.length; i++) {
            totalDist += haversine(trail[i - 1].latitude, trail[i - 1].longitude, trail[i].latitude, trail[i].longitude);
        }
        
        const startTime = new Date(trail[0].recorded_at).getTime();
        const endTime = new Date(trail[trail.length - 1].recorded_at).getTime();
        const durationHrs = (endTime - startTime) / (1000 * 60 * 60);
        
        return {
            distance: totalDist,
            avgSpeed: durationHrs > 0 ? totalDist / durationHrs : 0,
            duration: (endTime - startTime) / (1000 * 60), // minutes
        };
    }, [trail]);
    
    // Playback line (up to current index)
    const playbackLine = useMemo(() => {
        return trail.slice(0, playIndex + 1).map(p => [p.latitude, p.longitude]);
    }, [trail, playIndex]);
    
    // Full trail line (dimmed)
    const fullLine = useMemo(() => {
        return trail.map(p => [p.latitude, p.longitude]);
    }, [trail]);
    
    const currentPoint = trail[playIndex];
    
    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-dark text-white d-flex align-items-center gap-2">
                <Navigation size={18} />
                <span className="fw-bold">Route Replay</span>
                <Badge bg="warning" text="dark" className="ms-auto">Phase 5</Badge>
            </Card.Header>
            <Card.Body>
                {/* Controls */}
                <Row className="g-2 mb-3">
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="small text-muted mb-1">Staff ID</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="e.g. 42"
                                value={staffId}
                                onChange={e => setStaffId(e.target.value)}
                                size="sm"
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="small text-muted mb-1">From</Form.Label>
                            <Form.Control type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} size="sm" />
                        </Form.Group>
                    </Col>
                    <Col md={3}>
                        <Form.Group>
                            <Form.Label className="small text-muted mb-1">To</Form.Label>
                            <Form.Control type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} size="sm" />
                        </Form.Group>
                    </Col>
                    <Col md={3} className="d-flex align-items-end">
                        <Button variant="primary" size="sm" onClick={fetchTrail} disabled={loading || !staffId} className="w-100">
                            {loading ? <Spinner size="sm" /> : 'Load Trail'}
                        </Button>
                    </Col>
                </Row>
                
                {error && <div className="alert alert-warning py-2 small">{error}</div>}
                
                {/* Map */}
                <div style={{ height: 400, borderRadius: 12, overflow: 'hidden', border: '1px solid #dee2e6' }}>
                    <MapContainer
                        center={[20.5937, 78.9629]}
                        zoom={5}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap"
                        />
                        
                        {trail.length > 0 && <FitBounds points={trail} />}
                        
                        {/* Full trail (dimmed) */}
                        {fullLine.length > 1 && (
                            <Polyline positions={fullLine} pathOptions={{ color: '#94A3B8', weight: 2, dashArray: '5 5' }} />
                        )}
                        
                        {/* Played portion (highlighted) */}
                        {playbackLine.length > 1 && (
                            <Polyline positions={playbackLine} pathOptions={{ color: '#F59E0B', weight: 4 }} />
                        )}
                        
                        {/* Start marker */}
                        {trail.length > 0 && (
                            <Marker position={[trail[0].latitude, trail[0].longitude]}>
                                <Popup>
                                    <strong>Start</strong><br />
                                    {new Date(trail[0].recorded_at).toLocaleString()}
                                </Popup>
                            </Marker>
                        )}
                        
                        {/* End marker */}
                        {trail.length > 1 && (
                            <Marker position={[trail[trail.length - 1].latitude, trail[trail.length - 1].longitude]}>
                                <Popup>
                                    <strong>End</strong><br />
                                    {new Date(trail[trail.length - 1].recorded_at).toLocaleString()}
                                </Popup>
                            </Marker>
                        )}
                        
                        {/* Current position during playback */}
                        {currentPoint && (
                            <Marker position={[currentPoint.latitude, currentPoint.longitude]} icon={createRunnerIcon()}>
                                <Popup>
                                    <strong>Current Position</strong><br />
                                    {new Date(currentPoint.recorded_at).toLocaleString()}<br />
                                    Speed: {currentPoint.speed_kmh?.toFixed(1) || '—'} km/h
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </div>
                
                {/* Playback Controls */}
                {trail.length > 0 && (
                    <div className="mt-3">
                        <div className="d-flex align-items-center gap-3 mb-2">
                            <ButtonGroup size="sm">
                                <Button variant="outline-secondary" onClick={() => setPlayIndex(0)}>
                                    <SkipBack size={14} />
                                </Button>
                                <Button 
                                    variant={playing ? 'warning' : 'success'} 
                                    onClick={() => setPlaying(!playing)}
                                >
                                    {playing ? <Pause size={14} /> : <Play size={14} />}
                                </Button>
                                <Button variant="outline-secondary" onClick={() => setPlayIndex(trail.length - 1)}>
                                    <SkipForward size={14} />
                                </Button>
                            </ButtonGroup>
                            
                            <ButtonGroup size="sm">
                                {[0.5, 1, 2, 5].map(s => (
                                    <Button
                                        key={s}
                                        variant={speed === s ? 'primary' : 'outline-secondary'}
                                        onClick={() => setSpeed(s)}
                                    >
                                        {s}x
                                    </Button>
                                ))}
                            </ButtonGroup>
                            
                            <div className="ms-auto small text-muted">
                                <Clock size={12} className="me-1" />
                                {currentPoint ? new Date(currentPoint.recorded_at).toLocaleTimeString() : '—'}
                            </div>
                        </div>
                        
                        {/* Progress bar */}
                        <Form.Range
                            min={0}
                            max={trail.length - 1}
                            value={playIndex}
                            onChange={e => { setPlayIndex(Number(e.target.value)); setPlaying(false); }}
                            className="mb-2"
                        />
                        
                        {/* Stats */}
                        <Row className="g-2 text-center">
                            <Col xs={4}>
                                <div className="bg-light rounded p-2">
                                    <div className="fw-bold text-primary">{stats.distance.toFixed(1)} km</div>
                                    <div className="small text-muted">Total Distance</div>
                                </div>
                            </Col>
                            <Col xs={4}>
                                <div className="bg-light rounded p-2">
                                    <div className="fw-bold text-success">{stats.avgSpeed.toFixed(0)} km/h</div>
                                    <div className="small text-muted">Avg Speed</div>
                                </div>
                            </Col>
                            <Col xs={4}>
                                <div className="bg-light rounded p-2">
                                    <div className="fw-bold text-info">{Math.round(stats.duration)} min</div>
                                    <div className="small text-muted">Duration</div>
                                </div>
                            </Col>
                        </Row>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default RouteReplay;
