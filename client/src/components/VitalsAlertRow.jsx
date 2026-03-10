import React from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { AlertTriangle, CheckCircle, AlertCircle, ThermometerSun, Heart, Activity, Droplets } from 'lucide-react';

/**
 * VitalsAlertBadges - Color-coded vital sign indicators
 * Gold Standard Phase 3 - Enhanced Vitals Alerts
 * 
 * Normal Ranges:
 * - BP Systolic: 90-140 mmHg
 * - BP Diastolic: 60-90 mmHg
 * - Pulse: 60-100 bpm
 * - SpO2: 95-100%
 * - Temperature: 97.0-99.5°F (36.1-37.5°C)
 * - Respiratory Rate: 12-20/min
 */

// Thresholds configuration
const VITALS_THRESHOLDS = {
    bp_systolic: {
        critical_low: 80,
        low: 90,
        normal_high: 140,
        high: 160,
        critical_high: 180
    },
    bp_diastolic: {
        critical_low: 50,
        low: 60,
        normal_high: 90,
        high: 100,
        critical_high: 110
    },
    pulse: {
        critical_low: 40,
        low: 50,
        normal_high: 100,
        high: 120,
        critical_high: 150
    },
    spo2: {
        critical_low: 88,
        low: 92,
        normal_low: 95
    },
    temp: {
        critical_low: 95.0,
        low: 97.0,
        normal_high: 99.5,
        high: 100.4,
        critical_high: 103.0
    }
};

/**
 * Get alert level for a specific vital
 */
export const getVitalAlert = (type, value) => {
    if (!value && value !== 0) return { level: 'unknown', color: 'secondary' };
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return { level: 'unknown', color: 'secondary' };

    const thresholds = VITALS_THRESHOLDS[type];
    if (!thresholds) return { level: 'normal', color: 'success' };

    // SpO2 special case (only low matters)
    if (type === 'spo2') {
        if (numValue < thresholds.critical_low) return { level: 'critical', color: 'danger', pulse: true };
        if (numValue < thresholds.low) return { level: 'warning', color: 'warning' };
        if (numValue < thresholds.normal_low) return { level: 'caution', color: 'info' };
        return { level: 'normal', color: 'success' };
    }

    // Standard range checking
    if (numValue < thresholds.critical_low) return { level: 'critical', color: 'danger', pulse: true };
    if (numValue < thresholds.low) return { level: 'low', color: 'warning' };
    if (numValue > thresholds.critical_high) return { level: 'critical', color: 'danger', pulse: true };
    if (numValue > thresholds.high) return { level: 'high', color: 'warning' };
    if (numValue > thresholds.normal_high) return { level: 'elevated', color: 'info' };
    
    return { level: 'normal', color: 'success' };
};

/**
 * Parse BP string and get alerts for both systolic and diastolic
 */
export const getBPAlert = (bp) => {
    if (!bp || !bp.includes('/')) return { systolic: getVitalAlert('bp_systolic', null), diastolic: getVitalAlert('bp_diastolic', null) };
    
    const [sys, dia] = bp.split('/').map(v => parseInt(v.trim()));
    return {
        systolic: getVitalAlert('bp_systolic', sys),
        diastolic: getVitalAlert('bp_diastolic', dia),
        combined: getVitalAlert('bp_systolic', sys).level === 'critical' || getVitalAlert('bp_diastolic', dia).level === 'critical' 
            ? 'danger' 
            : getVitalAlert('bp_systolic', sys).color === 'warning' || getVitalAlert('bp_diastolic', dia).color === 'warning'
            ? 'warning'
            : 'success'
    };
};

/**
 * Single Vital Badge with alert coloring
 */
const VitalBadge = ({ label, value, unit, type, icon: Icon }) => {
    const alert = getVitalAlert(type, value);
    
    return (
        <OverlayTrigger
            placement="top"
            overlay={
                <Tooltip>
                    {label}: {value}{unit}<br/>
                    Status: {alert.level.charAt(0).toUpperCase() + alert.level.slice(1)}
                </Tooltip>
            }
        >
            <Badge 
                bg={alert.color} 
                className={`d-inline-flex align-items-center gap-1 ${alert.pulse ? 'animate-pulse' : ''}`}
                style={{ cursor: 'help' }}
            >
                {Icon && <Icon size={12} />}
                {value}{unit}
            </Badge>
        </OverlayTrigger>
    );
};

/**
 * BP Badge with combined systolic/diastolic alert
 */
const BPBadge = ({ bp }) => {
    const { combined } = getBPAlert(bp);
    
    return (
        <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Blood Pressure: {bp} mmHg</Tooltip>}
        >
            <Badge 
                bg={combined} 
                className="d-inline-flex align-items-center gap-1"
                style={{ cursor: 'help' }}
            >
                <Activity size={12} />
                {bp}
            </Badge>
        </OverlayTrigger>
    );
};

/**
 * Complete Vitals Alert Row - Shows all vitals with color coding
 */
const VitalsAlertRow = ({ vitals }) => {
    if (!vitals) return null;

    return (
        <div className="d-flex flex-wrap gap-2">
            <BPBadge bp={vitals.bp} />
            <VitalBadge 
                label="Pulse" 
                value={vitals.heart_rate || vitals.pulse} 
                unit=" bpm" 
                type="pulse"
                icon={Heart}
            />
            <VitalBadge 
                label="SpO2" 
                value={vitals.spo2} 
                unit="%" 
                type="spo2"
                icon={Droplets}
            />
            <VitalBadge 
                label="Temp" 
                value={vitals.temp} 
                unit="°F" 
                type="temp"
                icon={ThermometerSun}
            />
        </div>
    );
};

/**
 * Check if any vitals are critical
 */
export const hasCriticalVitals = (vitals) => {
    if (!vitals) return false;
    
    const bpAlert = getBPAlert(vitals.bp);
    const pulseAlert = getVitalAlert('pulse', vitals.heart_rate || vitals.pulse);
    const spo2Alert = getVitalAlert('spo2', vitals.spo2);
    const tempAlert = getVitalAlert('temp', vitals.temp);

    return [bpAlert.systolic, bpAlert.diastolic, pulseAlert, spo2Alert, tempAlert]
        .some(alert => alert.level === 'critical');
};

export { VitalBadge, BPBadge };
export default VitalsAlertRow;
