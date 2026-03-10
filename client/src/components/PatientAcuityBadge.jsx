import React from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { AlertTriangle, AlertCircle, User, Heart } from 'lucide-react';

/**
 * PatientAcuityBadge - Color-coded severity indicator for patient risk level
 * 
 * Used in Ward Whiteboard to quickly identify patient acuity:
 * - Level 1 (Critical): Immediate attention needed
 * - Level 2 (High): Close monitoring
 * - Level 3 (Moderate): Regular care
 * - Level 4 (Low): Stable
 */

const ACUITY_LEVELS = {
    1: { 
        label: 'Critical', 
        color: 'danger', 
        icon: AlertTriangle, 
        description: 'Immediate attention - Unstable vitals or critical condition',
        bgClass: 'bg-danger bg-opacity-10',
        borderClass: 'border-danger'
    },
    2: { 
        label: 'High', 
        color: 'warning', 
        icon: AlertCircle, 
        description: 'Close monitoring - Risk of deterioration',
        bgClass: 'bg-warning bg-opacity-10',
        borderClass: 'border-warning'
    },
    3: { 
        label: 'Moderate', 
        color: 'info', 
        icon: Heart, 
        description: 'Regular care - Stable with active treatment',
        bgClass: 'bg-info bg-opacity-10',
        borderClass: 'border-info'
    },
    4: { 
        label: 'Low', 
        color: 'success', 
        icon: User, 
        description: 'Stable - Routine observation only',
        bgClass: 'bg-success bg-opacity-10',
        borderClass: 'border-success'
    }
};

/**
 * Calculate acuity level based on patient data
 * @param {Object} patient - Patient object with vitals and clinical data
 * @returns {number} Acuity level (1-4)
 */
export const calculateAcuity = (patient) => {
    if (!patient) return 4;
    
    const latestVitals = patient.latest_vitals || patient.vitals;
    
    // Critical indicators (Level 1)
    if (patient.is_icu || patient.ward?.toLowerCase().includes('icu')) return 1;
    if (patient.diagnosis?.toLowerCase().includes('sepsis')) return 1;
    if (patient.diagnosis?.toLowerCase().includes('shock')) return 1;
    if (latestVitals) {
        const spo2 = parseFloat(latestVitals.spo2);
        const hr = parseFloat(latestVitals.heart_rate);
        const sbp = parseInt(latestVitals.bp?.split('/')[0]);
        
        if (spo2 < 90) return 1;
        if (hr > 130 || hr < 40) return 1;
        if (sbp < 80 || sbp > 200) return 1;
    }
    
    // High risk indicators (Level 2)
    if (patient.fall_risk === 'High') return 2;
    if (patient.isolation_required) return 2;
    if (patient.has_iv_lines > 2) return 2;
    if (latestVitals) {
        const spo2 = parseFloat(latestVitals.spo2);
        const temp = parseFloat(latestVitals.temp);
        
        if (spo2 < 94) return 2;
        if (temp > 39 || temp < 35) return 2;
    }
    
    // Moderate care (Level 3) - Active treatment, post-op, etc
    if (patient.post_operative) return 3;
    if (patient.diet === 'NPO') return 3;
    if (patient.has_iv_lines > 0) return 3;
    
    // Default: Low/Stable (Level 4)
    return 4;
};

const PatientAcuityBadge = ({ patient, level = null, size = 'md', showLabel = true }) => {
    // Use provided level or calculate from patient data
    const acuityLevel = level || calculateAcuity(patient);
    const config = ACUITY_LEVELS[acuityLevel] || ACUITY_LEVELS[4];
    const Icon = config.icon;
    
    const sizeClasses = {
        sm: { iconSize: 10, fontSize: '0.65rem', padding: 'px-1 py-0' },
        md: { iconSize: 12, fontSize: '0.75rem', padding: 'px-2 py-1' },
        lg: { iconSize: 16, fontSize: '0.85rem', padding: 'px-3 py-2' }
    };
    
    const { iconSize, fontSize, padding } = sizeClasses[size] || sizeClasses.md;
    
    return (
        <OverlayTrigger
            overlay={
                <Tooltip>
                    <strong>Acuity: {config.label}</strong>
                    <div className="small">{config.description}</div>
                </Tooltip>
            }
        >
            <Badge 
                bg={config.color} 
                className={`${padding} d-inline-flex align-items-center gap-1`}
                style={{ fontSize }}
            >
                <Icon size={iconSize} />
                {showLabel && <span>{config.label}</span>}
            </Badge>
        </OverlayTrigger>
    );
};

// Export styles for card backgrounds
export const getAcuityCardStyle = (acuityLevel) => {
    const config = ACUITY_LEVELS[acuityLevel] || ACUITY_LEVELS[4];
    return {
        className: `${config.bgClass} border-start border-4 ${config.borderClass}`,
        color: config.color
    };
};

export default PatientAcuityBadge;
