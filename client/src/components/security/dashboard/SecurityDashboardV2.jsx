import React, { useReducer, useEffect, useState, useCallback } from 'react';
import {
    Shield, Building2, Mic, MicOff, Volume2, VolumeX,
    RefreshCw, Radio, Bell, Lock, Camera, Printer, Settings,
    Activity, Users, MapPin, ChevronDown, Sliders, Upload, Compass
} from 'lucide-react';
import AlertBanner from './AlertBanner';
import GuardCard from './GuardCard';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from '../../ThemeToggle';
import { LanguageProvider, useLanguage } from '../../../contexts/LanguageContext';
// import QuickCommandPanel from './QuickCommandPanel'; // Deprecated
import LiveOverwatchMap from '../cockpit/LiveOverwatchMap';
import GuardMap from '../GuardMap';
import VisitorsLog from '../VisitorsLog';
import WidgetErrorBoundary from '../../WidgetErrorBoundary';
import VoiceChannelBar from './VoiceChannelBar';
import PatrolReportModal from './PatrolReportModal';
import AlertSettingsModal from './AlertSettingsModal';
import FloorPlanStudioModal from '../studio/FloorPlanStudioModal';
import { connectSocket, subscribeToEvent, unsubscribeFromEvent } from '../../../services/socket';
import api from '../../../utils/axiosInstance';
import './SecurityDashboard.css';

// Initial state
const initialState = {
    guards: [],
    alerts: [],
    events: [],
    selectedGuard: null,
    isLockdownActive: false,
    hospitalName: 'Wolf Hospital',
    hospitalId: 1,
    hospitalLatitude: null,  // Will be fetched from hospital settings
    hospitalLongitude: null,
    voiceChannelActive: false,
    soundEnabled: true
};

// Reducer for state management
function reducer(state, action) {
    switch (action.type) {
        case 'SET_GUARDS':
            return { ...state, guards: action.payload };

        case 'UPDATE_GUARD_LOCATION': {
            const guardData = action.payload;
            const exists = state.guards.find(g => g.guard_id === guardData.guard_id);
            let newGuards;
            if (exists) {
                newGuards = state.guards.map(g =>
                    g.guard_id === guardData.guard_id
                        ? { ...g, ...guardData, lastUpdate: new Date().toISOString(), status: 'ONLINE' }
                        : g
                );
            } else {
                newGuards = [...state.guards, {
                    ...guardData,
                    lastUpdate: new Date().toISOString(),
                    status: 'ONLINE'
                }];
            }
            const newSelected = state.selectedGuard?.guard_id === guardData.guard_id
                ? { ...state.selectedGuard, ...guardData, lastUpdate: new Date().toISOString() }
                : state.selectedGuard;
            return { ...state, guards: newGuards, selectedGuard: newSelected };
        }

        case 'NEW_ALERT':
            return {
                ...state,
                alerts: [action.payload, ...state.alerts].slice(0, 20)
            };

        case 'ACKNOWLEDGE_ALERT':
            return {
                ...state,
                alerts: state.alerts.filter(a => (a.id || a.incident_id) !== action.payload)
            };

        case 'NEW_EVENT':
            return {
                ...state,
                events: [action.payload, ...state.events].slice(0, 50)
            };

        case 'SELECT_GUARD':
            return { ...state, selectedGuard: action.payload };

        case 'SET_LOCKDOWN':
            return { ...state, isLockdownActive: action.payload };

        case 'TOGGLE_SOUND':
            return { ...state, soundEnabled: !state.soundEnabled };

        case 'SET_LANGUAGE':
            return { ...state, language: action.payload };

        case 'TOGGLE_VOICE_CHANNEL':
            return { ...state, voiceChannelActive: !state.voiceChannelActive };

        case 'SET_HOSPITAL':
            return {
                ...state,
                hospitalName: action.payload.name,
                hospitalId: action.payload.id,
                hospitalLatitude: action.payload.latitude || null,
                hospitalLongitude: action.payload.longitude || null
            };

        default:
            return state;
    }
}

/**
 * SecurityDashboardV2 - Redesigned Guard Command Centre
 * Optimized for Indian operators with bilingual support
 */
const SecurityDashboardV2Inner = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [showPatrolReport, setShowPatrolReport] = useState(false);
    const [showAlertSettings, setShowAlertSettings] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeFloor, setActiveFloor] = useState(1);
    const [floorPlans, setFloorPlans] = useState([]);
    const [currentFloorPlan, setCurrentFloorPlan] = useState(null);
    const [showStudioModal, setShowStudioModal] = useState(false);

    // Use language context for translations
    const { t } = useLanguage();

    // Mock guard data for demo/development when backend is unavailable
    const MOCK_GUARDS = [
        { guard_id: 1, username: 'Officer Rohit', photoUrl: null, status: 'PATROLLING', latitude: 28.6139, longitude: 77.2090, heading: 45, speed: 1.2, batteryLevel: 0.85, shiftStart: '08:00', shiftEnd: '20:00', lastUpdate: new Date().toISOString() },
        { guard_id: 2, username: 'Officer Singh', photoUrl: null, status: 'ONLINE', latitude: 28.6152, longitude: 77.2110, heading: 180, speed: 0.0, batteryLevel: 0.62, shiftStart: '08:00', shiftEnd: '20:00', lastUpdate: new Date().toISOString() },
        { guard_id: 3, username: 'Officer Priya', photoUrl: null, status: 'PATROLLING', latitude: 28.6115, longitude: 77.2075, heading: 270, speed: 0.8, batteryLevel: 0.93, shiftStart: '08:00', shiftEnd: '20:00', lastUpdate: new Date().toISOString() },
        { guard_id: 4, username: 'Officer Vikram', photoUrl: null, status: 'IDLE', latitude: 28.6170, longitude: 77.2125, heading: 0, speed: 0.0, batteryLevel: 0.41, shiftStart: '20:00', shiftEnd: '08:00', lastUpdate: new Date().toISOString() },
    ];

    // Fetch initial data
    const fetchGuards = useCallback(async () => {
        setIsRefreshing(true);
        try {
            // First try to get online guards with recent locations
            const onlineRes = await api.get('/api/security/guards/online');
            if (onlineRes.data?.data && onlineRes.data.data.length > 0) {
                const guards = onlineRes.data.data.map(g => ({
                    guard_id: g.guard_id,
                    username: g.username,
                    photoUrl: g.photo_url,
                    status: g.status,
                    latitude: g.latitude,
                    longitude: g.longitude,
                    heading: g.heading,
                    speed: g.speed,
                    batteryLevel: g.battery_level,
                    floor_number: g.floor_number || 1,
                    altitude: g.altitude || 0,
                    shiftStart: g.shift_start,
                    shiftEnd: g.shift_end,
                    lastUpdate: g.last_update
                }));
                dispatch({ type: 'SET_GUARDS', payload: guards });
                return;
            }
        } catch {
            console.log('[SecurityDashboard] Online guards endpoint not available, falling back to patrols');
        }

        try {
            // Fallback: Fetch active patrols to get guard data
            const response = await api.get('/api/security/patrols/active');
            if (response.data?.data && response.data.data.length > 0) {
                const guards = response.data.data.map(patrol => ({
                    guard_id: patrol.guard_id,
                    username: patrol.guard_name,
                    status: 'PATROLLING',
                    latitude: patrol.last_location?.latitude,
                    longitude: patrol.last_location?.longitude,
                    heading: patrol.last_location?.heading,
                    speed: patrol.last_location?.speed,
                    lastUpdate: new Date().toISOString()
                }));
                dispatch({ type: 'SET_GUARDS', payload: guards });
                return;
            }
        } catch {
            console.log('[SecurityDashboard] Patrols endpoint not available either');
        }

        // Final fallback: Use mock data so the dashboard isn't empty
        console.log('[SecurityDashboard] Using mock guard data for demo');
        dispatch({ type: 'SET_GUARDS', payload: MOCK_GUARDS });
        dispatch({
            type: 'NEW_EVENT',
            payload: { message: 'Using demo data — configure guard accounts and start patrol to see live data', type: 'INFO', timestamp: new Date().toISOString() }
        });
        setIsRefreshing(false);
    }, []);

    // Fetch calibrated floor plan maps
    const fetchFloorPlans = useCallback(async (floorNum = 1) => {
        try {
            const res = await api.get(`/api/security/maps/active?floor=${floorNum}`);
            if (res.data?.success) {
                setCurrentFloorPlan(res.data.data);
                if (res.data.floors) {
                    setFloorPlans(res.data.floors);
                }
            }
        } catch (e) {
            console.warn('[SecurityDashboard] Failed to fetch active floor map:', e);
        }
    }, []);

    useEffect(() => {
        fetchFloorPlans(1);
    }, [fetchFloorPlans]);

    // Socket connection
    useEffect(() => {
        // Get auth token from localStorage
        const authData = localStorage.getItem('wolf_auth');
        let token = null;
        let hospitalId = 1;

        if (authData) {
            try {
                const parsed = JSON.parse(authData);
                token = parsed.token;
                hospitalId = parsed.user?.hospital_id || 1;
                dispatch({
                    type: 'SET_HOSPITAL',
                    payload: {
                        id: hospitalId,
                        name: parsed.user?.hospitalName || 'Wolf Hospital'
                    }
                });
            } catch {
                console.warn('[SecurityDashboard] Failed to parse auth data');
            }
        }

        // Fetch hospital settings to get location for map centering
        const fetchHospitalLocation = async () => {
            try {
                const response = await api.get('/api/settings/hospital-profile');
                if (response.data?.data) {
                    const settings = response.data.data;
                    // Look for latitude/longitude in settings
                    const lat = settings.latitude || settings.hospital_latitude;
                    const lng = settings.longitude || settings.hospital_longitude;
                    if (lat && lng) {
                        dispatch({
                            type: 'SET_HOSPITAL',
                            payload: {
                                id: hospitalId,
                                name: settings.hospital_name || 'Wolf Hospital',
                                latitude: parseFloat(lat),
                                longitude: parseFloat(lng)
                            }
                        });
                    }
                }
            } catch {
                console.log('[SecurityDashboard] Hospital settings not available for map centering');
            }
        };
        fetchHospitalLocation();

        // Connect socket
        connectSocket(token, hospitalId);

        // Subscribe to events
        const handleLocationUpdate = (data) => {
            dispatch({ type: 'UPDATE_GUARD_LOCATION', payload: data });
            dispatch({
                type: 'NEW_EVENT',
                payload: {
                    message: `${data.username || 'Guard'} location updated`,
                    type: 'INFO',
                    timestamp: new Date().toISOString()
                }
            });
        };

        const handleSecurityAlert = (data) => {
            dispatch({ type: 'NEW_ALERT', payload: data });
            dispatch({
                type: 'NEW_EVENT',
                payload: {
                    message: `ALERT: ${data.type} - ${data.guard_name || 'Unknown'}`,
                    type: 'ALERT',
                    timestamp: new Date().toISOString()
                }
            });
        };

        const handleLockdown = (data) => {
            dispatch({ type: 'SET_LOCKDOWN', payload: data.status === 'LOCKDOWN' });
            dispatch({
                type: 'NEW_EVENT',
                payload: {
                    message: data.status === 'LOCKDOWN' ? 'LOCKDOWN ACTIVATED' : 'Lockdown ended',
                    type: 'ALERT',
                    timestamp: new Date().toISOString()
                }
            });
        };

        subscribeToEvent('guard_location_update', handleLocationUpdate);
        subscribeToEvent('security_alert', handleSecurityAlert);
        subscribeToEvent('LOCKDOWN_START', handleLockdown);
        subscribeToEvent('LOCKDOWN_END', handleLockdown);

        // Initial fetch
        fetchGuards();

        return () => {
            unsubscribeFromEvent('guard_location_update');
            unsubscribeFromEvent('security_alert');
            unsubscribeFromEvent('LOCKDOWN_START');
            unsubscribeFromEvent('LOCKDOWN_END');
        };
    }, [fetchGuards]);

    // Command handlers
    const handlePingAll = async () => {
        try {
            await api.post('/api/security/guards/ping-all');
            dispatch({
                type: 'NEW_EVENT',
                payload: { message: 'Ping sent to all guards', type: 'INFO', timestamp: new Date().toISOString() }
            });
        } catch (error) {
            console.error('[SecurityDashboard] Ping all failed:', error);
        }
    };

    const handleBroadcast = async (message) => {
        try {
            await api.post('/api/security/dispatch', { message, priority: 'High' });
            dispatch({
                type: 'NEW_EVENT',
                payload: { message: `Broadcast sent: "${message}"`, type: 'INFO', timestamp: new Date().toISOString() }
            });
        } catch (error) {
            console.error('[SecurityDashboard] Broadcast failed:', error);
        }
    };

    const handleLockdown = async (enable) => {
        try {
            await api.post('/api/security/lockdown', { enabled: enable });
            dispatch({ type: 'SET_LOCKDOWN', payload: enable });
        } catch (error) {
            console.error('[SecurityDashboard] Lockdown toggle failed:', error);
        }
    };

    const handlePingGuard = async (guardId) => {
        try {
            await api.post('/api/security/guards/ping', { guardId });
            dispatch({
                type: 'NEW_EVENT',
                payload: { message: `Ping sent to guard ${guardId}`, type: 'INFO', timestamp: new Date().toISOString() }
            });
        } catch (error) {
            console.error('[SecurityDashboard] Ping guard failed:', error);
        }
    };

    const handleRequestPhoto = async (guardId) => {
        try {
            await api.post('/api/security/guards/request-photo', { guardId });
            dispatch({
                type: 'NEW_EVENT',
                payload: { message: `Photo requested from guard ${guardId}`, type: 'INFO', timestamp: new Date().toISOString() }
            });
        } catch (error) {
            console.error('[SecurityDashboard] Request photo failed:', error);
        }
    };

    const handleAcknowledgeAlert = async (alertId) => {
        try {
            await api.put(`/api/security/incidents/${alertId}`, { status: 'In Progress' });
            dispatch({ type: 'ACKNOWLEDGE_ALERT', payload: alertId });
        } catch (error) {
            console.error('[SecurityDashboard] Acknowledge alert failed:', error);
        }
    };

    // Guard counts
    const onlineGuards = state.guards.filter(g => g.status !== 'OFFLINE').length;
    const totalGuards = state.guards.length;

    return (
        <div className={`security-dashboard-v2 ${state.isLockdownActive ? 'lockdown-active' : ''}`}>
            {/* Alert Banner */}
            <AlertBanner
                alerts={state.alerts}
                onAcknowledge={handleAcknowledgeAlert}
                onDismiss={(id) => dispatch({ type: 'ACKNOWLEDGE_ALERT', payload: id })}
                soundEnabled={state.soundEnabled}
                onToggleSound={() => dispatch({ type: 'TOGGLE_SOUND' })}
            />

            {/* Header */}
            <header className="dashboard-header">
                <div className="header-left">
                    <Shield className="header-icon" size={28} />
                    <div className="header-titles">
                        <h1 className="dashboard-title">{t.title}</h1>
                        <div className="hospital-name">
                            <Building2 size={14} />
                            <span>{state.hospitalName}</span>
                        </div>
                    </div>
                </div>

                <div className="header-center">
                    <button className="quick-action-btn" onClick={handlePingAll} title="Ping All Guards">
                        <Radio size={16} />
                        <span>Ping All</span>
                    </button>
                    <button className="quick-action-btn" onClick={() => handleBroadcast(prompt("Enter broadcast message:"))} title="Broadcast Message">
                        <Bell size={16} />
                        <span>Broadcast</span>
                    </button>
                    <button className={`quick-action-btn ${state.isLockdownActive ? 'active' : 'danger'}`} onClick={() => handleLockdown(!state.isLockdownActive)} title="Emergency Lockdown">
                        <Lock size={16} />
                        <span>{state.isLockdownActive ? 'End Lockdown' : 'Lockdown'}</span>
                    </button>
                    <div className="d-flex ms-2 gap-2 border-start ps-3 border-secondary">
                        <button className="header-btn" onClick={() => state.guards.forEach(g => handleRequestPhoto(g.guard_id))} title="Request Photos">
                            <Camera size={18} />
                        </button>
                        <button className="header-btn" onClick={() => setShowPatrolReport(true)} title="Print Report">
                            <Printer size={18} />
                        </button>
                        <button className="header-btn" onClick={() => setShowAlertSettings(true)} title="Settings">
                            <Settings size={18} />
                        </button>
                    </div>
                </div>

                <div className="header-right">
                    {/* Guard Stats */}
                    <div className="guard-stats">
                        <span className="stat-value">{onlineGuards}</span>
                        <span className="stat-label">/{totalGuards} Online</span>
                    </div>

                    {/* Refresh */}
                    <button
                        className={`header-btn ${isRefreshing ? 'spinning' : ''}`}
                        onClick={fetchGuards}
                        title={t.refresh}
                    >
                        <RefreshCw size={18} />
                    </button>

                    {/* Language Toggle */}
                    <LanguageToggle showLabel={false} />

                    {/* Theme Toggle */}
                    <ThemeToggle />

                    {/* Sound Toggle */}
                    <button
                        className="header-btn"
                        onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}
                        title={state.soundEnabled ? 'Mute' : 'Unmute'}
                    >
                        {state.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </button>

                    {/* Status Badge */}
                    <div className="status-badge">
                        <span className="status-dot" />
                        <span>LIVE</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="dashboard-main">
                {/* Left: Guard Cards (60%) */}
                <section className="guards-section">
                    <div className="guards-section-header">
                        <h2 className="guards-section-title">Active Units</h2>
                        <div className="d-flex gap-2">
                            {/* Filter controls can go here */}
                        </div>
                    </div>
                    <div className="guards-grid">
                        {state.guards.length === 0 ? (
                            <div className="no-guards-message">
                                <Shield size={48} />
                                <p>No guards currently online</p>
                                <p className="hint">Guards will appear here when they start their patrol</p>
                            </div>
                        ) : (
                            state.guards.map(guard => (
                                <GuardCard
                                    key={guard.guard_id}
                                    guard={guard}
                                    isSelected={state.selectedGuard?.guard_id === guard.guard_id}
                                    onPing={handlePingGuard}
                                    onRequestPhoto={handleRequestPhoto}
                                    onChat={(id) => console.log('Chat with', id)}
                                    onSelect={(g) => dispatch({ type: 'SELECT_GUARD', payload: g })}
                                    showPhoto={true}
                                    showShiftInfo={true}
                                />
                            ))
                        )}
                    </div>
                </section>

                {/* Right: Map (40%) */}
                <section className="map-section">
                    <div className="map-section-header">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <h2 className="map-section-title mb-0">Live Tactical Map</h2>
                            <button 
                                className="btn-upload-blueprint-glow"
                                onClick={() => setShowStudioModal(true)}
                                title="Upload hospital floor layout (CAD/SVG/PNG) and align with satellite coordinates"
                            >
                                <Upload size={13} />
                                <span>Upload Floor Plan & Align</span>
                            </button>
                        </div>
                        <div className="floor-selector-strip d-flex align-items-center">
                            <span className="floor-selector-label">LEVEL:</span>
                            {[-1, 1, 2, 3, 4].map(fl => (
                                <button
                                    key={fl}
                                    className={`floor-btn ${activeFloor === fl ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveFloor(fl);
                                        fetchFloorPlans(fl);
                                    }}
                                >
                                    {fl <= 0 ? `B${Math.abs(fl) + 1}` : `L${fl}`}
                                </button>
                            ))}
                            <button
                                className="floor-btn studio-btn"
                                title="Open Georeferencing Studio"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(0, 240, 255, 0.15)',
                                    border: '1px solid rgba(0, 240, 255, 0.4)',
                                    color: '#00f0ff',
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    borderRadius: '4px',
                                    marginLeft: '6px'
                                }}
                                onClick={() => setShowStudioModal(true)}
                            >
                                <Sliders size={12} /> 📐 Studio
                            </button>
                        </div>
                    </div>
                    {(!currentFloorPlan?.blueprint_file || 
                      currentFloorPlan?.calibration_status === 'coarse_aligned') && (
                        <div className="blueprint-alert-banner" onClick={() => setShowStudioModal(true)}>
                            <div className="d-flex align-items-center gap-2">
                                <Compass size={16} className="text-warning flex-shrink-0" />
                                <span>
                                    <strong>Level {activeFloor <= 0 ? `B${Math.abs(activeFloor)+1}` : `L${activeFloor}`}:</strong> No calibrated layout. Upload your hospital floor plan to align walls with GPS coordinates.
                                </span>
                            </div>
                            <button className="btn-studio-action">
                                <Upload size={13} /> Upload & Align
                            </button>
                        </div>
                    )}
                    <WidgetErrorBoundary name="Live Overwatch Map">
                        <LiveOverwatchMap
                            guards={state.guards}
                            selectedGuard={state.selectedGuard}
                            onSelectGuard={(g) => {
                                dispatch({ type: 'SELECT_GUARD', payload: g });
                                if (g?.floor_number && g.floor_number !== activeFloor) {
                                    setActiveFloor(g.floor_number);
                                    fetchFloorPlans(g.floor_number);
                                }
                            }}
                            floorPlan={currentFloorPlan}
                            hospitalLocation={{
                                latitude: state.hospitalLatitude,
                                longitude: state.hospitalLongitude,
                                name: state.hospitalName
                            }}
                            onOpenStudio={() => setShowStudioModal(true)}
                        />
                    </WidgetErrorBoundary>
                </section>

                {/* Guard Map Widget — isolated fault boundary */}
                <section className="map-section mt-3">
                    <div className="map-section-header">
                        <h2 className="map-section-title">Guard Map</h2>
                    </div>
                    <WidgetErrorBoundary name="Guard Map">
                        <GuardMap activeGuards={state.guards} />
                    </WidgetErrorBoundary>
                </section>

                {/* Visitors Log Widget — isolated fault boundary */}
                <section className="guards-section mt-3">
                    <div className="guards-section-header">
                        <h2 className="guards-section-title">Visitors Log</h2>
                    </div>
                    <WidgetErrorBoundary name="Visitors Log">
                        <VisitorsLog visitors={state.guards} />
                    </WidgetErrorBoundary>
                </section>
            </main>

            {/* Footer: Activity & Voice */}
            <footer className="dashboard-footer">
                <div className="activity-feed">
                    <div className="activity-feed-title">
                        <Activity size={12} className="me-2" />
                        Recent Network Activity
                    </div>
                    {state.events.length === 0 ? (
                        <div className="text-muted small p-2">No recent activity</div>
                    ) : (
                        state.events.map((event, idx) => (
                            <div key={idx} className="activity-item">
                                <span className="activity-time">
                                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={`activity-message ${event.type === 'ALERT' ? 'activity-type-alert' : ''}`}>
                                    {event.message}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <div className="voice-channel-mini">
                    <div className="d-flex flex-column flex-grow-1">
                        <span className="text-muted small" style={{ fontSize: '10px' }}>VOICE CHANNEL</span>
                        <div className={`voice-channel-status ${state.voiceChannelActive ? 'connected' : 'disconnected'}`}>
                            {state.voiceChannelActive ? 'CONNECTED' : 'DISCONNECTED'}
                        </div>
                    </div>
                    <button
                        className={`ptt-button ${state.voiceChannelActive ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'TOGGLE_VOICE_CHANNEL' })}
                        title="Toggle Voice Channel"
                    >
                        {state.voiceChannelActive ? <Mic size={24} /> : <MicOff size={24} />}
                    </button>
                </div>
            </footer>

            {/* Voice Channel Bar (floating at bottom) */}
            {state.voiceChannelActive && (
                <VoiceChannelBar
                    onClose={() => dispatch({ type: 'TOGGLE_VOICE_CHANNEL' })}
                />
            )}

            {/* Modals */}
            {showPatrolReport && (
                <PatrolReportModal
                    guards={state.guards}
                    events={state.events}
                    onClose={() => setShowPatrolReport(false)}
                />
            )}

            {showAlertSettings && (
                <AlertSettingsModal
                    onClose={() => setShowAlertSettings(false)}
                />
            )}

            {/* Georeferencing Studio Modal */}
            <FloorPlanStudioModal
                isOpen={showStudioModal}
                onClose={() => setShowStudioModal(false)}
                initialFloor={activeFloor}
                onSaveSuccess={() => fetchFloorPlans(activeFloor)}
            />
        </div>
    );
};

/**
 * Wrapped component with LanguageProvider
 * This ensures the language context is available to all child components
 */
const SecurityDashboardV2 = () => (
    <LanguageProvider>
        <SecurityDashboardV2Inner />
    </LanguageProvider>
);

export default SecurityDashboardV2;
