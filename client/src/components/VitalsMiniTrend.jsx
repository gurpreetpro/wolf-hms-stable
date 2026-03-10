import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * VitalsMiniTrend - Displays current vital value with trend indicator
 * Used in Doctor Dashboard for quick vitals overview
 */
const VitalsMiniTrend = ({ label, current, previous, unit = '', danger = false, warning = false }) => {
    // Calculate trend direction
    let TrendIcon = Minus;
    let trendColor = 'text-secondary';

    if (current && previous) {
        const diff = parseFloat(current) - parseFloat(previous);
        if (diff > 0) {
            TrendIcon = TrendingUp;
            trendColor = danger ? 'text-danger' : 'text-success';
        } else if (diff < 0) {
            TrendIcon = TrendingDown;
            trendColor = danger ? 'text-success' : 'text-warning';
        }
    }

    // Determine value color based on thresholds
    let valueClass = '';
    if (danger) valueClass = 'text-danger fw-bold';
    else if (warning) valueClass = 'text-warning fw-bold';

    return (
        <div className="text-center">
            <div className="text-muted small mb-1">{label}</div>
            <div className="d-flex align-items-center justify-content-center gap-1">
                <span className={`fs-5 ${valueClass}`}>
                    {current || 'N/A'}
                    {unit && <small className="text-muted">{unit}</small>}
                </span>
                {previous && (
                    <TrendIcon size={14} className={trendColor} />
                )}
            </div>
            {previous && (
                <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                    prev: {previous}{unit}
                </div>
            )}
        </div>
    );
};

export default VitalsMiniTrend;
