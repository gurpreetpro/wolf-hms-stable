import React from 'react';
import { 
    MapPin, Battery, Clock, Radio, Camera, MessageSquare, 
    User, Footprints, Signal, AlertTriangle, CheckCircle
} from 'lucide-react';
import './GuardCard.css';

/**
 * GuardCard - At-a-glance guard status with quick actions
 * Designed for Indian operators with large touch targets
 */
const GuardCard = ({ 
    guard,
    onPing,
    onRequestPhoto,
    onChat,
    onSelect,
    isSelected = false,
    showPhoto = true,
    showShiftInfo = true,
    translations = {}
}) => {
    // Default translations
    const t = {
        ping: 'Ping',
        photo: 'Photo',
        chat: 'Chat',
        online: 'Online',
        offline: 'Offline',
        patrolling: 'Patrolling',
        idle: 'Idle',
        sos: 'SOS',
        battery: 'Battery',
        steps: 'Steps',
        shiftStart: 'Shift Start',
        onDuty: 'On Duty',
        ...translations
    };

    // Status configuration
    const statusConfig = {
        'ONLINE': { color: '#00c853', label: t.online, icon: CheckCircle },
        'PATROLLING': { color: '#00d4ff', label: t.patrolling, icon: Footprints },
        'IDLE': { color: '#ffab00', label: t.idle, icon: Clock },
        'OFFLINE': { color: '#9e9e9e', label: t.offline, icon: null },
        'SOS': { color: '#ff1744', label: t.sos, icon: AlertTriangle }
    };

    const status = guard.status?.toUpperCase() || 'OFFLINE';
    const statusInfo = statusConfig[status] || statusConfig['OFFLINE'];
    const StatusIcon = statusInfo.icon;

    // Calculate time on duty
    const getTimeOnDuty = () => {
        if (!guard.shiftStart) return null;
        const start = new Date(guard.shiftStart);
        const now = new Date();
        const hours = Math.floor((now - start) / (1000 * 60 * 60));
        const minutes = Math.floor(((now - start) % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    // Format battery level
    const getBatteryLevel = () => {
        if (!guard.batteryLevel && guard.batteryLevel !== 0) return null;
        const level = typeof guard.batteryLevel === 'number' && guard.batteryLevel <= 1 
            ? Math.round(guard.batteryLevel * 100) 
            : guard.batteryLevel;
        return level;
    };

    const batteryLevel = getBatteryLevel();
    const batteryColor = batteryLevel > 50 ? '#00c853' : batteryLevel > 20 ? '#ffab00' : '#ff1744';

    // Get location display
    const getLocationDisplay = () => {
        if (guard.locationName) return guard.locationName;
        if (guard.location) {
            if (typeof guard.location === 'string') return guard.location;
            if (guard.location.lat && guard.location.lng) {
                return `${guard.location.lat.toFixed(4)}, ${guard.location.lng.toFixed(4)}`;
            }
        }
        if (guard.latitude && guard.longitude) {
            return `${guard.latitude.toFixed(4)}, ${guard.longitude.toFixed(4)}`;
        }
        return 'Unknown Location';
    };

    return (
        <div 
            className={`guard-card ${isSelected ? 'selected' : ''} status-${status.toLowerCase()}`}
            onClick={() => onSelect && onSelect(guard)}
        >
            {/* Header with photo and status */}
            <div className="guard-card-header">
                {/* Photo or Avatar */}
                <div className="guard-avatar-wrapper">
                    {showPhoto && guard.photoUrl ? (
                        <img 
                            src={guard.photoUrl} 
                            alt={guard.username} 
                            className="guard-avatar"
                        />
                    ) : (
                        <div className="guard-avatar guard-avatar-placeholder">
                            <User size={24} />
                        </div>
                    )}
                    {/* Status dot */}
                    <div 
                        className="status-indicator"
                        style={{ backgroundColor: statusInfo.color }}
                        title={statusInfo.label}
                    />
                </div>

                {/* Name and status */}
                <div className="guard-info">
                    <h4 className="guard-name">
                        {guard.username || guard.name || `Guard ${guard.guard_id}`}
                    </h4>
                    <div className="guard-status" style={{ color: statusInfo.color }}>
                        {StatusIcon && <StatusIcon size={14} />}
                        <span>{statusInfo.label}</span>
                    </div>
                </div>

                {/* SOS indicator */}
                {status === 'SOS' && (
                    <div className="sos-indicator pulse">
                        <AlertTriangle size={20} />
                    </div>
                )}
            </div>

            {/* Details section */}
            <div className="guard-card-details">
                {/* Location */}
                <div className="detail-row">
                    <MapPin size={14} className="detail-icon" />
                    <span className="detail-value location">{getLocationDisplay()}</span>
                </div>

                {/* Telemetry row */}
                <div className="telemetry-row">
                    {/* Battery */}
                    {batteryLevel !== null && (
                        <div className="telemetry-item" title={t.battery}>
                            <Battery size={14} style={{ color: batteryColor }} />
                            <span style={{ color: batteryColor }}>{batteryLevel}%</span>
                        </div>
                    )}

                    {/* Signal strength */}
                    {guard.signalStrength && (
                        <div className="telemetry-item" title="Signal">
                            <Signal size={14} />
                            <span>{guard.signalStrength}</span>
                        </div>
                    )}

                    {/* Steps */}
                    {(guard.steps || guard.steps === 0) && (
                        <div className="telemetry-item" title={t.steps}>
                            <Footprints size={14} />
                            <span>{guard.steps}</span>
                        </div>
                    )}

                    {/* Time on duty */}
                    {showShiftInfo && getTimeOnDuty() && (
                        <div className="telemetry-item" title={t.onDuty}>
                            <Clock size={14} />
                            <span>{getTimeOnDuty()}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick action buttons */}
            <div className="guard-card-actions">
                <button 
                    className="action-btn action-ping"
                    onClick={(e) => { e.stopPropagation(); onPing && onPing(guard.guard_id); }}
                    title={t.ping}
                >
                    <Radio size={16} />
                    <span>{t.ping}</span>
                </button>

                <button 
                    className="action-btn action-photo"
                    onClick={(e) => { e.stopPropagation(); onRequestPhoto && onRequestPhoto(guard.guard_id); }}
                    title={t.photo}
                >
                    <Camera size={16} />
                    <span>{t.photo}</span>
                </button>

                <button 
                    className="action-btn action-chat"
                    onClick={(e) => { e.stopPropagation(); onChat && onChat(guard.guard_id); }}
                    title={t.chat}
                >
                    <MessageSquare size={16} />
                    <span>{t.chat}</span>
                </button>
            </div>
        </div>
    );
};

export default GuardCard;
