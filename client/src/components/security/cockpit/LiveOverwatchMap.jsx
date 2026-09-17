import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, useMap } from 'react-leaflet';
import L from '../../../utils/leafletDistortable';
import { API_BASE } from '../../../config';

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

// Custom Guard Icon with status colors, floor badge, and directional heading cone
const createGuardIcon = (status, floor_number = 1, heading = null, guard_id = '') => {
    const colors = {
        ONLINE: '#00c853',
        PATROLLING: '#00d4ff',
        IDLE: '#ffab00',
        OFFLINE: '#9e9e9e',
        SOS: '#ff1744'
    };
    const color = colors[status?.toUpperCase()] || colors.ONLINE;
    const floorVal = parseInt(floor_number, 10) || 1;
    const floorLabel = floorVal <= 0 ? `B${Math.abs(floorVal) + 1}` : `L${floorVal}`;
    const hasHeading = heading != null && !isNaN(heading);
    const headingDeg = hasHeading ? parseFloat(heading) : 0;
    
    return L.divIcon({
        className: 'guard-marker',
        html: `
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
                ${hasHeading ? `
                    <div style="
                        position: absolute;
                        top: -12px;
                        left: -12px;
                        width: 68px;
                        height: 68px;
                        pointer-events: none;
                        transform: rotate(${headingDeg}deg);
                        transform-origin: center center;
                        z-index: 1;
                    ">
                        <svg width="68" height="68" viewBox="0 0 68 68">
                            <polygon points="34,2 48,26 20,26" fill="${color}" opacity="0.35"/>
                            <polygon points="34,6 40,22 28,22" fill="${color}" opacity="0.9"/>
                        </svg>
                    </div>
                ` : ''}
                <div style="
                    position: relative;
                    width: 36px;
                    height: 36px;
                    background: ${color};
                    border: 2.5px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                    ${status?.toUpperCase() === 'SOS' ? 'animation: sosPulse 0.5s ease-in-out infinite;' : ''}
                ">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <div style="
                        position: absolute;
                        bottom: -6px;
                        right: -8px;
                        background: #0f172a;
                        color: #00f0ff;
                        border: 1.5px solid #00f0ff;
                        border-radius: 4px;
                        font-size: 9px;
                        font-weight: 900;
                        padding: 0 4px;
                        line-height: 13px;
                        letter-spacing: 0.5px;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.5);
                    ">${floorLabel}</div>
                </div>
            </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22]
    });
};

/**
 * DistortableImageLayer - 4-corner affine georeferenced blueprint renderer
 */
const DistortableImageLayer = ({ floorPlan, defaultCenter }) => {
    const map = useMap();
    const layerRef = useRef(null);

    useEffect(() => {
        if (!map) return;
        if (layerRef.current) {
            map.removeLayer(layerRef.current);
            layerRef.current = null;
        }

        const imageUrl = floorPlan?.image_url || floorPlan?.url || floorPlan?.blueprint_file;
        if (!imageUrl) return;

        const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`;

        // 4-corner DistortableImage locked mode
        if (floorPlan?.corners && Array.isArray(floorPlan.corners) && floorPlan.corners.length === 4 && typeof L.distortableImageOverlay === 'function') {
            try {
                const leafletCorners = [
                    L.latLng(floorPlan.corners[0].lat, floorPlan.corners[0].lng),
                    L.latLng(floorPlan.corners[1].lat, floorPlan.corners[1].lng),
                    L.latLng(floorPlan.corners[2].lat, floorPlan.corners[2].lng),
                    L.latLng(floorPlan.corners[3].lat, floorPlan.corners[3].lng)
                ];

                const overlay = L.distortableImageOverlay(fullImageUrl, {
                    corners: leafletCorners,
                    mode: 'lock',
                    opacity: 0.88,
                    actions: []
                }).addTo(map);

                layerRef.current = overlay;
            } catch (err) {
                console.warn('[LiveOverwatchMap] Error creating distortable overlay, falling back:', err);
            }
        }

        // Fallback to 2-corner image bounds if distortable image overlay failed or not available
        if (!layerRef.current) {
            const bounds = (floorPlan?.bounds && Array.isArray(floorPlan.bounds) && floorPlan.bounds.length === 2)
                ? floorPlan.bounds
                : [
                    [defaultCenter[0] + 0.001, defaultCenter[1] - 0.001],
                    [defaultCenter[0] - 0.001, defaultCenter[1] + 0.001]
                ];

            const overlay = L.imageOverlay(fullImageUrl, bounds, { opacity: 0.85 }).addTo(map);
            layerRef.current = overlay;
        }

        return () => {
            if (layerRef.current && map) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };
    }, [map, floorPlan, defaultCenter]);

    return null;
};

/**
 * MapBoundsController - Auto-fits map to show all guards or hospital
 */
const MapBoundsController = ({ guards, hospitalLocation, selectedGuard }) => {
    const map = useMap();
    
    useEffect(() => {
        if (selectedGuard?.latitude && selectedGuard?.longitude) {
            map.flyTo([selectedGuard.latitude, selectedGuard.longitude], 18, {
                animate: true,
                duration: 1
            });
            return;
        }
        
        const validGuards = guards.filter(g => 
            g.latitude && g.longitude && 
            !isNaN(g.latitude) && !isNaN(g.longitude)
        );
        
        if (validGuards.length > 0) {
            const bounds = L.latLngBounds(
                validGuards.map(g => [g.latitude, g.longitude])
            );
            
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 18,
                animate: true,
                duration: 0.5
            });
        } else if (hospitalLocation?.latitude && hospitalLocation?.longitude) {
            map.setView([hospitalLocation.latitude, hospitalLocation.longitude], 16);
        }
    }, [guards, hospitalLocation, selectedGuard, map]);
    
    return null;
};

/**
 * LiveOverwatchMap - Real-time tactical guard tracking cockpit
 */
const LiveOverwatchMap = ({ 
    guards = [], 
    onSelectGuard, 
    floorPlan, 
    selectedGuard,
    hospitalLocation = null,
    geofences = [],
    onOpenStudio = null
}) => {
    const defaultCenter = useMemo(() => {
        const validGuards = guards.filter(g => g.latitude && g.longitude);
        if (validGuards.length > 0) {
            const avgLat = validGuards.reduce((sum, g) => sum + g.latitude, 0) / validGuards.length;
            const avgLng = validGuards.reduce((sum, g) => sum + g.longitude, 0) / validGuards.length;
            return [avgLat, avgLng];
        }
        
        if (hospitalLocation?.latitude && hospitalLocation?.longitude) {
            return [hospitalLocation.latitude, hospitalLocation.longitude];
        }
        
        return [30.8045, 75.4725];
    }, [guards, hospitalLocation]);
    
    const initialZoom = useMemo(() => {
        const validGuards = guards.filter(g => g.latitude && g.longitude);
        if (validGuards.length === 0) return 17;
        if (validGuards.length === 1) return 18;
        return 16;
    }, [guards]);

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
                {/* Dark Mode Base Layer - ESRI World Dark Gray Canvas */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                    maxZoom={19}
                />
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                    maxZoom={19}
                />

                {/* Auto-fit bounds controller */}
                <MapBoundsController 
                    guards={guards}
                    hospitalLocation={hospitalLocation}
                    selectedGuard={selectedGuard}
                />
                
                {/* 4-Corner Georeferenced Floor Plan Overlay (Stock photos suppressed) */}
                {floorPlan && (
                    floorPlan.blueprint_file || 
                    (floorPlan.image_url && !floorPlan.image_url.includes('unsplash.com')) || 
                    (floorPlan.url && !floorPlan.url.includes('unsplash.com'))
                ) && (
                    <DistortableImageLayer 
                        floorPlan={floorPlan} 
                        defaultCenter={defaultCenter} 
                    />
                )}

                {/* Walkable Corridors Visualization */}
                {floorPlan?.walkable_graph?.edges && floorPlan.walkable_graph.nodes && (
                    (() => {
                        const nodeMap = new Map(floorPlan.walkable_graph.nodes.map(n => [n.id, n]));
                        return floorPlan.walkable_graph.edges.map((edge, idx) => {
                            const f = nodeMap.get(edge.from);
                            const t = nodeMap.get(edge.to);
                            if (!f || !t) return null;
                            return (
                                <Polyline
                                    key={idx}
                                    positions={[[f.lat, f.lng], [t.lat, t.lng]]}
                                    pathOptions={{
                                        color: '#00f0ff',
                                        weight: 2.5,
                                        opacity: 0.45,
                                        dashArray: '3, 6'
                                    }}
                                />
                            );
                        });
                    })()
                )}

                {/* Floor Security Zones */}
                {floorPlan?.zones && floorPlan.zones.map(zone => {
                    if (!zone.polygon_coordinates || !Array.isArray(zone.polygon_coordinates) || zone.polygon_coordinates.length < 3) return null;
                    return (
                        <Polygon
                            key={zone.id}
                            positions={zone.polygon_coordinates}
                            pathOptions={{
                                color: zone.color || '#00f0ff',
                                fillColor: zone.color || '#00f0ff',
                                fillOpacity: 0.18,
                                weight: 2
                            }}
                        >
                            <Popup>
                                <div style={{ textAlign: 'center', minWidth: '120px' }}>
                                    <strong style={{ color: zone.color || '#00f0ff' }}>{zone.name}</strong>
                                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', marginTop: '2px' }}>
                                        {zone.zone_type} • {zone.risk_level} risk
                                    </div>
                                </div>
                            </Popup>
                        </Polygon>
                    );
                })}
                
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

                {/* Guard Markers with Heading FOV Cone */}
                {guards.map(guard => {
                    if (!guard.latitude || !guard.longitude) return null;
                    
                    return (
                        <Marker 
                            key={guard.guard_id} 
                            position={[guard.latitude, guard.longitude]}
                            icon={createGuardIcon(guard.status, guard.floor_number, guard.heading, guard.guard_id)}
                            eventHandlers={{
                                click: () => onSelectGuard && onSelectGuard(guard),
                            }}
                        >
                            <Popup>
                                <div style={{ textAlign: 'center', minWidth: '130px' }}>
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
                                    <div style={{ fontSize: '11px', color: '#00f0ff', fontWeight: 'bold', marginTop: '4px' }}>
                                        🏢 Floor {guard.floor_number <= 0 ? `B${Math.abs(guard.floor_number) + 1}` : `L${guard.floor_number || 1}`}
                                        {guard.altitude ? ` (${guard.altitude > 0 ? '+' : ''}${parseFloat(guard.altitude).toFixed(1)}m)` : ''}
                                    </div>
                                    {guard.heading != null && !isNaN(guard.heading) && (
                                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                                            🧭 Heading {Math.round(guard.heading)}°
                                        </div>
                                    )}
                                    {guard.batteryLevel != null && (
                                        <div style={{ fontSize: '11px', color: '#9e9e9e', marginTop: '2px' }}>
                                            🔋 {typeof guard.batteryLevel === 'number' && guard.batteryLevel <= 1
                                                ? Math.round(guard.batteryLevel * 100)
                                                : guard.batteryLevel}%
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
            
            {/* Quick Align / Studio Button */}
            {onOpenStudio && (
                <button
                    onClick={onOpenStudio}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        padding: '6px 12px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#00f0ff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        zIndex: 1000,
                        border: '1px solid rgba(0, 240, 255, 0.35)',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        transition: 'all 0.2s ease'
                    }}
                    title="Open Georeferencing Studio to align blueprint with satellite map"
                >
                    <span>📐</span>
                    <span>Align Layout</span>
                </button>
            )}
            
            {/* Guard Count & Floor Info */}
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
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div>
                    <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>
                        {guards.filter(g => g.latitude && g.longitude).length}
                    </span>
                    <span style={{ color: '#9e9e9e' }}> guards active</span>
                </div>
                {floorPlan && (
                    <div style={{ borderLeft: '1px solid #334155', paddingLeft: '10px', color: '#00f0ff', fontSize: '11px', fontWeight: 600 }}>
                        Level {floorPlan.floor_number <= 0 ? `B${Math.abs(floorPlan.floor_number) + 1}` : `L${floorPlan.floor_number}`} • {floorPlan.building_name || 'Main Block'}
                    </div>
                )}
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
