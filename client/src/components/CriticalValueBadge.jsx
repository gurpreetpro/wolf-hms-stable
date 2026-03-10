import React from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { AlertTriangle, AlertCircle } from 'lucide-react';

/**
 * CriticalValueBadge - Shows a flashing badge for critical lab values
 * 
 * @param {boolean} hasCritical - Whether the result has critical values
 * @param {array} criticalFindings - Array of critical value details
 * @param {string} size - 'sm', 'md', or 'lg'
 */
const CriticalValueBadge = ({ hasCritical, criticalFindings = [], size = 'md' }) => {
    if (!hasCritical) return null;

    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

    const tooltipContent = criticalFindings.length > 0 ? (
        <div className="text-start">
            <strong>⚠️ Critical Values:</strong>
            <ul className="mb-0 ps-3 mt-1">
                {criticalFindings.map((f, i) => (
                    <li key={i}>
                        {f.parameter}: {f.value} {f.unit} ({f.status})
                    </li>
                ))}
            </ul>
        </div>
    ) : 'Critical value detected!';

    return (
        <OverlayTrigger
            placement="top"
            overlay={<Tooltip>{tooltipContent}</Tooltip>}
        >
            <Badge
                bg="danger"
                className="critical-badge d-inline-flex align-items-center gap-1"
                style={{
                    animation: 'pulse 1.5s infinite',
                    cursor: 'pointer'
                }}
            >
                <AlertTriangle size={iconSize} />
                {size !== 'sm' && <span>CRITICAL</span>}
            </Badge>
        </OverlayTrigger>
    );
};

/**
 * ResultFlagBadge - Shows colored badge for result status (high/low/normal)
 * 
 * @param {string} flag - 'normal', 'high', 'low', 'critical_high', 'critical_low'
 */
const ResultFlagBadge = ({ flag }) => {
    const config = {
        normal: { bg: 'success', text: 'Normal', icon: null },
        high: { bg: 'warning', text: '↑ High', icon: null },
        low: { bg: 'info', text: '↓ Low', icon: null },
        critical_high: { bg: 'danger', text: '↑↑ Critical', icon: <AlertCircle size={12} /> },
        critical_low: { bg: 'danger', text: '↓↓ Critical', icon: <AlertCircle size={12} /> },
        text: { bg: 'secondary', text: 'Text', icon: null },
        unknown: { bg: 'light', text: '-', icon: null }
    };

    const { bg, text, icon } = config[flag] || config.unknown;

    return (
        <Badge bg={bg} className="d-inline-flex align-items-center gap-1">
            {icon}
            <span>{text}</span>
        </Badge>
    );
};

// CSS Keyframes for pulse animation (add to your CSS file)
const pulseStyle = `
@keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
}

.critical-badge {
    animation: pulse 1.5s infinite;
}
`;

// Inject style if not exists
if (typeof document !== 'undefined' && !document.getElementById('critical-badge-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'critical-badge-style';
    styleEl.textContent = pulseStyle;
    document.head.appendChild(styleEl);
}

export { CriticalValueBadge, ResultFlagBadge };
export default CriticalValueBadge;
