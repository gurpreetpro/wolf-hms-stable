import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    X, Upload, RotateCw, ZoomIn, ZoomOut, Move, Lock, Unlock, 
    Layers, Shield, MapPin, Save, RefreshCw, AlertCircle, CheckCircle2,
    Sliders, Compass, Eye, Trash2, Plus, CornerDownRight, Crosshair
} from 'lucide-react';
import { API_BASE } from '../../../config';
import L from '../../../utils/leafletDistortable';

// Haversine distance in meters
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Calculate angle between two latLng points in degrees (0 = North)
function calculateHeading(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
}

const FloorPlanStudioModal = ({ isOpen, onClose, onSaveSuccess, initialFloor = 1 }) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const overlayRef = useRef(null);
    const corridorLayerRef = useRef(null);
    const zonesLayerRef = useRef(null);

    // State
    const [buildings, setBuildings] = useState([]);
    const [selectedBuildingId, setSelectedBuildingId] = useState(null);
    const [floorNumber, setFloorNumber] = useState(initialFloor);
    const [activeTab, setActiveTab] = useState('georeference'); // 'georeference' | 'corridors' | 'zones'
    const [baseMapType, setBaseMapType] = useState('satellite'); // 'satellite' | 'dark'

    const [floorPlan, setFloorPlan] = useState(null);
    const [corners, setCorners] = useState([]);
    const [opacity, setOpacity] = useState(0.85);
    const [interactMode, setInteractMode] = useState('drag'); // 'drag' | 'rotate' | 'scale' | 'distort' | 'lock'

    // Metrics HUD
    const [metrics, setMetrics] = useState({
        centerLat: 30.8045,
        centerLng: 75.4725,
        rotationDeg: 0,
        widthMeters: 0,
        heightMeters: 0,
        status: 'uncalibrated'
    });

    // Walkable Graph State
    const [walkableNodes, setWalkableNodes] = useState([]);
    const [walkableEdges, setWalkableEdges] = useState([]);
    const [isAddingNode, setIsAddingNode] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState(null);

    // Zones State
    const [zones, setZones] = useState([]);
    const [isDrawingZone, setIsDrawingZone] = useState(false);
    const [zoneDraftPoints, setZoneDraftPoints] = useState([]);
    const [newZoneForm, setNewZoneForm] = useState({
        name: '',
        zone_type: 'general',
        risk_level: 'low',
        color: '#00f0ff'
    });

    // Status notifications
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Load buildings on mount
    useEffect(() => {
        if (!isOpen) return;
        const fetchBuildings = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE}/api/security/buildings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success && data.data) {
                    setBuildings(data.data);
                    if (data.data.length > 0 && !selectedBuildingId) {
                        setSelectedBuildingId(data.data[0].id);
                    }
                }
            } catch (err) {
                console.error('[Studio] Failed to load buildings:', err);
            }
        };
        fetchBuildings();
    }, [isOpen]);

    // Fetch Floor Plan when building or floor changes
    const loadFloorPlanData = useCallback(async (floorNum) => {
        setLoading(true);
        setStatusMessage(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/security/maps/active?floor=${floorNum}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                const fp = data.data;
                setFloorPlan(fp);
                if (fp.corners && Array.isArray(fp.corners) && fp.corners.length === 4) {
                    setCorners(fp.corners);
                } else if (fp.bounds && Array.isArray(fp.bounds) && fp.bounds.length === 2) {
                    // Fallback from 2-corner bounds
                    setCorners([
                        { lat: fp.bounds[0][0], lng: fp.bounds[0][1] },
                        { lat: fp.bounds[0][0], lng: fp.bounds[1][1] },
                        { lat: fp.bounds[1][0], lng: fp.bounds[0][1] },
                        { lat: fp.bounds[1][0], lng: fp.bounds[1][1] }
                    ]);
                } else {
                    setCorners([]);
                }

                if (fp.walkable_graph?.nodes) {
                    setWalkableNodes(fp.walkable_graph.nodes || []);
                    setWalkableEdges(fp.walkable_graph.edges || []);
                } else {
                    setWalkableNodes([]);
                    setWalkableEdges([]);
                }

                if (fp.zones) {
                    setZones(fp.zones);
                } else {
                    setZones([]);
                }
            } else {
                setFloorPlan(null);
                setCorners([]);
                setWalkableNodes([]);
                setWalkableEdges([]);
                setZones([]);
            }
        } catch (err) {
            console.error('[Studio] Failed to load floor plan:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadFloorPlanData(floorNumber);
        }
    }, [isOpen, floorNumber, loadFloorPlanData]);

    // Recalculate metrics from corners
    const updateMetricsFromCorners = useCallback((c) => {
        if (!c || c.length !== 4) return;
        const nw = c[0];
        const ne = c[1];
        const sw = c[2];
        const se = c[3];

        const centerLat = (nw.lat + ne.lat + sw.lat + se.lat) / 4;
        const centerLng = (nw.lng + ne.lng + sw.lng + se.lng) / 4;

        const widthTop = haversineDistance(nw.lat, nw.lng, ne.lat, ne.lng);
        const widthBottom = haversineDistance(sw.lat, sw.lng, se.lat, se.lng);
        const heightLeft = haversineDistance(nw.lat, nw.lng, sw.lat, sw.lng);
        const heightRight = haversineDistance(ne.lat, ne.lng, se.lat, se.lng);

        const widthMeters = (widthTop + widthBottom) / 2;
        const heightMeters = (heightLeft + heightRight) / 2;
        const heading = calculateHeading(nw.lat, nw.lng, ne.lat, ne.lng);
        const rotationDeg = (heading - 90 + 360) % 360;

        setMetrics({
            centerLat,
            centerLng,
            rotationDeg: Math.round(rotationDeg * 10) / 10,
            widthMeters: Math.round(widthMeters * 10) / 10,
            heightMeters: Math.round(heightMeters * 10) / 10,
            status: floorPlan?.calibration_status || 'calibrated'
        });
    }, [floorPlan]);

    // Initialize Map and Layers
    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
            const initialCenter = [30.8045, 75.4725];
            const map = L.map(mapContainerRef.current, {
                center: initialCenter,
                zoom: 18,
                zoomControl: false
            });

            L.control.zoom({ position: 'bottomright' }).addTo(map);

            mapInstanceRef.current = map;

            // Base tile layer
            const satelliteLayer = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                { attribution: 'Esri Satellite', maxZoom: 20 }
            );
            const darkLayer = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
                { attribution: 'Esri Dark Canvas', maxZoom: 18 }
            );

            map.baseLayers = { satellite: satelliteLayer, dark: darkLayer };
            satelliteLayer.addTo(map);

            // Layer groups for corridors and zones
            corridorLayerRef.current = L.layerGroup().addTo(map);
            zonesLayerRef.current = L.layerGroup().addTo(map);
        }

        const map = mapInstanceRef.current;

        // Base layer switcher
        if (map && map.baseLayers) {
            Object.values(map.baseLayers).forEach(l => map.removeLayer(l));
            if (baseMapType === 'satellite') {
                map.baseLayers.satellite.addTo(map);
            } else {
                map.baseLayers.dark.addTo(map);
            }
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                overlayRef.current = null;
            }
        };
    }, [isOpen, baseMapType]);

    // Handle Blueprint Image & Georeferencing Overlay
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        // Remove existing overlay if any
        if (overlayRef.current) {
            map.removeLayer(overlayRef.current);
            overlayRef.current = null;
        }

        const imageUrl = floorPlan?.image_url || floorPlan?.blueprint_file;
        if (!imageUrl) return;

        const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${API_BASE}${imageUrl}`;

        // Establish default corners if none exist
        let activeCorners = corners;
        if (!activeCorners || activeCorners.length !== 4) {
            const center = map.getCenter();
            const dLat = 0.00045; // ~50 meters
            const dLng = 0.00055;
            activeCorners = [
                { lat: center.lat + dLat, lng: center.lng - dLng }, // NW
                { lat: center.lat + dLat, lng: center.lng + dLng }, // NE
                { lat: center.lat - dLat, lng: center.lng - dLng }, // SW
                { lat: center.lat - dLat, lng: center.lng + dLng }  // SE
            ];
            setCorners(activeCorners);
        }

        try {
            const leafletCorners = [
                L.latLng(activeCorners[0].lat, activeCorners[0].lng),
                L.latLng(activeCorners[1].lat, activeCorners[1].lng),
                L.latLng(activeCorners[2].lat, activeCorners[2].lng),
                L.latLng(activeCorners[3].lat, activeCorners[3].lng)
            ];

            // Use L.distortableImageOverlay if plugin loaded, else fall back to standard image overlay
            if (typeof L.distortableImageOverlay === 'function') {
                const overlay = L.distortableImageOverlay(fullImageUrl, {
                    corners: leafletCorners,
                    mode: interactMode,
                    opacity: opacity,
                    actions: [L.DragAction, L.ScaleAction, L.RotateAction, L.LockAction]
                }).addTo(map);

                overlay.on('update', () => {
                    const c = overlay.getCorners();
                    if (c && c.length === 4) {
                        const newC = [
                            { lat: c[0].lat, lng: c[0].lng },
                            { lat: c[1].lat, lng: c[1].lng },
                            { lat: c[2].lat, lng: c[2].lng },
                            { lat: c[3].lat, lng: c[3].lng }
                        ];
                        setCorners(newC);
                        updateMetricsFromCorners(newC);
                    }
                });

                overlayRef.current = overlay;
            } else {
                // Fallback: Leaflet standard bounds
                const bounds = [
                    [activeCorners[0].lat, activeCorners[0].lng],
                    [activeCorners[3].lat, activeCorners[3].lng]
                ];
                const overlay = L.imageOverlay(fullImageUrl, bounds, { opacity }).addTo(map);
                overlayRef.current = overlay;
            }

            // Fit map view smoothly to blueprint corners
            const bounds = L.latLngBounds(leafletCorners);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 19 });
            updateMetricsFromCorners(activeCorners);
        } catch (err) {
            console.error('[Studio] Error mounting distortable image overlay:', err);
        }
    }, [floorPlan, opacity]);

    // Synchronize interact mode (drag, rotate, scale, distort, lock)
    useEffect(() => {
        if (overlayRef.current && typeof overlayRef.current.setMode === 'function') {
            try {
                overlayRef.current.setMode(interactMode);
            } catch (err) {
                console.warn('[Studio] Mode switch warning:', err.message);
            }
        }
    }, [interactMode]);

    // Handle Blueprint File Upload
    const handleFileUpload = async (file) => {
        if (!file) return;
        setIsUploading(true);
        setStatusMessage({ type: 'info', text: `Uploading architectural blueprint: ${file.name}...` });

        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('blueprint', file);
            formData.append('floor_number', floorNumber);
            if (selectedBuildingId) formData.append('building_id', selectedBuildingId);
            formData.append('building_name', buildings.find(b => b.id === selectedBuildingId)?.name || 'Main Hospital Complex');
            formData.append('blueprint_type', file.type.includes('svg') ? 'svg' : 'raster');

            const res = await fetch(`${API_BASE}/api/security/maps/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (data.success && data.data) {
                setStatusMessage({ type: 'success', text: 'Blueprint uploaded! Use the canvas handles to align with the building.' });
                setFloorPlan(data.data);
                loadFloorPlanData(floorNumber);
            } else {
                throw new Error(data.message || 'Upload failed');
            }
        } catch (err) {
            console.error('[Studio] Upload error:', err);
            setStatusMessage({ type: 'error', text: `Upload failed: ${err.message}` });
        } finally {
            setIsUploading(false);
        }
    };

    // Fine Tuning Steppers (Rotate, Scale, Pan)
    const applyTransformation = (type, value) => {
        if (!corners || corners.length !== 4 || !overlayRef.current) return;
        const centerLat = (corners[0].lat + corners[1].lat + corners[2].lat + corners[3].lat) / 4;
        const centerLng = (corners[0].lng + corners[1].lng + corners[2].lng + corners[3].lng) / 4;

        let newCorners = [...corners];

        if (type === 'rotate') {
            const rad = (value * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const cosLat = Math.cos((centerLat * Math.PI) / 180);

            newCorners = corners.map(pt => {
                const dx = (pt.lng - centerLng) * cosLat;
                const dy = pt.lat - centerLat;
                const rdx = dx * cos - dy * sin;
                const rdy = dx * sin + dy * cos;
                return {
                    lat: centerLat + rdy,
                    lng: centerLng + (rdx / cosLat)
                };
            });
        } else if (type === 'scale') {
            newCorners = corners.map(pt => ({
                lat: centerLat + (pt.lat - centerLat) * value,
                lng: centerLng + (pt.lng - centerLng) * value
            }));
        } else if (type === 'pan') {
            const { dLat, dLng } = value;
            newCorners = corners.map(pt => ({
                lat: pt.lat + dLat,
                lng: pt.lng + dLng
            }));
        }

        setCorners(newCorners);
        updateMetricsFromCorners(newCorners);

        if (overlayRef.current && typeof overlayRef.current.setCorners === 'function') {
            const leafletCorners = [
                L.latLng(newCorners[0].lat, newCorners[0].lng),
                L.latLng(newCorners[1].lat, newCorners[1].lng),
                L.latLng(newCorners[2].lat, newCorners[2].lng),
                L.latLng(newCorners[3].lat, newCorners[3].lng)
            ];
            overlayRef.current.setCorners(leafletCorners);
        }
    };

    // Save Calibration to Server
    const handleSaveCalibration = async () => {
        if (!corners || corners.length !== 4) {
            setStatusMessage({ type: 'error', text: 'No 4-corner calibration to save' });
            return;
        }

        setLoading(true);
        setStatusMessage({ type: 'info', text: 'Saving georeferenced calibration to cloud...' });

        try {
            const token = localStorage.getItem('token');
            const payload = {
                id: floorPlan?.id,
                floor_number: floorNumber,
                building_id: selectedBuildingId,
                corners: corners,
                anchor_latitude: metrics.centerLat,
                anchor_longitude: metrics.centerLng,
                rotation_deg: metrics.rotationDeg,
                scale_meters_per_pixel: metrics.widthMeters > 0 ? (metrics.widthMeters / 1000) : null,
                calibration_status: 'calibrated'
            };

            const res = await fetch(`${API_BASE}/api/security/maps/calibrate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                setStatusMessage({ type: 'success', text: `Level ${floorNumber} successfully calibrated & activated in Command Center!` });
                if (onSaveSuccess) onSaveSuccess(data.data);
            } else {
                throw new Error(data.message || 'Calibration save failed');
            }
        } catch (err) {
            console.error('[Studio] Calibrate error:', err);
            setStatusMessage({ type: 'error', text: `Calibration failed: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    // Corridor Graph Click Handler
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || activeTab !== 'corridors') return;

        const handleMapClick = (e) => {
            if (!isAddingNode) return;
            const newPoint = {
                id: `node-${Date.now()}`,
                lat: e.latlng.lat,
                lng: e.latlng.lng,
                label: `Node ${walkableNodes.length + 1}`
            };

            const updatedNodes = [...walkableNodes, newPoint];
            let updatedEdges = [...walkableEdges];

            // If a previous node was selected or exists, link edge automatically
            if (selectedNodeId) {
                updatedEdges.push({ from: selectedNodeId, to: newPoint.id });
            } else if (walkableNodes.length > 0) {
                updatedEdges.push({ from: walkableNodes[walkableNodes.length - 1].id, to: newPoint.id });
            }

            setWalkableNodes(updatedNodes);
            setWalkableEdges(updatedEdges);
            setSelectedNodeId(newPoint.id);
        };

        map.on('click', handleMapClick);
        return () => {
            map.off('click', handleMapClick);
        };
    }, [activeTab, isAddingNode, walkableNodes, walkableEdges, selectedNodeId]);

    // Render Corridor Graph on Map
    useEffect(() => {
        const layer = corridorLayerRef.current;
        if (!layer) return;
        layer.clearLayers();

        if (activeTab !== 'corridors' && activeTab !== 'georeference') return;

        // Render edges (hallway paths)
        const nodeMap = new Map(walkableNodes.map(n => [n.id, n]));
        walkableEdges.forEach(edge => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (fromNode && toNode) {
                L.polyline([[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]], {
                    color: '#00f0ff',
                    weight: 3,
                    opacity: 0.8,
                    dashArray: '4, 8'
                }).addTo(layer);
            }
        });

        // Render nodes (junctions/waypoints)
        walkableNodes.forEach(node => {
            const isSelected = node.id === selectedNodeId;
            const marker = L.circleMarker([node.lat, node.lng], {
                radius: isSelected ? 8 : 5,
                color: isSelected ? '#ffffff' : '#00f0ff',
                fillColor: isSelected ? '#ff0055' : '#00f0ff',
                fillOpacity: 1,
                weight: 2
            }).addTo(layer);

            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                setSelectedNodeId(node.id);
            });
        });
    }, [activeTab, walkableNodes, walkableEdges, selectedNodeId]);

    // Save Corridor Graph to Server
    const handleSaveCorridors = async () => {
        if (!floorPlan?.id) {
            setStatusMessage({ type: 'error', text: 'Upload and save blueprint before adding corridors' });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/security/maps/${floorPlan.id}/corridors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    walkable_graph: {
                        nodes: walkableNodes,
                        edges: walkableEdges
                    }
                })
            });

            const data = await res.json();
            if (data.success) {
                setStatusMessage({ type: 'success', text: `Walkable corridor graph saved (${walkableNodes.length} nodes, ${walkableEdges.length} segments). Mobile guards will now stay within walls!` });
            } else {
                throw new Error(data.message || 'Save failed');
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: `Corridor save failed: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    // Zone Drawing Click Handler
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || activeTab !== 'zones') return;

        const handleZoneClick = (e) => {
            if (!isDrawingZone) return;
            setZoneDraftPoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
        };

        map.on('click', handleZoneClick);
        return () => {
            map.off('click', handleZoneClick);
        };
    }, [activeTab, isDrawingZone]);

    // Render Zones & Draft Zone on Map
    useEffect(() => {
        const layer = zonesLayerRef.current;
        if (!layer) return;
        layer.clearLayers();

        // Render saved zones
        zones.forEach(zone => {
            if (zone.polygon_coordinates && Array.isArray(zone.polygon_coordinates)) {
                const poly = L.polygon(zone.polygon_coordinates, {
                    color: zone.color || '#00f0ff',
                    fillColor: zone.color || '#00f0ff',
                    fillOpacity: 0.25,
                    weight: 2
                }).addTo(layer);

                poly.bindTooltip(`<b>${zone.name}</b><br><span style="text-transform:uppercase; font-size:10px">${zone.zone_type} (${zone.risk_level} risk)</span>`, {
                    sticky: true,
                    className: 'tactical-map-tooltip'
                });
            }
        });

        // Render draft polygon while drawing
        if (isDrawingZone && zoneDraftPoints.length > 0) {
            if (zoneDraftPoints.length === 1) {
                L.circleMarker(zoneDraftPoints[0], { radius: 5, color: newZoneForm.color }).addTo(layer);
            } else {
                L.polyline(zoneDraftPoints, { color: newZoneForm.color, weight: 2, dashArray: '4, 4' }).addTo(layer);
            }
        }
    }, [zones, zoneDraftPoints, isDrawingZone, newZoneForm.color]);

    // Save Zone to Server
    const handleSaveZone = async () => {
        if (!floorPlan?.id) {
            setStatusMessage({ type: 'error', text: 'Floor plan must be saved first' });
            return;
        }
        if (!newZoneForm.name.trim()) {
            setStatusMessage({ type: 'error', text: 'Enter zone name (e.g. ICU Ward A)' });
            return;
        }
        if (zoneDraftPoints.length < 3) {
            setStatusMessage({ type: 'error', text: 'Click at least 3 points on the map to define a zone perimeter' });
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/security/maps/${floorPlan.id}/zones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newZoneForm.name,
                    zone_type: newZoneForm.zone_type,
                    risk_level: newZoneForm.risk_level,
                    color: newZoneForm.color,
                    polygon_coordinates: zoneDraftPoints
                })
            });

            const data = await res.json();
            if (data.success && data.data) {
                setZones(prev => [...prev, data.data]);
                setIsDrawingZone(false);
                setZoneDraftPoints([]);
                setNewZoneForm({ name: '', zone_type: 'general', risk_level: 'low', color: '#00f0ff' });
                setStatusMessage({ type: 'success', text: `Zone "${data.data.name}" registered successfully` });
            } else {
                throw new Error(data.message || 'Zone creation failed');
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: `Zone failed: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    // Delete Zone
    const handleDeleteZone = async (zoneId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/api/security/zones/${zoneId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setZones(prev => prev.filter(z => z.id !== zoneId));
                setStatusMessage({ type: 'success', text: 'Zone removed' });
            }
        } catch (err) {
            console.error('[Studio] Delete zone error:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="floor-plan-studio-backdrop" style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(5, 8, 16, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
        }}>
            <div className="floor-plan-studio-modal" style={{
                width: '96vw',
                height: '92vh',
                maxWidth: '1700px',
                backgroundColor: '#0c101d',
                borderRadius: '16px',
                border: '1px solid rgba(0, 240, 255, 0.25)',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 240, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* STUDIO HEADER */}
                <div style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(90deg, #0e1526 0%, #0c101d 100%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: 'rgba(0, 240, 255, 0.1)',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            borderRadius: '8px'
                        }}>
                            <Compass size={18} color="#00f0ff" />
                            <span style={{ color: '#00f0ff', fontWeight: 800, fontSize: '13px', letterSpacing: '1px' }}>
                                GEOREFERENCING STUDIO
                            </span>
                        </div>

                        {/* Building Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>BUILDING:</span>
                            <select 
                                value={selectedBuildingId || ''} 
                                onChange={(e) => setSelectedBuildingId(parseInt(e.target.value, 10))}
                                style={{
                                    background: '#131b2e',
                                    color: '#f8fafc',
                                    border: '1px solid #334155',
                                    borderRadius: '6px',
                                    padding: '4px 10px',
                                    fontSize: '12px',
                                    outline: 'none'
                                }}
                            >
                                {buildings.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Floor Level Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>LEVEL:</span>
                            {[-1, 1, 2, 3, 4].map(fl => (
                                <button
                                    key={fl}
                                    onClick={() => setFloorNumber(fl)}
                                    style={{
                                        background: floorNumber === fl ? '#00f0ff' : '#131b2e',
                                        color: floorNumber === fl ? '#000000' : '#94a3b8',
                                        fontWeight: 700,
                                        fontSize: '11px',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        border: floorNumber === fl ? '1px solid #00f0ff' : '1px solid #334155',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {fl <= 0 ? `B${Math.abs(fl) + 1}` : `L${fl}`}
                                </button>
                            ))}
                        </div>

                        {/* Status Badge */}
                        <div style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            background: metrics.status === 'calibrated' ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 171, 0, 0.15)',
                            color: metrics.status === 'calibrated' ? '#00e676' : '#ffab00',
                            border: metrics.status === 'calibrated' ? '1px solid #00e676' : '1px solid #ffab00'
                        }}>
                            {metrics.status}
                        </div>
                    </div>

                    {/* Mode Navigation Tabs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => setActiveTab('georeference')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: activeTab === 'georeference' ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                                color: activeTab === 'georeference' ? '#00f0ff' : '#94a3b8',
                                border: activeTab === 'georeference' ? '1px solid #00f0ff' : '1px solid transparent',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            <Sliders size={14} /> 1. Georeferencing
                        </button>
                        <button
                            onClick={() => setActiveTab('corridors')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: activeTab === 'corridors' ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                                color: activeTab === 'corridors' ? '#00f0ff' : '#94a3b8',
                                border: activeTab === 'corridors' ? '1px solid #00f0ff' : '1px solid transparent',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            <Move size={14} /> 2. Corridors
                        </button>
                        <button
                            onClick={() => setActiveTab('zones')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: activeTab === 'zones' ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                                color: activeTab === 'zones' ? '#00f0ff' : '#94a3b8',
                                border: activeTab === 'zones' ? '1px solid #00f0ff' : '1px solid transparent',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            <Shield size={14} /> 3. Zones ({zones.length})
                        </button>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={handleSaveCalibration}
                            disabled={loading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'linear-gradient(135deg, #00f0ff 0%, #0091ea 100%)',
                                color: '#000000',
                                fontWeight: 800,
                                fontSize: '12px',
                                padding: '7px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(0, 240, 255, 0.3)'
                            }}
                        >
                            <Save size={15} /> SAVE & ACTIVATE
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: '#1e293b',
                                color: '#94a3b8',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '7px',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* STATUS BAR NOTIFICATION */}
                {statusMessage && (
                    <div style={{
                        padding: '8px 20px',
                        background: statusMessage.type === 'error' ? 'rgba(255, 23, 68, 0.2)' :
                                   statusMessage.type === 'success' ? 'rgba(0, 200, 83, 0.2)' : 'rgba(0, 240, 255, 0.15)',
                        borderBottom: `1px solid ${statusMessage.type === 'error' ? '#ff1744' :
                                                 statusMessage.type === 'success' ? '#00c853' : '#00f0ff'}`,
                        color: '#ffffff',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {statusMessage.type === 'error' ? <AlertCircle size={15} color="#ff1744" /> :
                             statusMessage.type === 'success' ? <CheckCircle2 size={15} color="#00c853" /> :
                             <RefreshCw size={15} color="#00f0ff" className="animate-spin" />}
                            <span>{statusMessage.text}</span>
                        </div>
                        <button onClick={() => setStatusMessage(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* MAIN STUDIO WORKSPACE */}
                <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
                    {/* LEFT SIDEBAR: TOOL CONTROLS */}
                    <div style={{
                        width: '320px',
                        backgroundColor: '#0a0d18',
                        borderRight: '1px solid #1e293b',
                        padding: '16px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        {/* TAB 1: GEOREFERENCING CONTROLS */}
                        {activeTab === 'georeference' && (
                            <>
                                {/* Blueprint Upload Box */}
                                <div style={{
                                    border: '2px dashed #334155',
                                    borderRadius: '10px',
                                    padding: '16px',
                                    textAlign: 'center',
                                    background: 'rgba(30, 41, 59, 0.2)'
                                }}>
                                    <Upload size={24} color="#00f0ff" style={{ margin: '0 auto 8px' }} />
                                    <div style={{ color: '#f8fafc', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                                        {floorPlan?.image_url ? 'REPLACE BLUEPRINT' : 'UPLOAD ARCHITECTURAL BLUEPRINT'}
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '10px', marginBottom: '12px' }}>
                                        PNG, JPG, WebP, SVG (CAD Export)
                                    </div>
                                    <label style={{
                                        display: 'inline-block',
                                        background: '#1e293b',
                                        color: '#00f0ff',
                                        border: '1px solid rgba(0, 240, 255, 0.4)',
                                        borderRadius: '6px',
                                        padding: '6px 14px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}>
                                        {isUploading ? 'UPLOADING...' : 'BROWSE BLUEPRINT'}
                                        <input 
                                            type="file" 
                                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleFileUpload(e.target.files?.[0])}
                                            disabled={isUploading}
                                        />
                                    </label>
                                </div>

                                {/* Alignment Handle Modes */}
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.5px' }}>
                                        CANVAS INTERACTION MODE
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                        {[
                                            { id: 'drag', label: 'Pan / Move', icon: Move },
                                            { id: 'rotate', label: 'Rotate (°)', icon: RotateCw },
                                            { id: 'scale', label: 'Scale (%)', icon: ZoomIn },
                                            { id: 'distort', label: '4-Corner Pin', icon: Crosshair },
                                            { id: 'lock', label: 'Lock Overlay', icon: Lock }
                                        ].map(m => {
                                            const IconComp = m.icon;
                                            const isActive = interactMode === m.id;
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setInteractMode(m.id)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        padding: '8px 10px',
                                                        borderRadius: '6px',
                                                        background: isActive ? 'rgba(0, 240, 255, 0.2)' : '#131b2e',
                                                        color: isActive ? '#00f0ff' : '#94a3b8',
                                                        border: isActive ? '1px solid #00f0ff' : '1px solid #1e293b',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <IconComp size={13} /> {m.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Steppers for Fine Adjustment */}
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>
                                        FINE PRECISION CONTROLS
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#131b2e', padding: '6px 10px', borderRadius: '6px' }}>
                                            <span style={{ color: '#64748b', fontSize: '11px' }}>Rotate</span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={() => applyTransformation('rotate', -1)} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>-1°</button>
                                                <button onClick={() => applyTransformation('rotate', -0.1)} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>-0.1°</button>
                                                <button onClick={() => applyTransformation('rotate', 0.1)} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>+0.1°</button>
                                                <button onClick={() => applyTransformation('rotate', 1)} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>+1°</button>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#131b2e', padding: '6px 10px', borderRadius: '6px' }}>
                                            <span style={{ color: '#64748b', fontSize: '11px' }}>Scale</span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={() => applyTransformation('scale', 0.98)} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>-2%</button>
                                                <button onClick={() => applyTransformation('scale', 0.995)} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>-0.5%</button>
                                                <button onClick={() => applyTransformation('scale', 1.005)} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>+0.5%</button>
                                                <button onClick={() => applyTransformation('scale', 1.02)} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>+2%</button>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#131b2e', padding: '6px 10px', borderRadius: '6px' }}>
                                            <span style={{ color: '#64748b', fontSize: '11px' }}>Pan (N/S/E/W)</span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button onClick={() => applyTransformation('pan', { dLat: 0.00002, dLng: 0 })} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>▲ N</button>
                                                <button onClick={() => applyTransformation('pan', { dLat: -0.00002, dLng: 0 })} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>▼ S</button>
                                                <button onClick={() => applyTransformation('pan', { dLat: 0, dLng: -0.00002 })} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>◀ W</button>
                                                <button onClick={() => applyTransformation('pan', { dLat: 0, dLng: 0.00002 })} style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>▶ E</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Opacity Slider */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                                        <span>BLUEPRINT OPACITY</span>
                                        <span style={{ color: '#00f0ff' }}>{Math.round(opacity * 100)}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.1" 
                                        max="1.0" 
                                        step="0.05" 
                                        value={opacity} 
                                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                        style={{ width: '100%', accentColor: '#00f0ff' }}
                                    />
                                </div>

                                {/* Base Map Switcher */}
                                <div>
                                    <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                                        SATELLITE BASE
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button 
                                            onClick={() => setBaseMapType('satellite')}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                borderRadius: '6px',
                                                background: baseMapType === 'satellite' ? 'rgba(0, 240, 255, 0.2)' : '#131b2e',
                                                color: baseMapType === 'satellite' ? '#00f0ff' : '#94a3b8',
                                                border: '1px solid #1e293b',
                                                fontSize: '11px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🛰️ Satellite
                                        </button>
                                        <button 
                                            onClick={() => setBaseMapType('dark')}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                borderRadius: '6px',
                                                background: baseMapType === 'dark' ? 'rgba(0, 240, 255, 0.2)' : '#131b2e',
                                                color: baseMapType === 'dark' ? '#00f0ff' : '#94a3b8',
                                                border: '1px solid #1e293b',
                                                fontSize: '11px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🗺️ Dark Canvas
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* TAB 2: CORRIDOR GRAPH CONTROLS */}
                        {activeTab === 'corridors' && (
                            <>
                                <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 700 }}>
                                    Walkable Corridors
                                </div>
                                <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0 }}>
                                    Click along hallways and doorways to trace walkable corridors. Guards' PDR positions are constrained to these paths using the particle filter.
                                </p>

                                <button
                                    onClick={() => setIsAddingNode(!isAddingNode)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: isAddingNode ? '#ff0055' : 'rgba(0, 240, 255, 0.15)',
                                        color: isAddingNode ? '#ffffff' : '#00f0ff',
                                        border: isAddingNode ? '1px solid #ff0055' : '1px solid #00f0ff',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isAddingNode ? '■ STOP PLACING WAYPOINTS' : '+ CLICK MAP TO ADD CORRIDOR'}
                                </button>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => {
                                            if (walkableNodes.length === 0) return;
                                            const lastNode = walkableNodes[walkableNodes.length - 1];
                                            setWalkableNodes(prev => prev.slice(0, -1));
                                            setWalkableEdges(prev => prev.filter(e => e.from !== lastNode.id && e.to !== lastNode.id));
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '6px',
                                            borderRadius: '6px',
                                            background: '#1e293b',
                                            color: '#94a3b8',
                                            border: 'none',
                                            fontSize: '11px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Undo Last
                                    </button>
                                    <button
                                        onClick={() => {
                                            setWalkableNodes([]);
                                            setWalkableEdges([]);
                                            setSelectedNodeId(null);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '6px',
                                            borderRadius: '6px',
                                            background: 'rgba(255, 23, 68, 0.15)',
                                            color: '#ff1744',
                                            border: '1px solid #ff1744',
                                            fontSize: '11px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Clear All
                                    </button>
                                </div>

                                <div style={{ background: '#131b2e', padding: '10px', borderRadius: '8px' }}>
                                    <div style={{ color: '#64748b', fontSize: '11px' }}>CORRIDOR SUMMARY:</div>
                                    <div style={{ color: '#00f0ff', fontWeight: 700, fontSize: '13px' }}>
                                        {walkableNodes.length} Waypoints • {walkableEdges.length} Hallway Segments
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveCorridors}
                                    style={{
                                        marginTop: 'auto',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        background: '#00c853',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontWeight: 800,
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Save size={15} /> SAVE CORRIDOR GRAPH
                                </button>
                            </>
                        )}

                        {/* TAB 3: ZONES PERIMETERS */}
                        {activeTab === 'zones' && (
                            <>
                                <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 700 }}>
                                    Floor Security Zones
                                </div>
                                <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0 }}>
                                    Define high-risk or specialized hospital departments (ICU, ER, Pharmacy, Restricted Server Room).
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#131b2e', padding: '12px', borderRadius: '8px' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Zone Name (e.g. ICU Wing 1)" 
                                        value={newZoneForm.name}
                                        onChange={(e) => setNewZoneForm({ ...newZoneForm, name: e.target.value })}
                                        style={{
                                            background: '#0a0d18',
                                            color: '#fff',
                                            border: '1px solid #334155',
                                            borderRadius: '6px',
                                            padding: '6px 10px',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                        <select
                                            value={newZoneForm.zone_type}
                                            onChange={(e) => setNewZoneForm({ ...newZoneForm, zone_type: e.target.value })}
                                            style={{
                                                background: '#0a0d18',
                                                color: '#fff',
                                                border: '1px solid #334155',
                                                borderRadius: '6px',
                                                padding: '6px',
                                                fontSize: '11px'
                                            }}
                                        >
                                            <option value="general">General</option>
                                            <option value="icu">ICU</option>
                                            <option value="er">Emergency (ER)</option>
                                            <option value="pharmacy">Pharmacy</option>
                                            <option value="restricted">Restricted</option>
                                        </select>
                                        <select
                                            value={newZoneForm.risk_level}
                                            onChange={(e) => setNewZoneForm({ ...newZoneForm, risk_level: e.target.value })}
                                            style={{
                                                background: '#0a0d18',
                                                color: '#fff',
                                                border: '1px solid #334155',
                                                borderRadius: '6px',
                                                padding: '6px',
                                                fontSize: '11px'
                                            }}
                                        >
                                            <option value="low">Low Risk</option>
                                            <option value="medium">Med Risk</option>
                                            <option value="high">High Risk</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                    </div>

                                    {/* Color picker preset badges */}
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ color: '#64748b', fontSize: '11px' }}>Color:</span>
                                        {['#00f0ff', '#ff0055', '#ffab00', '#00e676', '#9c27b0'].map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setNewZoneForm({ ...newZoneForm, color: c })}
                                                style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '50%',
                                                    backgroundColor: c,
                                                    border: newZoneForm.color === c ? '2px solid #fff' : 'none',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setIsDrawingZone(!isDrawingZone);
                                            if (!isDrawingZone) setZoneDraftPoints([]);
                                        }}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '6px',
                                            background: isDrawingZone ? '#ffab00' : 'rgba(0, 240, 255, 0.2)',
                                            color: isDrawingZone ? '#000' : '#00f0ff',
                                            border: '1px solid rgba(0, 240, 255, 0.4)',
                                            fontWeight: 700,
                                            fontSize: '11px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {isDrawingZone ? `DRAWING PERIMETER (${zoneDraftPoints.length} PTS)` : '+ DRAW POLYGON PERIMETER'}
                                    </button>

                                    {zoneDraftPoints.length >= 3 && (
                                        <button
                                            onClick={handleSaveZone}
                                            style={{
                                                padding: '8px',
                                                borderRadius: '6px',
                                                background: '#00c853',
                                                color: '#fff',
                                                border: 'none',
                                                fontWeight: 800,
                                                fontSize: '11px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            ✓ COMPLETE & SAVE ZONE
                                        </button>
                                    )}
                                </div>

                                {/* List of existing zones */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                                    <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700 }}>CONFIGURED ZONES:</div>
                                    {zones.map(z => (
                                        <div key={z.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '6px 10px',
                                            background: '#131b2e',
                                            borderRadius: '6px',
                                            borderLeft: `3px solid ${z.color || '#00f0ff'}`
                                        }}>
                                            <div>
                                                <div style={{ color: '#f8fafc', fontSize: '11px', fontWeight: 600 }}>{z.name}</div>
                                                <div style={{ color: '#64748b', fontSize: '9px', textTransform: 'uppercase' }}>{z.zone_type} • {z.risk_level}</div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteZone(z.id)}
                                                style={{ background: 'none', border: 'none', color: '#ff1744', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* CENTER: LEAFLET MAP CANVAS */}
                    <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                        {/* FLOATING HUD: REAL-TIME CALIBRATION METRICS */}
                        <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '20px',
                            zIndex: 1000,
                            background: 'rgba(10, 13, 24, 0.88)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(0, 240, 255, 0.3)',
                            borderRadius: '10px',
                            padding: '12px 16px',
                            display: 'flex',
                            gap: '24px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
                        }}>
                            <div>
                                <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700 }}>CENTER ANCHOR (WGS84)</div>
                                <div style={{ color: '#f8fafc', fontSize: '12px', fontWeight: 600, fontFamily: 'monospace' }}>
                                    {metrics.centerLat.toFixed(6)}°, {metrics.centerLng.toFixed(6)}°
                                </div>
                            </div>
                            <div>
                                <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700 }}>ROTATION</div>
                                <div style={{ color: '#00f0ff', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>
                                    {metrics.rotationDeg}° TRUE NORTH
                                </div>
                            </div>
                            <div>
                                <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700 }}>DIMENSIONS (W × H)</div>
                                <div style={{ color: '#f8fafc', fontSize: '12px', fontWeight: 600, fontFamily: 'monospace' }}>
                                    {metrics.widthMeters}m × {metrics.heightMeters}m
                                </div>
                            </div>
                            <div>
                                <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700 }}>INTERACTION</div>
                                <div style={{ color: '#00e676', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                                    {interactMode}
                                </div>
                            </div>
                        </div>

                        {/* CROSSHAIR CENTER RETICLE (SUBTLE) */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                            zIndex: 900,
                            opacity: 0.35
                        }}>
                            <Crosshair size={32} color="#00f0ff" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FloorPlanStudioModal;
