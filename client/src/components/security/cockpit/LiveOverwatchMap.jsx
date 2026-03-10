import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, ImageOverlay, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Guard Icon with status colors
const createGuardIcon = (status) => {
    const colors = {
        ONLINE: '#00c853',
        PATROLLING: '#00d4ff',
        IDLE: '#ffab00',
        OFFLINE: '#9e9e9e',
        SOS: '#ff1744'
    };
    const color = colors[status?.toUpperCase()] || colors.ONLINE;
    
    return L.divIcon({
        className: 'guard-marker',
        html: `
            <div style="
                width: 36px;
                height: 36px;
                background: ${color};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                ${status?.toUpperCase() === 'SOS' ? 'animation: sosPulse 0.5s ease-in-out infinite;' : ''}
            ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
    });
};

/**
 * MapBoundsController - Auto-fits map to show all guards or hospital
 * This solves the "world map is too big" problem
 */
const MapBoundsController = ({ guards, hospitalLocation, selectedGuard }) => {
    const map = useMap();
    
    useEffect(() => {
        // If a guard is selected, fly to them
        if (selectedGuard?.latitude && selectedGuard?.longitude) {
            map.flyTo([selectedGuard.latitude, selectedGuard.longitude], 18, {
                animate: true,
                duration: 1
            });
            return;
        }
        
        // Get all valid guard locations
        const validGuards = guards.filter(g => 
            g.latitude && g.longitude && 
            !isNaN(g.latitude) && !isNaN(g.longitude)
        );
        
        if (validGuards.length > 0) {
            // Create bounds from all guard locations
            const bounds = L.latLngBounds(
                validGuards.map(g => [g.latitude, g.longitude])
            );
            
            // Add padding and fit bounds
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 18,
                animate: true,
                duration: 0.5
            });
        } else if (hospitalLocation?.latitude && hospitalLocation?.longitude) {
            // No guards online - center on hospital location
            map.setView([hospitalLocation.latitude, hospitalLocation.longitude], 16);
        }
        // If no guards and no hospital location, keep default view
        
    }, [guards, hospitalLocation, selectedGuard, map]);
    
    return null;
};

/**
 * LiveOverwatchMap - Real-time guard tracking map
 * Features:
 * - Auto-centers on guards or hospital location
 * - Status-colored guard markers
 * - Geofence visualization
 * - Floor plan overlay support
 */
const LiveOverwatchMap = ({ 
    guards = [], 
    onSelectGuard, 
    floorPlan, 
    selectedGuard,
    hospitalLocation = null,  // { latitude, longitude, name }
    geofences = []
}) => {
    // Default center fallback (India center) - used only if no other data
    const defaultCenter = useMemo(() => {
        // Try to get center from guards
        const validGuards = guards.filter(g => g.latitude && g.longitude);
        if (validGuards.length > 0) {
            const avgLat = validGuards.reduce((sum, g) => sum + g.latitude, 0) / validGuards.length;
            const avgLng = validGuards.reduce((sum, g) => sum + g.longitude, 0) / validGuards.length;
            return [avgLat, avgLng];
        }
        
        // Try hospital location
        if (hospitalLocation?.latitude && hospitalLocation?.longitude) {
            return [hospitalLocation.latitude, hospitalLocation.longitude];
        }
        
        // Fallback to India center
        return [20.5937, 78.9629];
    }, [guards, hospitalLocation]);
    
    // Calculate initial zoom based on number of guards
    const initialZoom = useMemo(() => {
        const validGuards = guards.filter(g => g.latitude && g.longitude);
        if (validGuards.length === 0) return 16;
        if (validGuards.length === 1) return 18;
        return 15; // Will be overridden by fitBounds anyway
    }, [guards]);
    
    // Floor plan bounds
    const imageBounds = floorPlan?.bounds || [
        [defaultCenter[0] + 0.001, defaultCenter[1] - 0.001],
        [defaultCenter[0] - 0.001, defaultCenter[1] + 0.001]
    ];

    return (
        <div className="live-overwatch-map" style={{ 
            height: '100%', 
            width: '100%', 
            minHeight: '400px', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            border: '1px solid #3d3d5c',
            position: 'relative',
            background: '#1a1a2e'
        }}>
            <MapContainer 
                center={defaultCenter} 
                zoom={initialZoom} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                {/* Dark Mode Base Layer */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                    maxZoom={20}
                />
                
                {/* Auto-fit bounds controller */}
                <MapBoundsController 
                    guards={guards}
                    hospitalLocation={hospitalLocation}
                    selectedGuard={selectedGuard}
                />
                
                {/* Floor Plan Overlay */}
                {floorPlan && (
                    <ImageOverlay
                        url={floorPlan.url}
                        bounds={imageBounds}
                        opacity={0.8}
                    />
                )}
                
                {/* Hospital Location Marker */}
                {hospitalLocation?.latitude && hospitalLocation?.longitude && (
                    <Marker 
                        position={[hospitalLocation.latitude, hospitalLocation.longitude]}
                        icon={L.divIcon({
                            className: 'hospital-marker',
                            html: `
                                <div style="
                                    width: 44px;
                                    height: 44px;
                                    background: linear-gradient(135deg, #00d4ff 0%, #0091ea 100%);
                                    border: 3px solid white;
                                    border-radius: 50%;
                                    box-shadow: 0 2px 12px rgba(0,212,255,0.4);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                ">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z"/>
                                    </svg>
                                </div>
                            `,
                            iconSize: [44, 44],
                            iconAnchor: [22, 22]
                        })}
                    >
                        <Popup>
                            <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                🏥 {hospitalLocation.name || 'Hospital'}
                            </div>
                        </Popup>
                    </Marker>
                )}
                
                {/* Geofences */}
                {geofences.map((fence, idx) => (
                    <Circle 
                        key={fence.id || idx}
                        center={[fence.latitude || defaultCenter[0], fence.longitude || defaultCenter[1]]} 
                        radius={fence.radius || 100} 
                        pathOptions={{ 
                            color: fence.type === 'restricted' ? '#ff1744' : '#00d4ff', 
                            fillColor: fence.type === 'restricted' ? '#ff1744' : '#00d4ff', 
                            fillOpacity: 0.1, 
                            dashArray: '5, 10',
                            weight: 2
                        }} 
                    />
                ))}

                {/* Guard Markers */}
                {guards.map(guard => {
                    if (!guard.latitude || !guard.longitude) return null;
                    
                    return (
                        <Marker 
                            key={guard.guard_id} 
                            position={[guard.latitude, guard.longitude]}
                            icon={createGuardIcon(guard.status)}
                            eventHandlers={{
                                click: () => onSelectGuard && onSelectGuard(guard),
                            }}
                        >
                            <Popup>
                                <div style={{ textAlign: 'center', minWidth: '120px' }}>
                                    <strong style={{ fontSize: '14px' }}>{guard.username || 'Guard'}</strong>
                                    <br/>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        marginTop: '4px',
                                        background: guard.status === 'ONLINE' ? '#00c853' : 
                                                   guard.status === 'PATROLLING' ? '#00d4ff' :
                                                   guard.status === 'SOS' ? '#ff1744' : '#9e9e9e',
                                        color: 'white'
                                    }}>
                                        {guard.status || 'Unknown'}
                                    </span>
                                    {guard.batteryLevel && (
                                        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                                            🔋 {Math.round(guard.batteryLevel * 100)}%
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
            
            {/* Map Overlay Badge */}
            <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '6px 12px',
                background: 'rgba(0, 200, 83, 0.9)',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 'bold',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                zIndex: 1000,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}>
                <span style={{
                    width: '8px',
                    height: '8px',
                    background: 'white',
                    borderRadius: '50%',
                    animation: 'pulse 2s ease-in-out infinite'
                }}></span>
                LIVE
            </div>
            
            {/* Guard Count */}
            <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                padding: '8px 14px',
                background: 'rgba(26, 26, 46, 0.9)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'white',
                zIndex: 1000,
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>
                    {guards.filter(g => g.latitude && g.longitude).length}
                </span>
                <span style={{ color: '#9e9e9e' }}> guards visible</span>
            </div>
            
            {/* CSS for animations */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes sosPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
};

export default LiveOverwatchMap;
