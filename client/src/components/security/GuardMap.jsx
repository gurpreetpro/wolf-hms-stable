
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from 'react-leaflet';
import { Battery, Wifi } from 'lucide-react';
import L from 'leaflet';
import { io } from 'socket.io-client';
import 'leaflet/dist/leaflet.css';
import securityService from '../../services/securityService';

// Fix Leaflet Default Icon Issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Custom Guard Icon
const createGuardIcon = (heading) => L.divIcon({
    className: 'custom-guard-icon',
    html: `
        <div class="guard-marker-ring"></div>
        <div class="guard-marker-core" style="transform: rotate(${heading}deg)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M12 2L2 22l10-2 10 2L12 2z" fill="#00e5ff" stroke="#000" />
            </svg>
        </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
});

// Map Updater Hook
const MapUpdater = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if(center) map.flyTo(center, map.getZoom());
    }, [center, map]);
    return null;
};

const GuardMap = ({ activeGuards = [] }) => {
    const [guards, setGuards] = useState({}); // { guardId: { lat, lng, heading... } }
    const [geofences, setGeofences] = useState([]); 
    // socket state removed as we don't strictly need to store it if we cleanup in useEffect
    
    // Fetch Geofences
    useEffect(() => {
        const loadGeofences = async () => {
            const zones = await securityService.getGeofences();
            setGeofences(zones || []);
        };
        loadGeofences();
    }, []);

    // Initial State from Props
    useEffect(() => {
        const initialMap = {};
        activeGuards.forEach(g => {
            if (g.last_location) {
                initialMap[g.id] = { ...g.last_location, username: g.guard_name };
            }
        });
        setGuards(prev => ({...prev, ...initialMap}));
    }, [activeGuards]);

    // Socket Connection
    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080'); // Uses env var for prod

        newSocket.on('guard_location_update', (data) => {
            // console.log('[GuardMap] Location Update:', data);
            setGuards(prev => ({
                ...prev,
                [data.guard_id]: data
            }));
        });

        return () => newSocket.disconnect();
    }, []);

    // Center Map (Focus on first active guard or Facility Center)
    const facilityCenter = [28.6139, 77.2090]; // Default: New Delhi (Change to actual facility coords)
    const activeGuardIds = Object.keys(guards);
    const center = activeGuardIds.length > 0 
        ? [guards[activeGuardIds[0]].latitude, guards[activeGuardIds[0]].longitude] 
        : facilityCenter;

     // Zone Styling
     const getZoneStyle = (type) => ({
        color: type === 'RESTRICTED' ? '#ff0000' : type === 'SAFE_ZONE' ? '#00ff00' : '#ffff00',
        fillColor: type === 'RESTRICTED' ? '#ff0000' : type === 'SAFE_ZONE' ? '#00ff00' : '#ffff00',
        fillOpacity: 0.1,
        weight: 2
    });

    return (
        <div className="guard-map-container" style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--sec-glass-border)' }}>
            <MapContainer 
                center={center} 
                zoom={18} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                {/* Dark Mode Tiles */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <MapUpdater center={center} />

                 {/* Geofences */}
                 {geofences.map(zone => (
                    <Polygon 
                        key={zone.id}
                        positions={zone.coordinates}
                        pathOptions={getZoneStyle(zone.zone_type)}
                    >
                         <Popup className="glass-popup">
                            <div style={{ color: '#000' }}>
                                <strong>{zone.name}</strong><br/>
                                <small>{zone.zone_type}</small>
                            </div>
                        </Popup>
                    </Polygon>
                ))}

                {Object.values(guards).map((guard) => (
                    <Marker 
                        key={guard.guard_id || guard.id} 
                        position={[guard.latitude, guard.longitude]} 
                        icon={createGuardIcon(guard.heading || 0)}
                    >
                        <Popup className="glass-popup">
                            <div style={{ color: '#000', minWidth: '150px' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <strong style={{ fontSize: '1.1em' }}>{guard.username}</strong>
                                    <span className="badge bg-primary">{guard.speed ? Number(guard.speed).toFixed(1) : 0} m/s</span>
                                </div>
                                
                                <div className="d-flex gap-2 mb-1" style={{ fontSize: '0.9em' }}>
                                    <div className={`d-flex align-items-center ${(guard.batteryLevel < 20) ? 'text-danger fw-bold' : ''}`}>
                                        <Battery size={16} className="me-1" /> 
                                        {guard.batteryLevel !== undefined && guard.batteryLevel !== null ? `${guard.batteryLevel}%` : 'N/A'}
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <Wifi size={16} className="me-1" /> 
                                        {guard.signalStrength !== undefined && guard.signalStrength !== null ? `${guard.signalStrength}/5` : 'N/A'}
                                    </div>
                                </div>
                                <small className="text-muted">Last Update: {new Date().toLocaleTimeString()}</small>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* CSS for Marker Animation */}
            <style jsx>{`
                .guard-marker-ring {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    border: 2px solid #00e5ff;
                    animation: pulse-ring 2s infinite;
                    top: 0;
                    left: 0;
                }
                .guard-marker-core {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    top: 0;
                    left: 0;
                }
                @keyframes pulse-ring {
                    0% { transform: scale(0.5); opacity: 1; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default GuardMap;
