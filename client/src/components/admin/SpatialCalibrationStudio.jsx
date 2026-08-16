import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, Polygon, Polyline, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Upload, Pencil, MapPin, Save, Trash2, Layers, X, Plus,
  Check, Target, Move, Image, Grid3X3, Crosshair, Radio,
  Download, Eye, EyeOff, Edit3, Info, ChevronRight, GripVertical
} from 'lucide-react';
import WidgetErrorBoundary from '../ErrorBoundary';

// ──────────────────────────────────────────────
// Constants & Helpers
// ──────────────────────────────────────────────
const ZONE_PALETTE = [
  '#2d8a6e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];
const CLOSE_THRESHOLD = 18;
const pixelDist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);

const createBeaconIcon = (color = '#2d8a6e', pulse = true) =>
  L.divIcon({
    className: 'ble-beacon-icon',
    html: `
      <div style="
        position:relative;width:22px;height:22px;
        background:${color};border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 0 0 4px ${color}33, 0 2px 10px rgba(0,0,0,0.25);
        ${pulse ? 'animation:beaconPulse 2.2s ease-in-out infinite;' : ''}
      ">
        <div style="position:absolute;top:50%;left:50%;width:6px;height:6px;
          background:#fff;border-radius:50%;transform:translate(-50%,-50%);"></div>
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });

const vertexIcon = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;background:#2d8a6e;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const firstVertexIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#f59e0b;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 3px #f59e0b44, 0 2px 6px rgba(0,0,0,0.3);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// ──────────────────────────────────────────────
// Map Event Handler (internal)
// ──────────────────────────────────────────────
function MapEventHandler({ mode, onDrawPoint, onDrawClose, onBeaconDrop, drawingPoints }) {
  const ptsRef = useRef(drawingPoints);
  ptsRef.current = drawingPoints;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useMapEvents({
    click(e) {
      const pt = [e.latlng.lat, e.latlng.lng];
      if (modeRef.current === 'draw') {
        const pts = ptsRef.current;
        if (pts.length >= 3 && pixelDist(pt, pts[0]) < CLOSE_THRESHOLD) {
          onDrawClose();
          return;
        }
        onDrawPoint(pt);
      } else if (modeRef.current === 'anchor') {
        onBeaconDrop(pt);
      }
    },
  });
  return null;
}

// ──────────────────────────────────────────────
// FitBoundsOnLoad (internal)
// ──────────────────────────────────────────────
function FitBoundsOnLoad({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 4 });
    }
  }, [bounds, map]);
  return null;
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
function SpatialCalibrationStudio() {
  // ─── State ────────────────────────────────
  const [mode, setMode] = useState(null); // 'upload' | 'draw' | 'anchor'
  const [blueprintUrl, setBlueprintUrl] = useState(null);
  const [blueprintDims, setBlueprintDims] = useState(null); // { w, h }
  const [zones, setZones] = useState([]); // { id, name, polygon:[[y,x],...], color }
  const [beacons, setBeacons] = useState([]); // { id, name, pos:[y,x], color }
  const [drawingPoints, setDrawingPoints] = useState([]); // [[y,x],...]
  const [pendingZone, setPendingZone] = useState(null); // polygon awaiting name
  const [pendingBeacon, setPendingBeacon] = useState(null); // pos awaiting name
  const [zoneNameInput, setZoneNameInput] = useState('');
  const [beaconNameInput, setBeaconNameInput] = useState('');
  const [showZones, setShowZones] = useState(true);
  const [showBeacons, setShowBeacons] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); // { type:'zone'|'beacon', id }
  const [editNameId, setEditNameId] = useState(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const beaconCounterRef = useRef(1);
  const zoneColorIdxRef = useRef(0);

  // ─── Derived ──────────────────────────────
  const overlayBounds = useMemo(() => {
    if (!blueprintDims) return null;
    return [[0, 0], [blueprintDims.h, blueprintDims.w]];
  }, [blueprintDims]);

  const mapCenter = useMemo(() => {
    if (!blueprintDims) return [0, 0];
    return [blueprintDims.h / 2, blueprintDims.w / 2];
  }, [blueprintDims]);

  const maxBounds = useMemo(() => {
    if (!blueprintDims) return undefined;
    const pad = 300;
    return [[-pad, -pad], [blueprintDims.h + pad, blueprintDims.w + pad]];
  }, [blueprintDims]);

  // ─── Toast Helper ─────────────────────────
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  // ─── Handlers ─────────────────────────────
  const handleModeChange = useCallback((newMode) => {
    if (drawingPoints.length > 0 && newMode !== 'draw') {
      setDrawingPoints([]);
    }
    setPendingZone(null);
    setPendingBeacon(null);
    setSelectedItem(null);
    setMode(prev => prev === newMode ? null : newMode);
  }, [drawingPoints]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (PNG, JPG, SVG)', 'error');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setBlueprintUrl(url);
      setBlueprintDims({ w: img.naturalWidth, h: img.naturalHeight });
      setZones([]);
      setBeacons([]);
      setDrawingPoints([]);
      setPendingZone(null);
      setPendingBeacon(null);
      setSelectedItem(null);
      beaconCounterRef.current = 1;
      zoneColorIdxRef.current = 0;
      showToast(`Blueprint loaded: ${img.naturalWidth}×${img.naturalHeight}px`, 'success');
    };
    img.onerror = () => showToast('Failed to load image', 'error');
    img.src = url;
  }, [showToast]);

  // ─── Drawing handlers ─────────────────────
  const handleDrawPoint = useCallback((pt) => {
    setDrawingPoints(prev => [...prev, pt]);
  }, []);

  const handleDrawClose = useCallback(() => {
    if (drawingPoints.length < 3) {
      showToast('Need at least 3 points to form a zone', 'warn');
      return;
    }
    const polygon = [...drawingPoints];
    setPendingZone(polygon);
    setZoneNameInput('');
    setDrawingPoints([]);
  }, [drawingPoints, showToast]);

  const confirmZone = useCallback(() => {
    if (!pendingZone) return;
    const name = zoneNameInput.trim() || `Zone ${zones.length + 1}`;
    const color = ZONE_PALETTE[zoneColorIdxRef.current % ZONE_PALETTE.length];
    zoneColorIdxRef.current += 1;
    setZones(prev => [...prev, {
      id: `zone_${Date.now()}`,
      name,
      polygon: pendingZone,
      color,
    }]);
    setPendingZone(null);
    setZoneNameInput('');
    showToast(`Zone "${name}" created`, 'success');
    setMode(null);
  }, [pendingZone, zoneNameInput, zones.length, showToast]);

  const cancelZone = useCallback(() => {
    setPendingZone(null);
    setZoneNameInput('');
  }, []);

  const deleteZone = useCallback((id) => {
    setZones(prev => prev.filter(z => z.id !== id));
    if (selectedItem?.type === 'zone' && selectedItem?.id === id) setSelectedItem(null);
    showToast('Zone deleted', 'info');
  }, [selectedItem, showToast]);

  const startEditZoneName = useCallback((zone) => {
    setEditNameId(zone.id);
    setEditNameValue(zone.name);
  }, []);

  const saveEditZoneName = useCallback(() => {
    if (!editNameId) return;
    setZones(prev => prev.map(z => z.id === editNameId ? { ...z, name: editNameValue.trim() || z.name } : z));
    setEditNameId(null);
    setEditNameValue('');
  }, [editNameId, editNameValue]);

  // ─── Beacon handlers ──────────────────────
  const handleBeaconDrop = useCallback((pos) => {
    setPendingBeacon(pos);
    const autoName = `BLE-${String(beaconCounterRef.current).padStart(3, '0')}`;
    setBeaconNameInput(autoName);
  }, []);

  const confirmBeacon = useCallback(() => {
    if (!pendingBeacon) return;
    const name = beaconNameInput.trim() || `BLE-${String(beaconCounterRef.current).padStart(3, '0')}`;
    beaconCounterRef.current += 1;
    setBeacons(prev => [...prev, {
      id: `beacon_${Date.now()}`,
      name,
      pos: pendingBeacon,
      color: '#2d8a6e',
    }]);
    setPendingBeacon(null);
    setBeaconNameInput('');
    showToast(`Beacon "${name}" placed`, 'success');
  }, [pendingBeacon, beaconNameInput, showToast]);

  const cancelBeacon = useCallback(() => {
    setPendingBeacon(null);
    setBeaconNameInput('');
  }, []);

  const deleteBeacon = useCallback((id) => {
    setBeacons(prev => prev.filter(b => b.id !== id));
    if (selectedItem?.type === 'beacon' && selectedItem?.id === id) setSelectedItem(null);
    showToast('Beacon removed', 'info');
  }, [selectedItem, showToast]);

  const handleBeaconDragEnd = useCallback((id, newPos) => {
    setBeacons(prev => prev.map(b => b.id === id ? { ...b, pos: [newPos.lat, newPos.lng] } : b));
  }, []);

  const startEditBeaconName = useCallback((beacon) => {
    setEditNameId(beacon.id);
    setEditNameValue(beacon.name);
  }, []);

  const saveEditBeaconName = useCallback(() => {
    if (!editNameId) return;
    setBeacons(prev => prev.map(b => b.id === editNameId ? { ...b, name: editNameValue.trim() || b.name } : b));
    setEditNameId(null);
    setEditNameValue('');
  }, [editNameId, editNameValue]);

  // ─── Save ─────────────────────────────────
  const handleSave = useCallback(async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1200));
    const payload = {
      blueprint: { url: blueprintUrl, dimensions: blueprintDims },
      zones: zones.map(z => ({
        id: z.id,
        name: z.name,
        polygon: z.polygon,
        color: z.color,
      })),
      beacons: beacons.map(b => ({
        id: b.id,
        name: b.name,
        x: b.pos[1],
        y: b.pos[0],
      })),
      savedAt: new Date().toISOString(),
    };
    console.log('📦 Spatial Configuration Saved:', payload);
    setSaving(false);
    setSaved(true);
    showToast('Configuration saved successfully', 'success');
    setTimeout(() => setSaved(false), 3000);
  }, [blueprintUrl, blueprintDims, zones, beacons, showToast]);

  // ─── Keyboard Shortcuts ───────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (drawingPoints.length > 0) { setDrawingPoints([]); return; }
        if (pendingZone) { cancelZone(); return; }
        if (pendingBeacon) { cancelBeacon(); return; }
        if (editNameId) { setEditNameId(null); return; }
        setMode(null);
        setSelectedItem(null);
      }
      if (e.key === 'Delete' && selectedItem && !editNameId && !pendingZone && !pendingBeacon) {
        if (selectedItem.type === 'zone') deleteZone(selectedItem.id);
        if (selectedItem.type === 'beacon') deleteBeacon(selectedItem.id);
      }
      if (e.key === 'Enter' && pendingZone && zoneNameInput.trim()) confirmZone();
      if (e.key === 'Enter' && pendingBeacon && beaconNameInput.trim()) confirmBeacon();
      if (e.key === 'Enter' && editNameId) {
        if (zones.find(z => z.id === editNameId)) saveEditZoneName();
        if (beacons.find(b => b.id === editNameId)) saveEditBeaconName();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    drawingPoints, pendingZone, pendingBeacon, editNameId, selectedItem,
    zoneNameInput, beaconNameInput, confirmZone, confirmBeacon, cancelZone,
    cancelBeacon, deleteZone, deleteBeacon, saveEditZoneName, saveEditBeaconName, zones, beacons,
  ]);

  // ─── Styles ───────────────────────────────
  const styles = {
    container: {
      display: 'flex', height: 'calc(100vh - 56px)', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      background: '#f4f8f6', color: '#1a2e27',
    },
    sidebar: {
      width: 340, minWidth: 340, background: '#fff', borderRight: '1px solid #dce8e3',
      display: 'flex', flexDirection: 'column', boxShadow: '2px 0 20px rgba(0,0,0,0.04)',
      zIndex: 10, overflow: 'hidden',
    },
    sidebarHeader: {
      padding: '20px 24px', borderBottom: '1px solid #e8f0ec',
      background: 'linear-gradient(135deg, #f8fdfb 0%, #edf7f3 100%)',
    },
    sidebarTitle: {
      fontSize: 18, fontWeight: 700, color: '#1a7f5c', display: 'flex', alignItems: 'center', gap: 10, margin: 0,
    },
    sidebarSubtitle: {
      fontSize: 12, color: '#5a7a6e', marginTop: 2, marginBottom: 0,
    },
    section: {
      padding: '16px 24px', borderBottom: '1px solid #f0f5f3',
    },
    sectionLabel: {
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
      color: '#7a9a8e', marginBottom: 12,
    },
    modeBtn: (active) => ({
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 16px',
      borderRadius: 10, border: active ? '2px solid #1a7f5c' : '2px solid #e8f0ec',
      background: active ? '#e8f5f0' : '#fafcfb', cursor: 'pointer',
      fontSize: 13, fontWeight: active ? 600 : 500, color: active ? '#1a7f5c' : '#3d5c52',
      transition: 'all 0.15s ease', marginBottom: 8,
      fontFamily: 'inherit',
    }),
    itemRow: (selected) => ({
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
      background: selected ? '#e8f5f0' : 'transparent',
      border: selected ? '1px solid #b8dcd0' : '1px solid transparent',
      cursor: 'pointer', transition: 'all 0.12s ease', marginBottom: 4,
    }),
    colorDot: (color) => ({
      width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0,
    }),
    btn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '12px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontSize: 14, fontWeight: 600, transition: 'all 0.15s ease', fontFamily: 'inherit',
    },
    primaryBtn: {
      background: '#1a7f5c', color: '#fff', boxShadow: '0 2px 8px rgba(26,127,92,0.25)',
    },
    dangerBtn: {
      background: 'transparent', color: '#e05555', border: '1px solid #f5d0d0',
    },
    ghostBtn: {
      background: 'transparent', color: '#5a7a6e', border: '1px solid #dce8e3',
    },
    uploadZone: {
      border: '2px dashed #c4dbd2', borderRadius: 12, padding: '28px 20px',
      textAlign: 'center', cursor: 'pointer', background: '#fafdfc',
      transition: 'all 0.15s ease',
    },
    mapArea: {
      flex: 1, position: 'relative', background: '#e8edea',
    },
    emptyState: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 16, color: '#8aaa9e',
    },
    toast: (type) => ({
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      padding: '12px 20px', borderRadius: 10,
      background: type === 'error' ? '#fef2f2' : type === 'warn' ? '#fffbeb' : type === 'success' ? '#f0fdf6' : '#f0f8ff',
      border: `1px solid ${type === 'error' ? '#fecaca' : type === 'warn' ? '#fde68a' : type === 'success' ? '#bbf7d0' : '#bfdbfe'}`,
      color: type === 'error' ? '#991b1b' : type === 'warn' ? '#92400e' : type === 'success' ? '#166534' : '#1e3a5f',
      fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      animation: 'slideUp 0.25s ease',
    }),
    nameInputOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.25)', zIndex: 20,
    },
    nameInputCard: {
      background: '#fff', borderRadius: 14, padding: '24px 28px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.18)', minWidth: 300,
    },
  };

  // ─── Render ───────────────────────────────
  return (
    <div style={styles.container}>
      {/* ── Global Animations ── */}
      <style>{`
        @keyframes beaconPulse {
          0%, 100% { box-shadow: 0 0 0 4px #2d8a6e33, 0 2px 10px rgba(0,0,0,0.25); }
          50% { box-shadow: 0 0 0 10px #2d8a6e11, 0 2px 10px rgba(0,0,0,0.25); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .studio-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: #c4dbd2 #f8fdfb;
        }
        .studio-sidebar-scroll::-webkit-scrollbar { width: 5px; }
        .studio-sidebar-scroll::-webkit-scrollbar-track { background: #f8fdfb; }
        .studio-sidebar-scroll::-webkit-scrollbar-thumb { background: #c4dbd2; border-radius: 10px; }
        .leaflet-container { background: #e8edea !important; }
        .ble-beacon-icon { background: transparent !important; border: none !important; }
        .mode-btn:hover { background: #f0faf6 !important; }
      `}</style>

      {/* ── Toast ── */}
      {toast && <div style={styles.toast(toast.type)}>{toast.msg}</div>}

      {/* ── SIDEBAR ── */}
      <aside style={styles.sidebar}>
        {/* Header */}
        <div style={styles.sidebarHeader}>
          <h1 style={styles.sidebarTitle}>
            <Layers size={20} /> Spatial Studio
          </h1>
          <p style={styles.sidebarSubtitle}>Floor Plan Mapper &amp; Beacon Calibration</p>
        </div>

        {/* Scrollable content */}
        <div className="studio-sidebar-scroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          {/* ── Modes ── */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Tool Mode</div>
            <button
              style={styles.modeBtn(mode === 'upload')}
              onClick={() => handleModeChange('upload')}
              className="mode-btn"
            >
              <Image size={17} /> Upload Blueprint
            </button>
            <button
              style={styles.modeBtn(mode === 'draw')}
              onClick={() => handleModeChange('draw')}
              disabled={!blueprintUrl}
              className="mode-btn"
              title={!blueprintUrl ? 'Upload a blueprint first' : 'Draw geofence zones'}
            >
              <Pencil size={17} /> Draw Zone
              {mode === 'draw' && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>ACTIVE</span>}
            </button>
            <button
              style={styles.modeBtn(mode === 'anchor')}
              onClick={() => handleModeChange('anchor')}
              disabled={!blueprintUrl}
              className="mode-btn"
              title={!blueprintUrl ? 'Upload a blueprint first' : 'Place BLE beacons'}
            >
              <Radio size={17} /> Place Beacon
              {mode === 'anchor' && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#3b82f6', fontWeight: 700 }}>ACTIVE</span>}
            </button>
          </div>

          {/* ── Upload ── */}
          {mode === 'upload' && (
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Blueprint Source</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div
                style={styles.uploadZone}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#1a7f5c'; e.currentTarget.style.background = '#e8f5f0'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = '#c4dbd2'; e.currentTarget.style.background = '#fafdfc'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#c4dbd2';
                  e.currentTarget.style.background = '#fafdfc';
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    fileInputRef.current.files = dt.files;
                    handleFileSelect({ target: { files: dt.files } });
                  }
                }}
              >
                {blueprintUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 80, height: 60, borderRadius: 8, overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 4,
                    }}>
                      <img src={blueprintUrl} alt="Blueprint preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#1a7f5c', fontWeight: 600 }}>
                      {blueprintDims?.w} × {blueprintDims?.h} px
                    </span>
                    <span style={{ fontSize: 11, color: '#7a9a8e' }}>Click or drop to replace</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <Upload size={28} color="#8aaa9e" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#3d5c52' }}>Drop floor plan image</div>
                      <div style={{ fontSize: 11, color: '#8aaa9e', marginTop: 2 }}>PNG, JPG, or SVG blueprint</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Drawing instructions ── */}
          {mode === 'draw' && blueprintUrl && (
            <div style={{ ...styles.section, background: '#fffdf5', borderLeft: '3px solid #f59e0b', margin: '0 16px 8px', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                <strong>Drawing active</strong><br />
                • Click map to add vertices<br />
                • Click near <span style={{ color: '#f59e0b', fontWeight: 700 }}>● start point</span> to close<br />
                • Press <kbd style={{ background: '#fef3c7', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>Esc</kbd> to cancel
              </div>
            </div>
          )}

          {mode === 'anchor' && blueprintUrl && (
            <div style={{ ...styles.section, background: '#f5faff', borderLeft: '3px solid #3b82f6', margin: '0 16px 8px', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#1e3a5f', lineHeight: 1.6 }}>
                <strong>Beacon placement active</strong><br />
                • Click map to drop beacon<br />
                • Drag markers to reposition<br />
                • Auto-names as BLE-001, BLE-002...
              </div>
            </div>
          )}

          {/* ── Zone Name Prompt (after closing polygon) ── */}
          {pendingZone && (
            <div style={{ ...styles.section, background: '#f8fdfb', border: '2px solid #1a7f5c', borderRadius: 10, margin: '0 16px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1a7f5c', marginBottom: 10 }}>
                <Target size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
                Name New Zone
              </div>
              <input
                autoFocus
                value={zoneNameInput}
                onChange={(e) => setZoneNameInput(e.target.value)}
                placeholder="e.g. ICU, Restricted Area"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #c4dbd2',
                  fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  boxSizing: 'border-box', marginBottom: 10,
                }}
                onFocus={(e) => e.target.style.borderColor = '#1a7f5c'}
                onBlur={(e) => e.target.style.borderColor = '#c4dbd2'}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmZone} style={{ ...styles.btn, ...styles.primaryBtn, flex: 1, padding: '9px 14px', fontSize: 12 }}>
                  <Check size={15} /> Confirm
                </button>
                <button onClick={cancelZone} style={{ ...styles.btn, ...styles.ghostBtn, padding: '9px 14px', fontSize: 12 }}>
                  <X size={15} /> Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Beacon Name Prompt ── */}
          {pendingBeacon && (
            <div style={{ ...styles.section, background: '#f8fdfb', border: '2px solid #3b82f6', borderRadius: 10, margin: '0 16px 12px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', marginBottom: 10 }}>
                <Radio size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
                Name Beacon
              </div>
              <input
                autoFocus
                value={beaconNameInput}
                onChange={(e) => setBeaconNameInput(e.target.value)}
                placeholder="BLE beacon name"
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #c4dbd2',
                  fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  boxSizing: 'border-box', marginBottom: 10,
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#c4dbd2'}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmBeacon} style={{ ...styles.btn, background: '#3b82f6', color: '#fff', flex: 1, padding: '9px 14px', fontSize: 12, boxShadow: '0 2px 8px rgba(59,130,246,0.25)' }}>
                  <Check size={15} /> Place
                </button>
                <button onClick={cancelBeacon} style={{ ...styles.btn, ...styles.ghostBtn, padding: '9px 14px', fontSize: 12 }}>
                  <X size={15} /> Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Zones List ── */}
          {zones.length > 0 && (
            <div style={styles.section}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={styles.sectionLabel}><Layers size={11} style={{ marginRight: 4, verticalAlign: -1 }} /> ZONES ({zones.length})</div>
                <button
                  onClick={() => setShowZones(!showZones)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#7a9a8e' }}
                  title={showZones ? 'Hide zones' : 'Show zones'}
                >
                  {showZones ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {zones.map(zone => (
                <div
                  key={zone.id}
                  style={styles.itemRow(selectedItem?.type === 'zone' && selectedItem?.id === zone.id)}
                  onClick={() => setSelectedItem({ type: 'zone', id: zone.id })}
                >
                  <div style={styles.colorDot(zone.color)} />
                  {editNameId === zone.id ? (
                    <input
                      autoFocus
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onBlur={saveEditZoneName}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditZoneName(); if (e.key === 'Escape') setEditNameId(null); }}
                      style={{
                        flex: 1, padding: '3px 8px', borderRadius: 5, border: '1px solid #1a7f5c',
                        fontSize: 12, fontFamily: 'inherit', outline: 'none',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1a2e27' }}
                      onDoubleClick={() => startEditZoneName(zone)}
                    >
                      {zone.name}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: '#8aaa9e' }}>{zone.polygon.length} pts</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditZoneName(zone); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#b0c7bd' }}
                    title="Rename zone"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#e05555' }}
                    title="Delete zone"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Beacons List ── */}
          {beacons.length > 0 && (
            <div style={styles.section}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={styles.sectionLabel}><Radio size={11} style={{ marginRight: 4, verticalAlign: -1 }} /> BEACONS ({beacons.length})</div>
                <button
                  onClick={() => setShowBeacons(!showBeacons)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#7a9a8e' }}
                  title={showBeacons ? 'Hide beacons' : 'Show beacons'}
                >
                  {showBeacons ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {beacons.map(beacon => (
                <div
                  key={beacon.id}
                  style={styles.itemRow(selectedItem?.type === 'beacon' && selectedItem?.id === beacon.id)}
                  onClick={() => setSelectedItem({ type: 'beacon', id: beacon.id })}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: beacon.color, flexShrink: 0, boxShadow: `0 0 0 3px ${beacon.color}33` }} />
                  {editNameId === beacon.id ? (
                    <input
                      autoFocus
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onBlur={saveEditBeaconName}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditBeaconName(); if (e.key === 'Escape') setEditNameId(null); }}
                      style={{
                        flex: 1, padding: '3px 8px', borderRadius: 5, border: '1px solid #3b82f6',
                        fontSize: 12, fontFamily: 'inherit', outline: 'none',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1a2e27' }}
                      onDoubleClick={() => startEditBeaconName(beacon)}
                    >
                      {beacon.name}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: '#8aaa9e', fontFamily: 'monospace' }}>
                    ({beacon.pos[1].toFixed(0)}, {beacon.pos[0].toFixed(0)})
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditBeaconName(beacon); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#b0c7bd' }}
                    title="Rename beacon"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteBeacon(beacon.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#e05555' }}
                    title="Remove beacon"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom Actions ── */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e8f0ec', background: '#fafdfc' }}>
          {blueprintUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 11, color: '#7a9a8e' }}>
              <Grid3X3 size={13} />
              <span>{blueprintDims?.w}×{blueprintDims?.h} px</span>
              <span style={{ margin: '0 4px' }}>•</span>
              <span>{zones.length} zones</span>
              <span style={{ margin: '0 4px' }}>•</span>
              <span>{beacons.length} beacons</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={!blueprintUrl || saving}
            style={{
              ...styles.btn, ...styles.primaryBtn, width: '100%',
              opacity: (!blueprintUrl || saving) ? 0.6 : 1,
              cursor: (!blueprintUrl || saving) ? 'not-allowed' : 'pointer',
              background: saved ? '#059669' : '#1a7f5c',
            }}
          >
            {saving ? (
              <><span style={{ animation: 'beaconPulse 1s infinite', display: 'inline-block' }}>⏳</span> Saving...</>
            ) : saved ? (
              <><Check size={17} /> Saved</>
            ) : (
              <><Save size={17} /> Save Configuration</>
            )}
          </button>
          {!blueprintUrl && (
            <div style={{ fontSize: 11, color: '#b0c7bd', textAlign: 'center', marginTop: 6 }}>
              Upload a blueprint to enable saving
            </div>
          )}
        </div>
      </aside>

      {/* ── MAP AREA ── */}
      <main style={styles.mapArea}>
        {!blueprintUrl ? (
          <div style={styles.emptyState}>
            <div style={{
              width: 100, height: 100, borderRadius: 24, background: '#dce8e3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Image size={44} color="#9bb8ad" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#5a7a6e' }}>No Blueprint Loaded</div>
            <div style={{ fontSize: 13, color: '#8aaa9e', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
              Upload a hospital floor plan image to start mapping zones and placing BLE beacons.
            </div>
            <button
              onClick={() => { setMode('upload'); fileInputRef.current?.click(); }}
              style={{ ...styles.btn, ...styles.primaryBtn, marginTop: 8 }}
            >
              <Upload size={16} /> Upload Blueprint
            </button>
          </div>
        ) : (
          <MapContainer
            key={blueprintUrl}
            center={mapCenter}
            zoom={0}
            crs={L.CRS.Simple}
            maxBounds={maxBounds}
            minZoom={-2}
            maxZoom={6}
            zoomControl={true}
            doubleClickZoom={mode !== 'draw'}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
            attributionControl={false}
          >
            {/* Blueprint overlay */}
            <ImageOverlay
              url={blueprintUrl}
              bounds={overlayBounds}
              opacity={1}
            />

            {/* Saved zones */}
            {showZones && zones.map(zone => (
              <Polygon
                key={zone.id}
                positions={zone.polygon}
                pathOptions={{
                  color: zone.color,
                  fillColor: zone.color,
                  fillOpacity: selectedItem?.type === 'zone' && selectedItem?.id === zone.id ? 0.25 : 0.12,
                  weight: selectedItem?.type === 'zone' && selectedItem?.id === zone.id ? 3 : 2,
                  dashArray: undefined,
                }}
                eventHandlers={{
                  click: () => setSelectedItem({ type: 'zone', id: zone.id }),
                }}
              >
                <Popup>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{zone.name}</div>
                  <div style={{ fontSize: 10, color: '#666' }}>{zone.polygon.length} vertices</div>
                </Popup>
              </Polygon>
            ))}

            {/* Drawing preview — connecting lines */}
            {drawingPoints.length >= 2 && (
              <Polyline
                positions={drawingPoints}
                pathOptions={{ color: '#f59e0b', weight: 2.5, dashArray: '8 4' }}
              />
            )}

            {/* Drawing preview — polygon fill */}
            {drawingPoints.length >= 3 && (
              <Polygon
                positions={drawingPoints}
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: '6 3',
                }}
              />
            )}

            {/* Drawing vertices */}
            {drawingPoints.map((pt, i) => (
              <Marker
                key={`vtx_${i}`}
                position={pt}
                icon={i === 0 ? firstVertexIcon : vertexIcon}
                interactive={false}
              />
            ))}

            {/* First vertex close-hint ring */}
            {drawingPoints.length >= 3 && (() => {
              const fp = drawingPoints[0];
              return (
                <CircleMarker
                  center={fp}
                  radius={CLOSE_THRESHOLD}
                  pathOptions={{
                    color: '#f59e0b',
                    fillColor: '#f59e0b',
                    fillOpacity: 0.08,
                    weight: 1.5,
                    dashArray: '4 3',
                  }}
                  interactive={false}
                />
              );
            })()}

            {/* Beacon markers */}
            {showBeacons && beacons.map(beacon => (
              <Marker
                key={beacon.id}
                position={beacon.pos}
                icon={createBeaconIcon(
                  selectedItem?.type === 'beacon' && selectedItem?.id === beacon.id ? '#3b82f6' : beacon.color,
                  true
                )}
                draggable={true}
                eventHandlers={{
                  click: () => setSelectedItem({ type: 'beacon', id: beacon.id }),
                  dragend: (e) => {
                    const marker = e.target;
                    const pos = marker.getLatLng();
                    handleBeaconDragEnd(beacon.id, pos);
                  },
                }}
              >
                <Popup>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{beacon.name}</div>
                  <div style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
                    X: {beacon.pos[1].toFixed(1)} / Y: {beacon.pos[0].toFixed(1)}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Pending beacon preview */}
            {pendingBeacon && (
              <Marker
                position={pendingBeacon}
                icon={createBeaconIcon('#3b82f6', false)}
                interactive={false}
              />
            )}

            {/* Map event handler */}
            {blueprintUrl && (
              <MapEventHandler
                mode={mode}
                onDrawPoint={handleDrawPoint}
                onDrawClose={handleDrawClose}
                onBeaconDrop={handleBeaconDrop}
                drawingPoints={drawingPoints}
              />
            )}

            {/* Fit bounds on load */}
            {overlayBounds && <FitBoundsOnLoad bounds={overlayBounds} />}
          </MapContainer>
        )}

        {/* ── Floating Mode Indicator ── */}
        {mode && blueprintUrl && (
          <div style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
            padding: '8px 18px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: mode === 'draw' ? '#fef3c7' : mode === 'anchor' ? '#dbeafe' : '#e8f5f0',
            color: mode === 'draw' ? '#92400e' : mode === 'anchor' ? '#1e3a5f' : '#1a7f5c',
            border: `1.5px solid ${mode === 'draw' ? '#f59e0b' : mode === 'anchor' ? '#3b82f6' : '#1a7f5c'}`,
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)', zIndex: 999,
            display: 'flex', alignItems: 'center', gap: 7,
            pointerEvents: 'none',
          }}>
            {mode === 'draw' ? <><Pencil size={14} /> Drawing Zone — Click to add vertices</>
              : mode === 'anchor' ? <><Radio size={14} /> Placing Beacons — Click map to drop</>
              : <><Image size={14} /> Upload Mode</>}
          </div>
        )}

        {/* ── Coordinate Hover Display ── */}
        {blueprintUrl && mode && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            padding: '6px 14px', borderRadius: 8, fontSize: 11, fontFamily: 'monospace',
            background: 'rgba(26,46,39,0.85)', color: '#c4dbd2',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)', zIndex: 999,
          }}>
            CRS.Simple • Pixel-space coordinates
          </div>
        )}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────
// Default Export with Error Boundary
// ──────────────────────────────────────────────
export default function SpatialCalibrationStudioWithBoundary() {
  return (
    <WidgetErrorBoundary componentName="SpatialCalibrationStudio">
      <SpatialCalibrationStudio />
    </WidgetErrorBoundary>
  );
}