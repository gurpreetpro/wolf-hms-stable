/**
 * Wolf HMS - Staff Location Dashboard
 * 
 * Real-time view of all online delivery/collection staff
 * Uses Leaflet with auto-refresh every 30 seconds
 * 
 * Features:
 * - Live map with color-coded markers (medicine=amber, lab=purple)
 * - Staff list with last-seen timestamps
 * - Auto-refresh toggle
 * - Filter by role
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Badge, Form, Button, ListGroup, Spinner, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Users, RefreshCw, MapPin, Clock, Activity, Filter } from 'lucide-react';

// Fix Leaflet icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

const API_BASE = '';

// Create colored staff markers
function createStaffIcon(role) {
    const color = role === 'delivery' ? '#F59E0B' : role === 'phlebotomist' ? '#8B5CF6' : '#10B981';
    const emoji = role === 'delivery' ? '🚴' : role === 'phlebotomist' ? '🧪' : '👤';
    
    return L.divIcon({
        html: `<div style="
            width:36px;height:36px;border-radius:50%;
            background:${color};border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            font-size:16px;
        ">${emoji}</div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
    });
}

// Auto-fit map to staff markers
function AutoFit({ staff }) {
    const map = useMap();
    useEffect(() => {
        if (staff.length > 0) {
            const bounds = L.latLngBounds(staff.map(s => [s.latitude, s.longitude]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
    }, [staff, map]);
    return null;
}

// Time ago helper
function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const StaffLocationDashboard = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedStaff, setSelectedStaff] = useState(null);
    const intervalRef = useRef(null);
    
    const fetchStaff = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const params = new URLSearchParams();
            if (roleFilter !== 'all') params.set('role', roleFilter);
            
            const res = await fetch(`${API_BASE}/api/locations/online-staff?${params}`);
            const data = await res.json();
            
            if (data.success) {
                setStaff(data.staff);
                setError('');
            } else {
                throw new Error('Failed to fetch');
            }
        } catch (err) {
            setError('Could not load staff locations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [roleFilter]);
    
    // Initial load + filter change
    useEffect(() => {
        fetchStaff(true);
    }, [fetchStaff]);
    
    // Auto-refresh
    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(() => fetchStaff(false), 30000);
        }
        return () => clearInterval(intervalRef.current);
    }, [autoRefresh, fetchStaff]);
    
    const filteredStaff = staff;
    
    const countByRole = {
        delivery: staff.filter(s => s.role === 'delivery').length,
        phlebotomist: staff.filter(s => s.role === 'phlebotomist').length,
        other: staff.filter(s => s.role !== 'delivery' && s.role !== 'phlebotomist').length,
    };
    
    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-dark text-white d-flex align-items-center gap-2">
                <Users size={18} />
                <span className="fw-bold">Staff Locations</span>
                <Badge bg="success" className="ms-2">{staff.length} Online</Badge>
                
                <div className="ms-auto d-flex align-items-center gap-2">
                    <Form.Check
                        type="switch"
                        id="auto-refresh"
                        label={<small className="text-light">Auto-refresh</small>}
                        checked={autoRefresh}
                        onChange={e => setAutoRefresh(e.target.checked)}
                    />
                    <Button variant="outline-light" size="sm" onClick={() => fetchStaff(true)}>
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    </Button>
                </div>
            </Card.Header>
            <Card.Body className="p-0">
                <Row className="g-0">
                    {/* Map - larger portion */}
                    <Col md={8}>
                        <div style={{ height: 500 }}>
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
                                
                                {filteredStaff.length > 0 && <AutoFit staff={filteredStaff} />}
                                
                                {filteredStaff.map(s => (
                                    <Marker
                                        key={s.id}
                                        position={[s.latitude, s.longitude]}
                                        icon={createStaffIcon(s.role)}
                                        eventHandlers={{
                                            click: () => setSelectedStaff(s)
                                        }}
                                    >
                                        <Popup>
                                            <div style={{ minWidth: 150 }}>
                                                <strong>{s.name}</strong><br />
                                                <Badge bg={s.role === 'delivery' ? 'warning' : 'primary'} className="me-1">
                                                    {s.role}
                                                </Badge>
                                                <br />
                                                <small className="text-muted">
                                                    Updated: {timeAgo(s.last_updated)}
                                                </small><br />
                                                {s.speed_kmh > 0 && (
                                                    <small>Speed: {s.speed_kmh.toFixed(0)} km/h</small>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                    </Col>
                    
                    {/* Sidebar - staff list */}
                    <Col md={4} className="border-start">
                        {/* Role filter */}
                        <div className="p-2 border-bottom bg-light">
                            <div className="d-flex gap-1">
                                <Button
                                    size="sm"
                                    variant={roleFilter === 'all' ? 'dark' : 'outline-secondary'}
                                    onClick={() => setRoleFilter('all')}
                                >
                                    All ({staff.length})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={roleFilter === 'delivery' ? 'warning' : 'outline-secondary'}
                                    onClick={() => setRoleFilter('delivery')}
                                >
                                    🚴 {countByRole.delivery}
                                </Button>
                                <Button
                                    size="sm"
                                    variant={roleFilter === 'phlebotomist' ? 'primary' : 'outline-secondary'}
                                    onClick={() => setRoleFilter('phlebotomist')}
                                >
                                    🧪 {countByRole.phlebotomist}
                                </Button>
                            </div>
                        </div>
                        
                        {/* Staff list */}
                        <div style={{ height: 448, overflowY: 'auto' }}>
                            {loading ? (
                                <div className="text-center p-4">
                                    <Spinner size="sm" className="me-2" />Loading...
                                </div>
                            ) : error ? (
                                <div className="text-center p-4 text-muted">{error}</div>
                            ) : filteredStaff.length === 0 ? (
                                <div className="text-center p-4 text-muted">
                                    <MapPin size={32} className="mb-2 opacity-50" /><br />
                                    No staff online
                                </div>
                            ) : (
                                <ListGroup variant="flush">
                                    {filteredStaff.map(s => (
                                        <ListGroup.Item
                                            key={s.id}
                                            action
                                            active={selectedStaff?.id === s.id}
                                            onClick={() => setSelectedStaff(s)}
                                            className="py-2"
                                        >
                                            <div className="d-flex align-items-center gap-2">
                                                <div style={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    backgroundColor: '#22C55E',
                                                }} />
                                                <div className="flex-grow-1">
                                                    <div className="fw-semibold small">{s.name}</div>
                                                    <div className="d-flex align-items-center gap-1">
                                                        <Badge
                                                            bg={s.role === 'delivery' ? 'warning' : 'primary'}
                                                            text={s.role === 'delivery' ? 'dark' : 'light'}
                                                            style={{ fontSize: '0.65rem' }}
                                                        >
                                                            {s.role}
                                                        </Badge>
                                                        <small className="text-muted ms-1">
                                                            <Clock size={10} className="me-1" />
                                                            {timeAgo(s.last_updated)}
                                                        </small>
                                                    </div>
                                                </div>
                                                {s.speed_kmh > 0 && (
                                                    <OverlayTrigger overlay={<Tooltip>Moving at {s.speed_kmh.toFixed(0)} km/h</Tooltip>}>
                                                        <Activity size={14} className="text-success" />
                                                    </OverlayTrigger>
                                                )}
                                            </div>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )}
                        </div>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
};

export default StaffLocationDashboard;
